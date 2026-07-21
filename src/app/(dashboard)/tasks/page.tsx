"use client"

import * as React from "react"
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  User, 
  Check, 
  Clock, 
  AlertCircle,
  FileText,
  Bookmark,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate, cn } from "@/lib/utils"

interface Employee {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status: "todo" | "in_progress" | "review" | "done"
  due_date: string | null
  created_at: string
  assignee?: { id: string; name: string } | null
}

const TASK_STATUSES = [
  { id: "todo", label: "To Do", bg: "bg-cream-100 text-ink-primary border-[#EEE9E4]" },
  { id: "in_progress", label: "In Progress", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "review", label: "Under Review", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "done", label: "Completed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" }
]

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [assigneeId, setAssigneeId] = React.useState("")

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/tasks")
      if (!res.ok) throw new Error("Failed to load tasks list.")
      const data = await res.json()
      setTasks(data.tasks || [])
      setEmployees(data.employees || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load tasks.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Please enter a task title.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate || null,
          assignee_id: assigneeId || null
        })
      })

      if (!res.ok) throw new Error("Failed to register task.")
      toast.success("Task successfully scheduled.")
      setIsOpen(false)
      setTitle("")
      setDescription("")
      setDueDate("")
      setAssigneeId("")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      })

      if (!res.ok) throw new Error("Failed to update status.")
      toast.success("Task status updated.")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to permanently delete this task?")) return

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to remove task.")
      toast.success("Task successfully deleted.")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Workspace Task Manager</h1>
          <p className="text-ink-secondary text-sm mt-1">Assign follow-ups, invoice reminders, client onboarding checklists, and trace operations status.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Grid of Boards */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-surface-white border border-[#EEE9E4] rounded-card shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading project boards…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {TASK_STATUSES.map((board) => {
            const boardTasks = tasks.filter(t => t.status === board.id)
            return (
              <div key={board.id} className="space-y-4">
                {/* Board header */}
                <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-ink-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E91E63]" />
                    {board.label}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-cream-100 text-[10px] font-bold text-ink-secondary">
                    {boardTasks.length}
                  </span>
                </div>

                {/* Task list container */}
                <div className="space-y-3 min-h-[300px]">
                  {boardTasks.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-ink-secondary font-semibold italic border border-dashed border-[#EEE9E4] rounded-card bg-cream-50/10">
                      No tasks in this board
                    </div>
                  ) : (
                    boardTasks.map((t) => (
                      <div 
                        key={t.id}
                        className="bg-surface-white border border-[#EEE9E4] rounded-card p-4 shadow-card hover:shadow-floating transition-shadow relative group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-ink-black leading-snug">{t.title}</h4>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 rounded text-ink-muted hover:text-red-600 hover:bg-red-50 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {t.description && (
                          <p className="text-[10px] text-ink-secondary leading-relaxed mt-1.5">{t.description}</p>
                        )}

                        <div className="mt-4 pt-3 border-t border-cream-200 flex flex-wrap gap-2 items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[9px] text-ink-secondary font-bold">
                            <User className="w-3 h-3 text-[#E91E63]" />
                            {t.assignee?.name || "Unassigned"}
                          </span>

                          {t.due_date && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-[#E91E63] font-bold bg-[#FDF2F7] px-1.5 py-0.5 rounded border border-[#E91E63]/10">
                              <Calendar className="w-3 h-3" />
                              {formatDate(t.due_date)}
                            </span>
                          )}
                        </div>

                        {/* Status transition select quick toggle */}
                        <div className="mt-3">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className="w-full bg-cream-50 border border-none rounded-button px-2 py-1 text-[9px] font-bold text-ink-secondary cursor-pointer focus:outline-none"
                          >
                            {TASK_STATUSES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Task Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-xl rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Create Workspace Task</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Input task properties, scheduling info, and assignee parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Call Client for Reminders"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Description</label>
              <textarea
                placeholder="Details or deliverables details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft h-20 focus:outline-none placeholder:text-ink-secondary/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                />
              </div>
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
                  <CheckSquare className="w-4 h-4" />
                )}
                Schedule Task
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
