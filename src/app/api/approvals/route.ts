import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = await getSupabaseServerClient()
    const { data: requests, error: queryError } = await supabase
      .from("approval_requests")
      .select("*, requester:employees(id, name), approval_steps(*)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })

    if (queryError) throw queryError

    // Enrich with target object details
    const enriched = await Promise.all(
      (requests || []).map(async (req: any) => {
        let targetDetails = null
        if (req.type === "expense") {
          const { data } = await supabase
            .from("expenses")
            .select("*")
            .eq("id", req.target_id)
            .maybeSingle()
          targetDetails = data
        }
        return { ...req, targetDetails }
      })
    )

    return NextResponse.json(enriched)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load approvals" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { approval_request_id, action, comment } = body

    if (!approval_request_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Fetch approval request
    const { data: appReq, error: fetchErr } = await adminDb
      .from("approval_requests")
      .select("*, approval_steps(*)")
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

    // 2. Update step details
    const activeStep = appReq.approval_steps?.find((s: any) => s.status === "pending")
    if (activeStep) {
      await adminDb
        .from("approval_steps")
        .update({
          status: statusValue,
          comment: comment || null,
          approver_id: employee?.id || null, // null if approved by owner
          decided_at: new Date().toISOString()
        })
        .eq("id", activeStep.id)
    }

    // 3. Update overall request status
    await adminDb
      .from("approval_requests")
      .update({
        status: statusValue,
        updated_at: new Date().toISOString()
      })
      .eq("id", approval_request_id)

    // 4. Update target object status
    if (appReq.type === "expense") {
      await adminDb
        .from("expenses")
        .update({
          status: statusValue,
          approved_by: employee?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", appReq.target_id)
    }

    // 5. Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "approval_decision",
      description: `Approval request for ${appReq.type} was ${statusValue}.`,
      metadata: { approval_request_id, decision: statusValue }
    })

    return NextResponse.json({ success: true, status: statusValue })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process approval" }, { status: 500 })
  }
}
