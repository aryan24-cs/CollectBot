"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Lock, 
  Save, 
  Settings,
  AlertTriangle,
  UserCheck
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "invoices", label: "Invoices & Billing" },
  { id: "clients", label: "Client Directory" },
  { id: "payments", label: "Payments Logs" },
  { id: "reports", label: "Reports Desk" },
  { id: "analytics", label: "Analytics Dashboard" },
  { id: "finance", label: "Finance Ledger" },
  { id: "marketing", label: "Campaigns" },
  { id: "sales", label: "Sales & Pipelines" },
  { id: "employees", label: "Teammates Directory" },
  { id: "settings", label: "System Settings" },
  { id: "approvals", label: "Audit & Approvals" },
  { id: "expenses", label: "Expenses Logging" },
  { id: "branches", label: "Branches Config" }
]

const ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "approve", label: "Approve" },
  { id: "export", label: "Export" }
]

interface RolePermission {
  category: string
  action: string
}

interface CustomRole {
  id: string
  name: string
  description: string | null
  permissions: RolePermission[]
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = React.useState<CustomRole[]>([])
  const [selectedRole, setSelectedRole] = React.useState<CustomRole | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // New role dialog state
  const [isOpen, setIsOpen] = React.useState(false)
  const [newRoleName, setNewRoleName] = React.useState("")
  const [newRoleDesc, setNewRoleDesc] = React.useState("")

  // Selected role permission matrix editing state
  const [editingPermissions, setEditingPermissions] = React.useState<RolePermission[]>([])

  const loadRoles = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/roles")
      if (!res.ok) throw new Error("Failed to load custom roles.")
      const data = await res.json()
      const rolesList = data.roles || []
      setRoles(rolesList)
      
      // Auto-select first role if none selected
      if (rolesList.length > 0) {
        if (!selectedRole || !rolesList.find((r: any) => r.id === selectedRole.id)) {
          handleSelectRole(rolesList[0])
        } else {
          const freshSelected = rolesList.find((r: any) => r.id === selectedRole.id)
          if (freshSelected) handleSelectRole(freshSelected)
        }
      } else {
        setSelectedRole(null)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadRoles()
  }, [])

  const handleSelectRole = (role: CustomRole) => {
    setSelectedRole(role)
    setEditingPermissions([...role.permissions])
  }

  const handleTogglePermission = (category: string, action: string) => {
    setEditingPermissions((prev) => {
      const exists = prev.some(p => p.category === category && p.action === action)
      if (exists) {
        return prev.filter(p => !(p.category === category && p.action === action))
      } else {
        return [...prev, { category, action }]
      }
    })
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description,
          permissions: editingPermissions
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update permissions.")
      }

      toast.success("Role permissions updated successfully.")
      loadRoles()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) {
      toast.error("Please provide a name for the role.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc,
          permissions: []
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to register custom role.")
      }

      toast.success("Custom role registered.")
      setIsOpen(false)
      setNewRoleName("")
      setNewRoleDesc("")
      loadRoles()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to permanently delete this role? Any employees under this role will reset to standard workspace users.")) return

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete role.")
      toast.success("Role deleted.")
      loadRoles()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Roles & RBAC matrix</h1>
          <p className="text-ink-secondary text-sm mt-1">Configure workspace level roles and permission boundaries. Assign to invited employees.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Role
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-surface-white border border-[#EEE9E4] rounded-card shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading workspace credentials...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Roles Roster */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink-secondary">Custom Workspace Roles</h3>
            {roles.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#EEE9E4] rounded-card bg-cream-50/50">
                <p className="text-xs text-ink-secondary italic font-semibold">No custom roles defined yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={cn(
                      "p-4 rounded-card border text-left cursor-pointer transition-all flex justify-between items-center",
                      selectedRole?.id === r.id
                        ? "bg-surface-white border-[#E91E63] shadow-soft"
                        : "bg-surface-white border-[#EEE9E4] hover:bg-cream-50/30"
                    )}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-ink-black">{r.name}</h4>
                      {r.description && (
                        <p className="text-[10px] text-ink-secondary mt-1 max-w-[200px] truncate">{r.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRole(r.id)
                      }}
                      className="p-1 rounded text-ink-muted hover:text-red-600 bg-transparent cursor-pointer border-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissions Matrix */}
          <div className="md:col-span-2 space-y-4">
            {selectedRole ? (
              <Card className="border-[#EEE9E4] bg-surface-white shadow-soft rounded-card overflow-hidden">
                <CardHeader className="bg-cream-50/40 border-b border-[#EEE9E4] p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-sm font-black text-ink-black uppercase tracking-wider">
                        Permissions Matrix: {selectedRole.name}
                      </CardTitle>
                      {selectedRole.description && (
                        <CardDescription className="text-[10px] text-ink-secondary mt-1">
                          {selectedRole.description}
                        </CardDescription>
                      )}
                    </div>
                    <button
                      onClick={handleSavePermissions}
                      disabled={isSubmitting}
                      className="btn-primary px-4 py-2 rounded-button text-[10px] font-bold shadow-soft flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Matrix
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EEE9E4] pb-2 text-[10px] uppercase font-bold text-ink-secondary">
                        <th className="py-2.5 font-bold">Category</th>
                        {ACTIONS.map(act => (
                          <th key={act.id} className="py-2.5 font-bold text-center px-2">{act.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEE9E4]">
                      {CATEGORIES.map((cat) => (
                        <tr key={cat.id} className="hover:bg-cream-50/10 transition-colors">
                          <td className="py-3 text-xs font-bold text-ink-black">{cat.label}</td>
                          {ACTIONS.map((act) => {
                            const isChecked = editingPermissions.some(
                              p => p.category === cat.id && p.action === act.id
                            )
                            return (
                              <td key={act.id} className="py-3 text-center px-2">
                                <label className="inline-flex items-center justify-center cursor-pointer w-6 h-6 rounded bg-cream-50 border border-[#EEE9E4] hover:border-ink-secondary/30 transition-all select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(cat.id, act.id)}
                                    className="sr-only"
                                  />
                                  {isChecked && (
                                    <Check className="w-3.5 h-3.5 text-[#E91E63] stroke-[3]" />
                                  )}
                                </label>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <div className="py-20 text-center border border-dashed border-[#EEE9E4] rounded-card bg-cream-50/30">
                <ShieldAlert className="w-8 h-8 mx-auto text-[#E91E63]/60 mb-2" />
                <p className="text-xs text-ink-secondary font-bold">Please select or register a role to begin mapping permissions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Role Creation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Create Custom Role</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Name your role and describe its intended responsibilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Role Name *</label>
              <input
                type="text"
                placeholder="e.g. Finance Auditor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Description</label>
              <textarea
                placeholder="Briefly state duties..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft h-20 focus:outline-none placeholder:text-ink-secondary/40 resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold flex items-center justify-center cursor-pointer gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Role
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
