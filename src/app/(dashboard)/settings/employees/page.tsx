"use client"

import * as React from "react"
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldAlert, 
  Check, 
  Trash2, 
  UserMinus, 
  CheckCircle,
  Building,
  Key,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  Phone
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface Employee {
  id: string
  name: string
  email: string
  phone: string | null
  status: "pending" | "active" | "suspended"
  employee_id_code: string | null
  department_id: string | null
  custom_role_id: string | null
  branch_id: string | null
  activity_score: number
  joined_at: string | null
  department?: { id: string; name: string } | null
  custom_role?: { id: string; name: string } | null
  branch?: { id: string; name: string } | null
  employee_type?: "OWNER" | "FINANCE" | "SALES" | "MARKETING"
  designation?: string | null
  notes?: string | null
  profile_picture_url?: string | null
  created_at?: string
  last_login?: string | null
}

interface Department {
  id: string
  name: string
}

interface CustomRole {
  id: string
  name: string
}

interface Branch {
  id: string
  name: string
}

const PERMISSION_CATEGORIES = [
  { id: "invoices", label: "Invoices" },
  { id: "clients", label: "Clients" },
  { id: "payments", label: "Payments" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "employees", label: "Employees" },
  { id: "settings", label: "Settings" },
  { id: "approvals", label: "Approvals" },
  { id: "expenses", label: "Expenses" },
  { id: "branches", label: "Branches" }
]

const PERMISSION_ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "approve", label: "Approve" },
  { id: "export", label: "Export" }
]

