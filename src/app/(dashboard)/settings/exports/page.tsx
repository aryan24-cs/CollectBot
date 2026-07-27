"use client"

import * as React from "react"
import { 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  Calendar, 
  Filter, 
  Check, 
  Loader2, 
  Sparkles,
  Building,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ExportsSettingsPage() {
  const [format, setFormat] = React.useState<string>("tally_xml")
  const [entityType, setEntityType] = React.useState<string>("invoices")
  const [status, setStatus] = React.useState<string>("all")
  const [startDate, setStartDate] = React.useState<string>("")
  const [endDate, setEndDate] = React.useState<string>("")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleTriggerExport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsExporting(true)
      toast.loading("Compiling accounting export register...", { id: "export-toast" })

      const res = await fetch("/api/exports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, entity_type: entityType, startDate, endDate, status })
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || "Export failed.")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `CollectBot_${entityType}_${format}_${Date.now()}.${format === 'tally_xml' ? 'xml' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Accounting export downloaded successfully!", { id: "export-toast" })
    } catch (err: any) {
      toast.error(err.message, { id: "export-toast" })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-black">Accounting & Tally Export Hub</h1>
        <p className="text-ink-secondary text-xs mt-1">Export invoices, sales registers, and customer ledgers directly into TallyPrime, Tally ERP 9, or QuickBooks.</p>
      </div>

      <Card className="bg-white border-[#EEE9E4] shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#EEE9E4]/60 bg-[#FAF8F5]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-ink-black">Generate Voucher Export</CardTitle>
              <CardDescription className="text-xs text-ink-secondary">Select format standards, date filters, and tax category mappings.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleTriggerExport} className="space-y-5">
            
            {/* Format Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-primary">Export Format Standard</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "tally_xml", label: "Tally XML Voucher", desc: "Native XML for TallyPrime / Tally 9", icon: FileCode },
                  { id: "tally_csv", label: "Tally Sales CSV", desc: "GST Sales Voucher Register CSV", icon: FileSpreadsheet },
                  { id: "quickbooks_csv", label: "QuickBooks CSV", desc: "Standard QuickBooks Customer Ledger", icon: Download }
                ].map((item) => {
                  const Icon = item.icon
                  const isSelected = format === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-[#FAF8F5] border-[#E91E63] shadow-sm ring-1 ring-[#E91E63]" 
                          : "bg-white border-[#EEE9E4] hover:bg-[#FAF8F5]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-5 h-5 ${isSelected ? "text-[#E91E63]" : "text-ink-muted"}`} />
                        {isSelected && <Check className="w-4 h-4 text-[#E91E63]" />}
                      </div>
                      <h4 className="text-xs font-bold text-ink-black mt-2.5">{item.label}</h4>
                      <p className="text-[10px] text-ink-secondary mt-0.5">{item.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-primary">Entity Data</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="invoices">Invoices & Receipts</option>
                  <option value="clients">Clients & Accounts</option>
                  <option value="sales_register">Sales Register</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-primary">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-primary">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EEE9E4]/60 flex justify-end">
              <button
                type="submit"
                disabled={isExporting}
                className="bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-8 py-3 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
                <span>Download {format.toUpperCase()} Register</span>
              </button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
