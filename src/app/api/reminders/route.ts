import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch user's business
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 400 })
    }

    // 2. Fetch all logs for statistics calculation
    const { data: logs, error: logsError } = await supabase
      .from("reminder_logs")
      .select(`
        *,
        invoice:invoices(id, invoice_number, total, client:clients(id, name))
      `)
      .eq("business_id", business.id)
      .order("sent_at", { ascending: false })

    if (logsError) throw logsError

    // Calculate stats (current calendar month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    let totalSentThisMonth = 0
    let whatsappCount = 0
    let emailCount = 0
    let failedCount = 0

    const historyList: any[] = []

    logs?.forEach((log) => {
      const logDate = new Date(log.sent_at)
      const isCurrentMonth = logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear

      if (isCurrentMonth && log.status === "sent") {
        totalSentThisMonth++
        if (log.channel === "whatsapp") whatsappCount++
        if (log.channel === "email") emailCount++
      }

      if (log.status === "failed") {
        failedCount++
      }

      // Add to formatted history logs
      historyList.push({
        id: log.id,
        date: log.sent_at,
        invoice_id: log.invoice?.id || "",
        invoice_number: log.invoice?.invoice_number || "Deleted",
        client_name: log.invoice?.client?.name || "Deleted Client",
        amount: log.invoice?.total || 0,
        reminder_type: log.reminder_type,
        channel: log.channel,
        status: log.status,
        message_content: log.message_content || "",
        error_message: log.error_message || "",
      })
    })

    // 3. Fetch active invoices to compute upcoming schedule
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        total,
        due_date,
        reminder_paused,
        status,
        client:clients(id, name),
        business:businesses(*, notification_settings(*))
      `)
      .in("status", ["sent", "viewed", "overdue", "partial"])
      .eq("reminder_paused", false)
      .eq("business_id", business.id)

    if (invError) throw invError

    const upcomingList: any[] = []
    const todayISTString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
    const today = new Date(todayISTString)
    const next7Days = new Date(today.getTime() + 7 * 24 * 3600 * 1000)

    invoices?.forEach((inv: any) => {
      const businessRaw = inv.business
      const business = Array.isArray(businessRaw) ? businessRaw[0] : businessRaw
      const rawSettings = business?.notification_settings
      const settings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings

      const milestones = [
        { type: "7_before", offset: -7, enabled: settings?.reminder_7_before ?? true },
        { type: "3_before", offset: -3, enabled: settings?.reminder_3_before ?? false },
        { type: "1_before", offset: -1, enabled: settings?.reminder_1_before ?? true },
        { type: "due_day", offset: 0, enabled: settings?.reminder_due_day ?? true },
        { type: "1_after", offset: 1, enabled: settings?.reminder_1_after ?? false },
        { type: "3_after", offset: 3, enabled: settings?.reminder_3_after ?? true },
        { type: "7_after", offset: 7, enabled: settings?.reminder_7_after ?? true },
        { type: "14_after", offset: 14, enabled: settings?.reminder_14_after ?? true },
      ]

      const dueDate = new Date(inv.due_date)

      milestones.forEach((ms) => {
        if (!ms.enabled) return

        const msDate = new Date(dueDate.getTime() + ms.offset * 24 * 3600 * 1000)

        // Check if reminder falls in the upcoming 7-day range
        if (msDate >= today && msDate <= next7Days) {
          // Check if this specific milestone was already sent
          const alreadySent = logs?.some(
            (log) =>
              log.invoice_id === inv.id &&
              log.reminder_type === ms.type &&
              log.status === "sent" &&
              log.sent_at.split("T")[0] === msDate.toISOString().split("T")[0]
          )

          if (!alreadySent) {
            upcomingList.push({
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              client_name: inv.client?.name || "Independent Client",
              amount: inv.total,
              reminder_type: ms.type,
              expected_date: msDate.toISOString().split("T")[0],
            })
          }
        }
      })
    })

    // Sort upcoming list chronologically
    upcomingList.sort((a, b) => new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime())

    return NextResponse.json({
      stats: {
        totalSentThisMonth,
        whatsappCount,
        emailCount,
        failedCount,
      },
      upcoming: upcomingList,
      history: historyList.slice(0, 100), // Limit to recent 100 logs
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load reminders data." }, { status: 500 })
  }
}