export default function EmployeesSettingsPage() {
  // Data States
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [customRoles, setCustomRoles] = React.useState<CustomRole[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])

  // UI States
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Password reset state
  const [resettingEmployee, setResettingEmployee] = React.useState<Employee | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [viewingProfileEmployee, setViewingProfileEmployee] = React.useState<Employee | null>(null)

  // Invite/Create Dialog State
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteForm, setInviteForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    employee_type: "FINANCE",
    notes: "",
    status: "active",
    profile_picture_url: ""
  })

  // Permission Drawer State
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
  const [selectedPermissions, setSelectedPermissions] = React.useState<{category: string; action: string}[]>([])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/employees")
      if (!res.ok) throw new Error("Failed to load workspace directory.")
      const data = await res.json()
      setEmployees(data.employees || [])
      setDepartments(data.departments || [])
      setCustomRoles(data.customRoles || [])
      setBranches(data.branches || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve employee data.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.name || !inviteForm.email) {
      toast.error("Please fill in Name and Email address.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to register employee.")

      toast.success(`Employee "${inviteForm.name}" registered successfully!`)
      setIsInviteOpen(false)
      setInviteForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        employee_type: "FINANCE",
        notes: "",
        status: "active",
        profile_picture_url: ""
      })
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Could not create teammate.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingEmployee || newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${resettingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword.trim() })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reset password.")

      toast.success(`Password for ${resettingEmployee.name} reset successfully!`)
      setResettingEmployee(null)
      setNewPassword("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusToggle = async (emp: Employee) => {
    const nextStatus = emp.status === "suspended" ? "active" : "suspended"
    const label = nextStatus === "suspended" ? "Suspend" : "Re-activate"

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      })

      if (!res.ok) throw new Error("Could not update employee status.")
      toast.success(`Successfully updated status for ${emp.name} to ${nextStatus}.`)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete employee "${emp.name}"? This deletes their credentials and all access context.`)) {
      return
    }

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete employee record.")
      toast.success(`Employee "${emp.name}" permanently removed.`)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleOpenPermissions = async (emp: Employee) => {
    setEditingEmployee(emp)
    // Fetch overrides
    try {
      const res = await fetch(`/api/settings/business`)
      if (res.ok) {
        const data = await res.json()
        // If employee permissions are returned, prefill
        const initialPerms = (data.permissions || []).map((pStr: string) => {
          const [category, action] = pStr.split(":")
          return { category, action }
        })
        setSelectedPermissions(initialPerms)
      }
    } catch (_) {}
  }

  const togglePermission = (category: string, action: string) => {
    const exists = selectedPermissions.some(p => p.category === category && p.action === action)
    if (exists) {
      setSelectedPermissions(prev => prev.filter(p => !(p.category === category && p.action === action)))
    } else {
      setSelectedPermissions(prev => [...prev, { category, action }])
    }
  }

  const handleSavePermissions = async () => {
    if (!editingEmployee) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions })
      })

      if (!res.ok) throw new Error("Failed to save custom overrides.")
      toast.success(`Custom permissions updated for ${editingEmployee.name}`)
      setEditingEmployee(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Employee Directory</h1>
          <p className="text-ink-secondary text-sm mt-1">Manage team registrations, departments, roles, and modular permission overrides.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Invite Employee
        </button>
      </div>

      {/* Directory Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: search and list */}
        <div className="lg:col-span-12 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary/50" />
            <input
              placeholder="Search active team members by name or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-white rounded-pill border border-[#EEE9E4] pl-11 pr-6 py-3 text-xs text-ink-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft transition-all placeholder:text-ink-secondary/40"
            />
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
              <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading team roster…</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-16 text-center bg-surface-white border border-[#EEE9E4] rounded-card shadow-card">
              <Users className="w-10 h-10 text-ink-secondary/30 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink-black">No Employees Found</p>
              <p className="text-xs text-ink-secondary mt-1">Try expanding your search query or invite a new teammate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div 
                  key={emp.id} 
                  className={cn(
                    "bg-surface-white border rounded-card shadow-card p-5 relative overflow-hidden transition-all hover:shadow-floating flex flex-col justify-between",
                    emp.status === "suspended" ? "border-red-200 bg-red-50/10 opacity-75" : "border-[#EEE9E4]"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        {emp.profile_picture_url ? (
                          <img 
                            src={emp.profile_picture_url} 
                            alt={emp.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#EEE9E4]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-dark flex items-center justify-center text-white text-xs font-black shadow-soft">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-ink-black flex items-center gap-2">
                            {emp.name}
                            {emp.status === "pending" && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[8px] font-bold text-amber-700 uppercase tracking-wider">Pending</span>
                            )}
                            {emp.status === "suspended" && (
                              <span className="px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-[8px] font-bold text-red-700 uppercase tracking-wider">Suspended</span>
                            )}
                          </h4>
                          <p className="text-[10px] text-ink-secondary font-semibold truncate max-w-[150px] mt-0.5">{emp.email}</p>
                        </div>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                        emp.employee_type === "OWNER" && "bg-[#E91E63]/10 border-[#E91E63]/20 text-[#E91E63]",
                        emp.employee_type === "FINANCE" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                        emp.employee_type === "SALES" && "bg-blue-50 border-blue-200 text-blue-700",
                        emp.employee_type === "MARKETING" && "bg-purple-50 border-purple-200 text-purple-700"
                      )}>
                        {emp.employee_type || "FINANCE"}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-cream-200 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-ink-secondary font-bold">
                        <span>Designation:</span>
                        <span className="text-ink-primary font-extrabold">{emp.designation || "Executive"}</span>
                      </div>
                      {emp.notes && (
                        <div className="text-[10px] text-ink-secondary bg-cream-50 p-2 rounded border border-cream-100 italic mt-1.5">
                          {emp.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-cream-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenPermissions(emp)}
                        className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary hover:text-ink-primary flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        title="Edit Permissions"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Perms
                      </button>
                      <button
                        onClick={() => setResettingEmployee(emp)}
                        className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary hover:text-ink-primary flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        title="Reset Password"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Pass
                      </button>
                      <button
                        onClick={() => setViewingProfileEmployee(emp)}
                        className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary hover:text-ink-primary flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        title="View Teammate Analytics"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusToggle(emp)}
                        className={cn(
                          "px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                          emp.status === "suspended"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                        )}
                      >
                        {emp.status === "suspended" ? "Unsuspend" : "Suspend"}
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="p-1.5 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite/Create Teammate Modal Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-lg rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Add Teammate</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Enter employee credentials. Setting a password allows immediate account login access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Teammate Name *</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Email Address *</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Phone Number</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Password (For Direct Login)</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Director"
                  value={inviteForm.designation}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Workspace / Employee Type</label>
                <select
                  value={inviteForm.employee_type}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, employee_type: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="FINANCE">Finance</option>
                  <option value="SALES">Sales</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="OWNER">Owner / Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Profile Picture URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={inviteForm.profile_picture_url}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, profile_picture_url: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Status</label>
                <select
                  value={inviteForm.status}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Notes</label>
              <textarea
                placeholder="Teammate specific notes..."
                value={inviteForm.notes}
                onChange={(e) => setInviteForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40 min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-4 gap-2.5">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating Teammate...
                  </>
                ) : (
                  "Create Teammate"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resettingEmployee} onOpenChange={(open) => !open && setResettingEmployee(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black flex items-center gap-1.5">
              <Lock className="w-5 h-5 text-[#E91E63]" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1">
              Reset login credentials for employee: {resettingEmployee?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">New Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setResettingEmployee(null)
                  setNewPassword("")
                }}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Override Modal Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-4xl rounded-card shadow-floating z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-bold text-ink-black flex items-center gap-1.5">
              <Key className="w-5 h-5 text-[#E91E63]" />
              Manage Override Permissions: {editingEmployee?.name}
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1">
              Select granular direct permission overrides for this employee. These append to role permissions.
            </DialogDescription>
          </DialogHeader>

          {/* Checklist Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="border border-[#EEE9E4] rounded-card overflow-hidden bg-[#FAF8F5]/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-cream-100 border-b border-[#EEE9E4]">
                    <th className="p-3.5 font-bold text-ink-primary">Category / Scope</th>
                    {PERMISSION_ACTIONS.map(act => (
                      <th key={act.id} className="p-3.5 font-bold text-ink-primary text-center">{act.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEE9E4]/60">
                  {PERMISSION_CATEGORIES.map(cat => (
                    <tr key={cat.id} className="hover:bg-cream-50/20 transition-colors">
                      <td className="p-3.5 font-bold text-ink-black capitalize">{cat.label}</td>
                      {PERMISSION_ACTIONS.map(act => {
                        const isChecked = selectedPermissions.some(p => p.category === cat.id && p.action === act.id)
                        return (
                          <td key={act.id} className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(cat.id, act.id)}
                              className="w-4 h-4 rounded text-[#E91E63] focus:ring-[#E91E63] cursor-pointer"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-cream-50/50 border-t border-[#EEE9E4] gap-2.5">
            <button
              onClick={() => setEditingEmployee(null)}
              className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Overrides...
                </>
              ) : (
                "Save Overrides"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewing Employee Profile / Analytics Dialog */}
      <Dialog open={!!viewingProfileEmployee} onOpenChange={(open) => !open && setViewingProfileEmployee(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-4xl rounded-card shadow-floating z-50 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 border-b border-cream-200 pb-4">
            <div className="flex items-center gap-4">
              {viewingProfileEmployee?.profile_picture_url ? (
                <img 
                  src={viewingProfileEmployee.profile_picture_url} 
                  alt={viewingProfileEmployee?.name} 
                  className="w-14 h-14 rounded-full object-cover border border-[#EEE9E4]"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-dark flex items-center justify-center text-white text-lg font-black shadow-soft">
                  {viewingProfileEmployee?.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <DialogTitle className="text-xl font-bold text-ink-black flex items-center gap-2">
                  {viewingProfileEmployee?.name}
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                    viewingProfileEmployee?.employee_type === "OWNER" && "bg-[#E91E63]/10 border-[#E91E63]/20 text-[#E91E63]",
                    viewingProfileEmployee?.employee_type === "FINANCE" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                    viewingProfileEmployee?.employee_type === "SALES" && "bg-blue-50 border-blue-200 text-blue-700",
                    viewingProfileEmployee?.employee_type === "MARKETING" && "bg-purple-50 border-purple-200 text-purple-700"
                  )}>
                    {viewingProfileEmployee?.employee_type}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-ink-secondary text-xs mt-1">
                  {viewingProfileEmployee?.designation || "Executive"} • {viewingProfileEmployee?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* KPI metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#FAF8F5]/50 border border-[#EEE9E4] rounded p-4">
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-secondary">Leads Closed</span>
                <p className="text-xl font-black text-ink-black mt-1.5">{viewingProfileEmployee?.employee_type === "SALES" ? "8" : "0"}</p>
              </div>
              <div className="bg-[#FAF8F5]/50 border border-[#EEE9E4] rounded p-4">
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-secondary">Invoices Created</span>
                <p className="text-xl font-black text-ink-black mt-1.5">{viewingProfileEmployee?.employee_type === "FINANCE" ? "14" : "0"}</p>
              </div>
              <div className="bg-[#FAF8F5]/50 border border-[#EEE9E4] rounded p-4">
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-secondary">Campaigns Launched</span>
                <p className="text-xl font-black text-ink-black mt-1.5">{viewingProfileEmployee?.employee_type === "MARKETING" ? "4" : "0"}</p>
              </div>
              <div className="bg-[#FAF8F5]/50 border border-[#EEE9E4] rounded p-4">
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-secondary">Revenue Value</span>
                <p className="text-xl font-black text-emerald-600 mt-1.5">
                  ₹{viewingProfileEmployee?.employee_type === "SALES" ? "75,000" : viewingProfileEmployee?.employee_type === "FINANCE" ? "1,20,000" : "0"}
                </p>
              </div>
            </div>

            {/* Performance score graph */}
            <div className="bg-white border border-[#EEE9E4] rounded-card p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-3">Productivity score (Last 6 Months)</span>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { month: "Jan", score: 65 },
                    { month: "Feb", score: 72 },
                    { month: "Mar", score: 80 },
                    { month: "Apr", score: 85 },
                    { month: "May", score: 92 },
                    { month: "Jun", score: viewingProfileEmployee?.activity_score || 95 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE9" />
                    <XAxis dataKey="month" stroke="#8C837B" fontSize={9} />
                    <YAxis stroke="#8C837B" fontSize={9} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#E91E63" fill="#E91E63" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Logs Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Login history */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-black block">Recent Sign In Sessions</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  <div className="p-2.5 bg-cream-50 rounded border border-cream-100 flex justify-between items-center text-[10px]">
                    <div>
                      <p className="font-semibold text-ink-black">192.168.1.1</p>
                      <span className="text-[8px] text-ink-secondary font-mono">Chrome / Windows 11</span>
                    </div>
                    <span className="text-ink-secondary font-mono">
                      {viewingProfileEmployee?.last_login ? new Date(viewingProfileEmployee.last_login).toLocaleDateString() : "Just now"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-cream-50 rounded border border-cream-100 flex justify-between items-center text-[10px] opacity-75">
                    <div>
                      <p className="font-semibold text-ink-black">192.168.1.18</p>
                      <span className="text-[8px] text-ink-secondary font-mono">Safari / macOS</span>
                    </div>
                    <span className="text-ink-secondary font-mono">Yesterday</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-black block">Internal Workspace Notes</span>
                <div className="p-4 bg-cream-50 border border-[#EEE9E4] rounded-card min-h-[100px] text-xs text-ink-secondary leading-relaxed">
                  {viewingProfileEmployee?.notes || "No employee notes configured yet. Edit profile to add internal supervisor notes."}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-cream-50/50 border-t border-[#EEE9E4] gap-2.5">
            <button
              onClick={() => setViewingProfileEmployee(null)}
              className="px-5 py-2.5 rounded-button text-xs font-bold text-ink-primary bg-white hover:bg-cream-100 border border-[#EEE9E4] transition-all cursor-pointer"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
