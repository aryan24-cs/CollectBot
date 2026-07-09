import * as React from "react"
import { BellRing } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Reminders</h1>
        <p className="text-slate-400">Configure scheduling parameters and monitor logs for WhatsApp and Email notifications.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Reminder Queue & Settings</CardTitle>
              <CardDescription className="text-slate-400">Monitor active schedules and review transmission logs.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg m-6 mt-0 text-slate-500 gap-3">
          <span>Reminder details and templates will be initialized in Phase 2</span>
        </CardContent>
      </Card>
    </div>
  )
}
