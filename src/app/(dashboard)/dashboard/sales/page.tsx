"use client"

import * as React from "react"
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  Plus, 
  Search, 
  Loader2, 
  DollarSign, 
  Activity, 
  Calendar, 
  ArrowRight,
  Filter,
  CheckCircle,
  FileText,
  UserPlus
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string
  status: "new" | "qualified" | "contacted" | "proposal_sent" | "negotiation" | "won" | "lost"
  value: number
  assigned_to: string | null
  created_at: string
  employee?: { id: string; name: string } | null
}

const PIPELINE_STAGES = [
  { id: "new", label: "New Leads", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { id: "contacted", label: "Contacted", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { id: "proposal_sent", label: "Proposal Sent", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  { id: "negotiation", label: "Negotiation", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  { id: "won", label: "Won Deals", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { id: "lost", label: "Lost Deals", color: "bg-red-500/10 text-red-600 border-red-200" }
]

export default function SalesWorkspacePage() {
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [employees, setEmployees] = React.useState<{id: string; name: string}[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState<string>("all")

  // Add Lead Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [leadForm, setLeadForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "Website",
    value: "",
    assigned_to: "",
    status: "new"
  })

  // Edit Lead Status State
  const [movingLead, setMovingLead] = React.useState<Lead | null>(null)
  const [newStatus, setNewStatus] = React.useState<string>("")

  const loadLeads = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/sales/leads")
      if (!res.ok) throw new Error("Failed to load leads.")
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees")
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (_) {}
  }

  React.useEffect(() => {
    loadLeads()
    loadEmployees()
  }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadForm.name) {
      toast.error("Lead name is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create lead.")

      toast.success(`Lead "${leadForm.name}" registered successfully!`)
      setIsAddOpen(false)
      setLeadForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        source: "Website",
        value: "",
        assigned_to: "",
        status: "new"
      })
      loadLeads()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveStatus = async () => {
    if (!movingLead || !newStatus) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/sales/leads/${movingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error("Failed to change stage.")
      toast.success(`Shifted "${movingLead.name}" to ${newStatus}`)
      setMovingLead(null)
      loadLeads()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead?")) return

    try {
      const res = await fetch(`/api/sales/leads/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete lead.")
      toast.success("Lead soft deleted successfully.")
      loadLeads()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Filtered lists
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (l.company && l.company.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStage = stageFilter === "all" || l.status === stageFilter
    return matchesSearch && matchesStage
  })

  // Calculations
  const totalLeads = leads.length
  const wonLeads = leads.filter(l => l.status === "won")
  const pipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Sales CRM Portal</h1>
          <p className="text-ink-secondary text-sm mt-1">Manage corporate pipeline contacts, schedule meeting follow-ups, and track deal closures.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add CRM Lead
        </button>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Total CRM Leads</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">{totalLeads}</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Registered leads in pipeline</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Conversion Funnel</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">{conversionRate}%</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Qualified leads converted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Pipeline Volume</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">₹{pipelineValue.toLocaleString()}</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Estimated contract values</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Target Progress</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">₹{(pipelineValue * 0.4).toLocaleString()}</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Weighted conversion values</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary/50" />
          <input
            placeholder="Search leads by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-pill border border-[#EEE9E4] pl-11 pr-6 py-3 text-xs text-ink-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft transition-all placeholder:text-ink-secondary/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-ink-secondary" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-white rounded-button border border-[#EEE9E4] text-xs font-semibold px-4 py-2.5 focus:outline-none text-ink-primary shadow-soft cursor-pointer flex-1 sm:flex-initial"
          >
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pipeline Board */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-card border border-[#EEE9E4]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Syncing pipeline ledgers…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-start">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.status === stage.id)
            const stageSum = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)

            return (
              <div key={stage.id} className="space-y-3 bg-[#FAF8F5]/50 border border-[#EEE9E4] rounded-card p-3 min-h-[300px] flex flex-col justify-start">
                <div className="flex items-center justify-between border-b border-cream-200 pb-2">
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-ink-black">{stage.label}</h3>
                    <span className="text-[8px] font-mono text-ink-secondary font-bold">₹{stageSum.toLocaleString()}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-cream-100 border border-cream-200 text-[8px] font-mono font-bold text-ink-secondary">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {stageLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="bg-white border border-[#EEE9E4] rounded p-3 shadow-soft hover:shadow-floating transition-all space-y-2.5 relative group"
                    >
                      <div>
                        <h4 className="text-[10px] font-bold text-ink-black tracking-tight truncate">{lead.name}</h4>
                        {lead.company && (
                          <p className="text-[8px] text-ink-secondary font-semibold uppercase mt-0.5">{lead.company}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono font-bold pt-1.5 border-t border-cream-100">
                        <span className="text-emerald-600">₹{lead.value.toLocaleString()}</span>
                        <span className="text-ink-secondary capitalize">{lead.source}</span>
                      </div>

                      <div className="pt-2 flex justify-between items-center gap-1.5">
                        <button
                          onClick={() => {
                            setMovingLead(lead)
                            setNewStatus(lead.status)
                          }}
                          className="text-[8px] font-extrabold uppercase text-brand-500 hover:text-brand-600 bg-transparent border-none cursor-pointer flex items-center gap-0.5"
                        >
                          Shift
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-[8px] font-bold uppercase text-red-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-[8px] font-bold text-ink-secondary/35 uppercase border border-dashed border-cream-200 rounded">
                      Empty Board
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-md rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Create CRM Lead</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Register a corporate lead target to manage deal conversions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Contact Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Corporate Email</label>
                <input
                  type="email"
                  placeholder="jane@company.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Phone Number</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Company Name</label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={leadForm.company}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Deal Value (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={leadForm.value}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Lead Source</label>
                <select
                  value={leadForm.source}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Email Campaign">Email Campaign</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Assignee</label>
                <select
                  value={leadForm.assigned_to}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="">Select Assignee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Initial Stage</label>
                <select
                  value={leadForm.status}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  {PIPELINE_STAGES.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
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
                    Creating Lead...
                  </>
                ) : (
                  "Create Lead"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Stage Modal */}
      <Dialog open={!!movingLead} onOpenChange={(open) => !open && setMovingLead(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Shift Pipeline Stage</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Modify pipeline classification for lead: {movingLead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Select Pipeline Stage</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
              >
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                onClick={() => setMovingLead(null)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveStatus}
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Stage"
                )}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
