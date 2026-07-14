"use client"

import * as React from "react"
import { 
  Building, 
  FolderPlus, 
  Trash2, 
  ChevronRight, 
  GitMerge, 
  Loader2, 
  FolderSync, 
  Plus, 
  Archive, 
  RefreshCw 
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Department {
  id: string
  name: string
  description: string | null
  status: "active" | "archived"
  created_at: string
}

export default function DepartmentsSettingsPage() {
  // Data States
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Creation State
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  // Edit / Merge dialog state
  const [editingDept, setEditingDept] = React.useState<Department | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")

  const [mergingDept, setMergingDept] = React.useState<Department | null>(null)
  const [targetDeptId, setTargetDeptId] = React.useState("")

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/departments")
      if (!res.ok) throw new Error("Failed to load departments roster.")
      const data = await res.json()
      setDepartments(data || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load departments.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a department name.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create department.")

      toast.success(`Department "${name}" successfully registered.`)
      setName("")
      setDescription("")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDept || !editName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription })
      })

      if (!res.ok) throw new Error("Failed to edit department.")
      toast.success("Department details updated.")
      setEditingDept(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveToggle = async (dept: Department) => {
    const nextStatus = dept.status === "archived" ? "active" : "archived"

    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      })

      if (!res.ok) throw new Error("Failed to toggle archive status.")
      toast.success(`Department is now ${nextStatus === "archived" ? "archived" : "restored"}.`)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteDepartment = async (dept: Department) => {
    if (!confirm(`Are you sure you want to permanently delete "${dept.name}"? Teammates in this department will be reset to unassigned.`)) {
      return
    }

    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete department.")
      toast.success("Department permanently deleted.")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mergingDept || !targetDeptId) {
      toast.error("Please select a target department.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/departments/${mergingDept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", target_department_id: targetDeptId })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to merge departments.")

      toast.success(`Successfully merged ${mergingDept.name} into target.`)
      setMergingDept(null)
      setTargetDeptId("")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (dept: Department) => {
    setEditingDept(dept)
    setEditName(dept.name)
    setEditDescription(dept.description || "")
  }

  const activeDepts = departments.filter(d => d.status === "active")
  const archivedDepts = departments.filter(d => d.status === "archived")

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      <div className="border-b border-surface-border/50 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Workspace Departments</h1>
        <p className="text-ink-secondary text-sm mt-1">Configure your company structure. Merge active segments, archive historical rosters, or configure new workspaces.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Create Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="border-b border-surface-border/50 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[#E91E63]" />
                Add Department
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary">Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales, Account Counter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary">Brief Description</label>
                  <textarea
                    placeholder="Describe tasks managed by this department..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none h-24 placeholder:text-ink-secondary/40 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center justify-center cursor-pointer shadow-soft"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Register Segment
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Listing */}
        <div className="md:col-span-2 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
              <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading departments roster…</p>
            </div>
          ) : (
            <>
              {/* Active Segments Card */}
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-600" />
                    Active Segments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-surface-border/50">
                  {activeDepts.length === 0 ? (
                    <div className="py-12 text-center text-ink-secondary text-xs">No active departments registered yet.</div>
                  ) : (
                    activeDepts.map((d) => (
                      <div key={d.id} className="p-4 flex items-center justify-between hover:bg-cream-50/20 transition-colors">
                        <div>
                          <h4 className="text-xs font-bold text-ink-black">{d.name}</h4>
                          <p className="text-[10px] text-ink-secondary mt-0.5 leading-relaxed max-w-sm">{d.description || "No description set."}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(d)}
                            className="px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#EEE9E4] text-ink-primary hover:bg-cream-100 cursor-pointer bg-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setMergingDept(d)}
                            className="px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#EEE9E4] text-brand-500 hover:bg-[#FDF2F7] cursor-pointer bg-white flex items-center gap-1"
                          >
                            <GitMerge className="w-3 h-3" />
                            Merge
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(d)}
                            className="px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#EEE9E4] text-ink-secondary hover:bg-cream-100 cursor-pointer bg-white"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Archived Segments Card */}
              {archivedDepts.length > 0 && (
                <Card className="opacity-75">
                  <CardHeader className="border-b border-surface-border/50 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                      <Archive className="w-4 h-4 text-ink-muted" />
                      Archived / Historical Segments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-surface-border/50 bg-[#FAF8F5]/30">
                    {archivedDepts.map((d) => (
                      <div key={d.id} className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-ink-secondary line-through">{d.name}</h4>
                          <p className="text-[10px] text-ink-secondary/70 mt-0.5">{d.description || "No description."}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleArchiveToggle(d)}
                            className="px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#EEE9E4] text-emerald-700 hover:bg-emerald-50 cursor-pointer bg-white flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(d)}
                            className="p-1.5 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Department Details Dialog */}
      <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-md rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Edit Department Details</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Department Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none h-24 resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold flex items-center justify-center cursor-pointer"
                disabled={isSubmitting}
              >
                Save Details
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge Segment Dialog */}
      <Dialog open={!!mergingDept} onOpenChange={(open) => !open && setMergingDept(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-md rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black flex items-center gap-1.5">
              <GitMerge className="w-5 h-5 text-[#E91E63]" />
              Merge Department: {mergingDept?.name}
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Move all employees in this department into another active segment and archive the source.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMergeSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Target Destination Segment</label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                required
              >
                <option value="">Select Destination</option>
                {activeDepts
                  .filter(d => d.id !== mergingDept?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))
                }
              </select>
            </div>

            <DialogFooter className="pt-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMergingDept(null)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold flex items-center justify-center cursor-pointer gap-1.5 bg-[#E91E63] hover:bg-[#D81B60]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4" />
                )}
                Merge & Archive
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
