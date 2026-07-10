import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

// ─────────────────────────────────────────────────────────
// Business Features Interface
// ─────────────────────────────────────────────────────────
export interface BusinessFeatures {
  plan: string
  is_full_access: boolean
  is_blocked: boolean
  max_invoices: number
  max_clients: number
  max_team_members: number
  whatsapp: boolean
  email: boolean
  sms: boolean
  payment_links: boolean
  recurring: boolean
  pdf_invoice: boolean
  custom_branding: boolean
  remove_watermark: boolean
  reminder_auto: boolean
  reminder_custom: boolean
  analytics_basic: boolean
  analytics_advanced: boolean
  bulk_invoice: boolean
  csv_import: boolean
  api_access: boolean
  white_label: boolean
  team_access: boolean
  client_portal: boolean
  tally_export: boolean
  priority_support: boolean
  dedicated_manager: boolean
}

// ─────────────────────────────────────────────────────────
// In-memory cache (per-server instance)
// ─────────────────────────────────────────────────────────
const featuresCache = new Map<string, { data: BusinessFeatures; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ─────────────────────────────────────────────────────────
// Default free plan features (fail-safe fallback)
// ─────────────────────────────────────────────────────────
export function getDefaultFreeFeatures(): BusinessFeatures {
  return {
    plan: "free",
    is_full_access: false,
    is_blocked: false,
    max_invoices: 5,
    max_clients: 1,
    max_team_members: 1,
    whatsapp: false,
    email: true,
    sms: false,
    payment_links: false,
    recurring: false,
    pdf_invoice: true,
    custom_branding: false,
    remove_watermark: false,
    reminder_auto: false,
    reminder_custom: false,
    analytics_basic: true,
    analytics_advanced: false,
    bulk_invoice: false,
    csv_import: false,
    api_access: false,
    white_label: false,
    team_access: false,
    client_portal: false,
    tally_export: false,
    priority_support: false,
    dedicated_manager: false,
  }
}

// ─────────────────────────────────────────────────────────
// Core: Get features from Supabase RPC
// ─────────────────────────────────────────────────────────
export async function getBusinessFeatures(
  businessId: string
): Promise<BusinessFeatures> {
  const supabase = getSupabaseServiceRoleClient()

  const { data, error } = await supabase.rpc("get_business_features", {
    p_business_id: businessId,
  })

  if (error) {
    console.error("Feature check failed:", error)
    return getDefaultFreeFeatures()
  }

  return data as BusinessFeatures
}

// ─────────────────────────────────────────────────────────
// Cached version (5-minute TTL per business)
// ─────────────────────────────────────────────────────────
export async function getBusinessFeaturesCache(
  businessId: string
): Promise<BusinessFeatures> {
  const cacheKey = `features:${businessId}`

  const cached = featuresCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const features = await getBusinessFeatures(businessId)

  featuresCache.set(cacheKey, {
    data: features,
    timestamp: Date.now(),
  })

  return features
}

// ─────────────────────────────────────────────────────────
// Helper: Check single feature
// ─────────────────────────────────────────────────────────
export async function canUseFeature(
  businessId: string,
  feature: keyof BusinessFeatures
): Promise<boolean> {
  const features = await getBusinessFeaturesCache(businessId)
  if (features.is_blocked) return false
  return Boolean(features[feature])
}

// ─────────────────────────────────────────────────────────
// Helper: Check limit
// ─────────────────────────────────────────────────────────
export async function isWithinLimit(
  businessId: string,
  limitType: "invoices" | "clients" | "team_members",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const features = await getBusinessFeaturesCache(businessId)

  const limitKey = `max_${limitType}` as keyof BusinessFeatures
  const limit = features[limitKey] as number

  if (limit === -1) {
    return { allowed: true, limit: -1, current: currentCount }
  }

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  }
}

// ─────────────────────────────────────────────────────────
// Cache invalidation (export for admin override routes)
// ─────────────────────────────────────────────────────────
export function invalidateBusinessFeaturesCache(businessId: string): void {
  const cacheKey = `features:${businessId}`
  featuresCache.delete(cacheKey)
}

export function invalidateAllFeaturesCache(): void {
  featuresCache.clear()
}
