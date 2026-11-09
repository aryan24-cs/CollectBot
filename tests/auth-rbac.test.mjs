import { test, describe } from "node:test"
import assert from "node:assert/strict"

// Determine destination dashboard based on workspace role
function determineRoleDashboard(role) {
  switch (role) {
    case "FINANCE":
      return "/dashboard/finance"
    case "SALES":
      return "/dashboard/sales"
    case "MARKETING":
      return "/dashboard/marketing"
    case "OWNER":
    default:
      return "/dashboard"
  }
}

// Super Admin Authorization Simulator
function checkSuperAdminAccess(user, adminUsersTable = [], superAdminEmail = "aryan.nda.2163@gmail.com") {
  if (!user || !user.id || !user.email) {
    return { authorized: false, status: 401, error: "Unauthorized: Super Admin session required" }
  }

  // 1. Direct table check by user_id
  const matchById = adminUsersTable.find((a) => a.user_id === user.id && a.is_active)
  if (matchById) {
    return { authorized: true, status: 200, admin: matchById }
  }

  // 2. Direct table check by email
  const matchByEmail = adminUsersTable.find((a) => a.email.toLowerCase() === user.email.toLowerCase() && a.is_active)
  if (matchByEmail) {
    return { authorized: true, status: 200, admin: matchByEmail }
  }

  // 3. Platform Root Super Admin
  if (user.email.toLowerCase().trim() === superAdminEmail.toLowerCase().trim()) {
    return {
      authorized: true,
      status: 200,
      admin: {
        id: user.id,
        user_id: user.id,
        email: user.email,
        role: "super_admin",
        is_active: true,
      },
    }
  }

  return { authorized: false, status: 403, error: "Forbidden: Super Admin privileges required" }
}

// Approval Authorization Gate
function canApproveFinancialRequest(role) {
  return role === "OWNER" || role === "FINANCE"
}

describe("CollectBot RBAC, Multi-Workplace & Auth Policy Tests", () => {
  test("Routes each employee role to their dedicated department workspace", () => {
    assert.equal(determineRoleDashboard("OWNER"), "/dashboard")
    assert.equal(determineRoleDashboard("FINANCE"), "/dashboard/finance")
    assert.equal(determineRoleDashboard("SALES"), "/dashboard/sales")
    assert.equal(determineRoleDashboard("MARKETING"), "/dashboard/marketing")
    assert.equal(determineRoleDashboard("UNKNOWN"), "/dashboard")
  })

  test("Strictly denies unauthenticated users from Super Admin APIs", () => {
    const resNull = checkSuperAdminAccess(null)
    assert.equal(resNull.authorized, false)
    assert.equal(resNull.status, 401)

    const resEmpty = checkSuperAdminAccess({})
    assert.equal(resEmpty.authorized, false)
    assert.equal(resEmpty.status, 401)
  })

  test("Strictly denies standard business owners or employees from Super Admin APIs", () => {
    const regularOwner = { id: "user-123", email: "owner@clientcompany.com" }
    const adminTable = []

    const res = checkSuperAdminAccess(regularOwner, adminTable)
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("Grants Super Admin access to designated platform root email", () => {
    const rootUser = { id: "user-root", email: "aryan.nda.2163@gmail.com" }
    const res = checkSuperAdminAccess(rootUser, [])

    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
    assert.equal(res.admin.role, "super_admin")
  })

  test("Grants access to active delegated admin in admin_users table", () => {
    const delegatedAdmin = { id: "admin-auth-id", email: "support@collectbot.in" }
    const adminTable = [
      {
        id: "rec-1",
        user_id: "admin-auth-id",
        email: "support@collectbot.in",
        role: "admin",
        is_active: true,
      },
    ]

    const res = checkSuperAdminAccess(delegatedAdmin, adminTable)
    assert.equal(res.authorized, true)
    assert.equal(res.status, 200)
    assert.equal(res.admin.role, "admin")
  })

  test("Denies inactive delegated admins in admin_users table", () => {
    const suspendedAdmin = { id: "suspended-id", email: "ex-staff@collectbot.in" }
    const adminTable = [
      {
        id: "rec-2",
        user_id: "suspended-id",
        email: "ex-staff@collectbot.in",
        role: "admin",
        is_active: false, // Suspended
      },
    ]

    const res = checkSuperAdminAccess(suspendedAdmin, adminTable)
    assert.equal(res.authorized, false)
    assert.equal(res.status, 403)
  })

  test("Enforces financial approval authorization only for OWNER and FINANCE", () => {
    assert.equal(canApproveFinancialRequest("OWNER"), true)
    assert.equal(canApproveFinancialRequest("FINANCE"), true)
    assert.equal(canApproveFinancialRequest("SALES"), false)
    assert.equal(canApproveFinancialRequest("MARKETING"), false)
    assert.equal(canApproveFinancialRequest("GUEST"), false)
  })
})

