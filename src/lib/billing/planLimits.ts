import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export interface PlanLimitResult {
  allowed: boolean
  limit: number
  current: number
  message?: string
}

export async function checkPlanLimit(
  businessId: string,
  action: "create_invoice" | "add_client" | "send_whatsapp" | "add_team_member"
): Promise<PlanLimitResult> {
  const supabase = getSupabaseServiceRoleClient()

  // 1. Fetch active subscription plan
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("business_id", businessId)
    .maybeSingle()

  const plan = subscription?.plan || "free"
  const isExpired = subscription?.status === "expired"

  if (isExpired) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      message: "Your subscription has expired. Please update your billing details to resume.",
    }
  }

  // Define limits structure
  const limits = {
    free: { invoices: 5, clients: 1, whatsapp: false, teamMembers: 0 },
    solo: { invoices: 30, clients: Infinity, whatsapp: true, teamMembers: 0 },
    business: { invoices: Infinity, clients: Infinity, whatsapp: true, teamMembers: 3 },
    scale: { invoices: Infinity, clients: Infinity, whatsapp: true, teamMembers: 5 },
  }

  const currentLimits = limits[plan as keyof typeof limits] || limits.free

  if (action === "create_invoice") {
    // Count invoices created this calendar month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", startOfMonth.toISOString())

    if (error) throw error
    const invoiceCount = count || 0

    if (invoiceCount >= currentLimits.invoices) {
      return {
        allowed: false,
        limit: currentLimits.invoices,
        current: invoiceCount,
        message: `You've reached your monthly invoice limit of ${currentLimits.invoices} under the ${plan.toUpperCase()} plan. Upgrade to unlock more invoices.`,
      };
    }

    return {
      allowed: true,
      limit: currentLimits.invoices,
      current: invoiceCount,
    }
  }

  if (action === "add_client") {
    // Count total clients for this business
    const { count, error } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)

    if (error) throw error
    const clientCount = count || 0

    if (clientCount >= currentLimits.clients) {
      return {
        allowed: false,
        limit: currentLimits.clients,
        current: clientCount,
        message: `You've reached your client limit of ${currentLimits.clients} under the ${plan.toUpperCase()} plan. Upgrade to add more clients.`,
      };
    }

    return {
      allowed: true,
      limit: currentLimits.clients,
      current: clientCount,
    }
  }

  if (action === "send_whatsapp") {
    if (!currentLimits.whatsapp) {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        message: `WhatsApp reminder alerts are not supported on the ${plan.toUpperCase()} plan. Please upgrade to Solo or Business plan to enable WhatsApp notifications.`,
      }
    }
    return {
      allowed: true,
      limit: 1,
      current: 1,
    }
  }

  if (action === "add_team_member") {
    // Count team members currently in business
    const { count, error } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)

    if (error) throw error
    const teamCount = count || 0

    if (teamCount >= currentLimits.teamMembers) {
      return {
        allowed: false,
        limit: currentLimits.teamMembers,
        current: teamCount,
        message: `You've reached your team members limit of ${currentLimits.teamMembers} seats under the ${plan.toUpperCase()} plan. Upgrade to invite more users.`,
      };
    }

    return {
      allowed: true,
      limit: currentLimits.teamMembers,
      current: teamCount,
    }
  }

  return {
    allowed: false,
    limit: 0,
    current: 0,
    message: "Unknown plan limit check request.",
  }
}
