import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(request: NextRequest) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const supabase = getSupabaseServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""
    const plan = searchParams.get("plan") || ""
    const sortBy = searchParams.get("sort") || "newest"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from("businesses")
      .select(
        `id, name, email, phone, city, state, created_at, updated_at,
         subscriptions(plan_name, status, trial_ends_at, current_period_end)`,
        { count: "exact" }
      )

    // Search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        query = query.order("created_at", { ascending: true })
        break
      case "name":
        query = query.order("name", { ascending: true })
        break
      default:
        query = query.order("created_at", { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: businesses, error: queryError, count } = await query

    if (queryError) throw queryError

    // Enrich with invoice/payment counts
    const enriched = await Promise.all(
      (businesses || []).map(async (biz: any) => {
        const [invoiceRes, paymentRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id", { count: "exact" })
            .eq("business_id", biz.id),
          supabase
            .from("payments")
            .select("amount")
            .eq("business_id", biz.id)
            .in("status", ["captured", "paid"]),
        ])

        const totalRevenue = (paymentRes.data || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 0),
          0
        )

        return {
          ...biz,
          subscription: biz.subscriptions?.[0] || null,
          invoiceCount: invoiceRes.count || 0,
          totalRevenue,
        }
      })
    )

    // Filter by plan after enrichment (subscription is a join)
    let filtered = enriched
    if (plan && plan !== "all") {
      filtered = enriched.filter(
        (b) => b.subscription?.plan_name === plan
      )
    }

    return NextResponse.json({
      businesses: filtered,
      total: count || 0,
      page,
      limit,
    })
  } catch (err: any) {
    console.error("Admin businesses list error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to load businesses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const { name, email, phone, password, plan } = body

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: "Name, email, phone, and password are required" }, { status: 400 })
    }

    const supabase = getSupabaseServiceRoleClient()

    // 1. Create auth user
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (createUserError || !userData.user) {
      throw new Error(createUserError?.message || "Failed to create user account")
    }

    // 2. Create business profile
    const { data: business, error: createBizError } = await supabase
      .from("businesses")
      .insert({
        user_id: userData.user.id,
        name,
        email,
        phone,
      })
      .select()
      .single()

    if (createBizError) {
      // Cleanup created auth user if business creation fails
      await supabase.auth.admin.deleteUser(userData.user.id)
      throw createBizError
    }

    // 3. Assign subscription plan if not default free
    if (plan && plan !== "free") {
      const { data: planRecord } = await supabase
        .from("plans")
        .select("id")
        .eq("name", plan)
        .single()

      if (planRecord) {
        await supabase
          .from("subscriptions")
          .update({
            plan_name: plan,
            plan_id: planRecord.id,
            plan: plan,
          })
          .eq("business_id", business.id)
      }
    }

    await logAdminAction({
      adminId: admin!.id,
      action: "create_business",
      targetType: "business",
      targetId: business.id,
      description: `Permanently created new business "${name}" for owner "${email}"`,
    })

    return NextResponse.json({ success: true, business }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create business" },
      { status: 500 }
    )
  }
}
