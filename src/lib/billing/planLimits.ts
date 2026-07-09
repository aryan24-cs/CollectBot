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
  // Pricing model restrictions are disabled. Return true for all checks.
  return {
    allowed: true,
    limit: Infinity,
    current: 0,
  }
}
