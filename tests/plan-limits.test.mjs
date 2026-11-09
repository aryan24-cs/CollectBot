import { test, describe } from "node:test"
import assert from "node:assert/strict"

const PLAN_ALIASES = {
  solo: "starter",
  business: "pro",
  scale: "enterprise",
  free: "free",
  starter: "starter",
  pro: "pro",
  enterprise: "enterprise",
}

const SAAS_PLANS = {
  free: { maxInvoicesPerMonth: 5, maxClients: 3, maxTeamMembers: 1 },
  starter: { maxInvoicesPerMonth: 50, maxClients: 25, maxTeamMembers: 3 },
  pro: { maxInvoicesPerMonth: 500, maxClients: 200, maxTeamMembers: 10 },
  enterprise: { maxInvoicesPerMonth: Infinity, maxClients: Infinity, maxTeamMembers: Infinity },
}

function resolvePlan(inputName) {
  const normalized = (inputName || "").toLowerCase().trim()
  return PLAN_ALIASES[normalized] || null
}

function checkLimit(planName, currentUsage, metric) {
  const planKey = resolvePlan(planName)
  if (!planKey || !SAAS_PLANS[planKey]) {
    return { allowed: false, error: "Invalid plan" }
  }

  const plan = SAAS_PLANS[planKey]
  let limit = Infinity

  if (metric === "invoices") limit = plan.maxInvoicesPerMonth
  if (metric === "clients") limit = plan.maxClients
  if (metric === "team_members") limit = plan.maxTeamMembers

  const allowed = currentUsage < limit
  return {
    allowed,
    limit,
    currentUsage,
    plan: planKey,
  }
}

describe("CollectBot SaaS Plan & Limit Enforcement Tests", () => {
  test("Resolves commercial legacy plan aliases to standard schema plans", () => {
    assert.equal(resolvePlan("solo"), "starter")
    assert.equal(resolvePlan("business"), "pro")
    assert.equal(resolvePlan("scale"), "enterprise")
    assert.equal(resolvePlan("pro"), "pro")
    assert.equal(resolvePlan("starter"), "starter")
    assert.equal(resolvePlan("free"), "free")
    assert.equal(resolvePlan("invalid_plan"), null)
  })

  test("Enforces invoice creation limit on Free tier", () => {
    const underLimit = checkLimit("free", 4, "invoices")
    assert.equal(underLimit.allowed, true)

    const atLimit = checkLimit("free", 5, "invoices")
    assert.equal(atLimit.allowed, false)

    const overLimit = checkLimit("free", 6, "invoices")
    assert.equal(overLimit.allowed, false)
  })

  test("Enforces team member limit on Starter tier", () => {
    const check1 = checkLimit("starter", 2, "team_members")
    assert.equal(check1.allowed, true)

    const check2 = checkLimit("solo", 3, "team_members") // Alias 'solo'
    assert.equal(check2.allowed, false)
  })

  test("Permits unlimited volume on Enterprise plan", () => {
    const check = checkLimit("enterprise", 100000, "invoices")
    assert.equal(check.allowed, true)
    assert.equal(check.limit, Infinity)
  })
})

