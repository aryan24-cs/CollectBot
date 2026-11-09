import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = getSupabaseServiceRoleClient()

    let { data: requests, error: queryError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })

    if (queryError) throw queryError

    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", business.id)

    const empMap = new Map((employees || []).map((e) => [e.id, e]))
    requests = (requests || []).map((req) => ({
      ...req,
      requester: req.requester_id ? empMap.get(req.requester_id) || null : null,
      type: req.entity_type || req.type || "expense",
      target_id: req.entity_id || req.target_id,
    }))

    // Enrich with target object details
    const enriched = await Promise.all(
      (requests || []).map(async (req: any) => {
        let targetDetails = null
        const targetType = req.entity_type || req.type
        const targetId = req.entity_id || req.target_id

        if (targetType === "expense" && targetId) {
          const { data } = await supabase
            .from("expenses")
            .select("*")
            .eq("id", targetId)
            .maybeSingle()
          targetDetails = data
        }
        return { ...req, targetDetails }
      })
    )

    return NextResponse.json(enriched || [])
  } catch (err: any) {
    console.error("GET /api/approvals error:", err)
    return NextResponse.json({ error: err.message || "Failed to load approvals" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER or FINANCE members can authorize approvals
  if (role !== "OWNER" && role !== "FINANCE") {
    return NextResponse.json(
      { error: "Forbidden: Only workspace owners and finance members can approve or reject requests." },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { approval_request_id, action, comment } = body

    if (!approval_request_id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Missing or invalid required fields (approval_request_id, action)" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Fetch approval request
    const { data: appReq, error: fetchErr } = await adminDb
      .from("approval_requests")
      .select("*")
      .eq("id", approval_request_id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (fetchErr || !appReq) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
    }

    if (appReq.status !== "pending") {
      return NextResponse.json({ error: "This request has already been processed" }, { status: 400 })
    }

    const statusValue = action === "approve" ? "approved" : "rejected"
    const targetType = appReq.entity_type || appReq.type || "expense"
    const targetId = appReq.entity_id || appReq.target_id

    // 2. Update overall request status
    await adminDb
      .from("approval_requests")
      .update({
        status: statusValue,
        approver_id: employee?.id || null,
        notes: comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", approval_request_id)

    // 3. Update target object status
    if (targetType === "expense" && targetId) {
      await adminDb
        .from("expenses")
        .update({
          status: statusValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetId)
    }

    // 4. Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "approval_decision",
      description: `Approval request for ${targetType} was ${statusValue}.`,
      metadata: { approval_request_id, decision: statusValue, approver: employee?.name || "Owner" },
    })

    return NextResponse.json({ success: true, status: statusValue })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process approval" }, { status: 500 })
  }
}
