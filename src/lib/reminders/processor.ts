import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import {
  sendFriendlyReminder,
  sendNudgeReminder,
  sendDueTodayReminder,
  sendOverdueReminder,
  sendFinalWarning,
} from "../whatsapp/templates"
import { sendReminderEmail } from "../email/send"
import { transporter } from "../email/client"

// Custom type mappings
type ReminderType =
  | "7_before"
  | "3_before"
  | "1_before"
  | "due_day"
  | "1_after"
  | "3_after"
  | "7_after"
  | "14_after"

interface ProcessingResult {
  processedCount: number
  sentCount: number
}

/**
 * Sweeps the database for unpaid invoices and dispatches scheduled notifications.
 */
export async function processAllReminders(): Promise<ProcessingResult> {
  const supabase = getSupabaseServiceRoleClient()
  let processedCount = 0
  let sentCount = 0

  // 1. Get current hour in India Standard Time (IST)
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  })
  const currentHour = parseInt(timeFormatter.format(new Date()), 10)

  // 2. Fetch all active invoices (unpaid, uncancelled, reminders not paused)
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      business:businesses(*, notification_settings(*))
    `)
    .in("status", ["sent", "viewed", "overdue", "partial"])
    .eq("reminder_paused", false)

  if (error) {
    console.error("Failed to query reminders queue:", error.message)
    throw error
  }

  if (!invoices || invoices.length === 0) {
    console.log("No invoices require reminder check today.")
    return { processedCount: 0, sentCount: 0 }
  }

  // Get current date in IST as YYYY-MM-DD
  const todayISTString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
  const today = new Date(todayISTString)

  console.log(`Processing reminders for ${invoices.length} invoices on date: ${todayISTString}`)

  for (const invoice of invoices) {
    processedCount++

    // Fetch nested notification settings
    const rawSettings = invoice.business?.notification_settings
    const settings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings

    // 3. Quiet Hours check: respect business-level rules or default to 9 AM - 8 PM IST
    const qStart = settings?.quiet_hours_start ? parseInt(settings.quiet_hours_start.split(":")[0], 10) : 9
    const qEnd = settings?.quiet_hours_end ? parseInt(settings.quiet_hours_end.split(":")[0], 10) : 20

    if (currentHour < qStart || currentHour >= qEnd) {
      console.log(`Skipping invoice ${invoice.invoice_number} — Outside business quiet hours window (${qStart}:00 - ${qEnd}:00)`)
      continue
    }

    // 4. Calculate days diff in IST
    const dueDate = new Date(invoice.due_date)
    const diffMs = today.getTime() - dueDate.getTime()
    const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24))

    // Determine type
    let reminderType: ReminderType | null = null
    if (daysDiff === -7) reminderType = "7_before"
    else if (daysDiff === -3) reminderType = "3_before"
    else if (daysDiff === -1) reminderType = "1_before"
    else if (daysDiff === 0) reminderType = "due_day"
    else if (daysDiff === 1) reminderType = "1_after"
    else if (daysDiff === 3) reminderType = "3_after"
    else if (daysDiff === 7) reminderType = "7_after"
    else if (daysDiff === 14) reminderType = "14_after"

    if (!reminderType) {
      // Not a scheduled reminder milestone
      continue
    }

    // 5. Check if settings is toggled on for this reminder type
    let isEnabled = true
    if (settings) {
      if (reminderType === "7_before") isEnabled = settings.reminder_7_before
      else if (reminderType === "3_before") isEnabled = settings.reminder_3_before
      else if (reminderType === "1_before") isEnabled = settings.reminder_1_before
      else if (reminderType === "due_day") isEnabled = settings.reminder_due_day
      else if (reminderType === "1_after") isEnabled = settings.reminder_1_after
      else if (reminderType === "3_after") isEnabled = settings.reminder_3_after
      else if (reminderType === "7_after") isEnabled = settings.reminder_7_after
      else if (reminderType === "14_after") isEnabled = settings.reminder_14_after
    }

    if (!isEnabled) {
      console.log(`Reminder milestone "${reminderType}" is disabled in settings for invoice ${invoice.invoice_number}`)
      continue
    }

    // 6. Double Check: query logs to ensure this reminder type has not been sent today
    const { data: existingLogs } = await supabase
      .from("reminder_logs")
      .select("id")
      .eq("invoice_id", invoice.id)
      .eq("reminder_type", reminderType)
      .eq("status", "sent")
      .gte("sent_at", `${todayISTString}T00:00:00.000Z`)
      .lte("sent_at", `${todayISTString}T23:59:59.999Z`)

    if (existingLogs && existingLogs.length > 0) {
      console.log(`Reminder "${reminderType}" already dispatched today for invoice ${invoice.invoice_number}`)
      continue
    }

    // Re-verify status from database immediately before dispatching to avoid race condition
    const { data: latestInv } = await supabase
      .from("invoices")
      .select("status, reminder_paused")
      .eq("id", invoice.id)
      .maybeSingle()

    if (!latestInv || latestInv.status === "paid" || latestInv.status === "cancelled" || latestInv.reminder_paused) {
      console.log(`Skipping dispatch for invoice ${invoice.invoice_number} due to updated status/pause state.`)
      continue
    }

    // 7. Dispatching notifications
    const formattedAmount = `₹${Number(invoice.total).toLocaleString("en-IN")}`
    const channelWhatsapp = false // Forced false to disable WhatsApp
    const channelEmail = true // Forced true to ensure email delivery

    // Track active sends
    let didSend = false

    // WhatsApp Dispatch
    if (channelWhatsapp && invoice.client.phone) {
      try {
        let waResult
        if (reminderType === "7_before" || reminderType === "3_before") {
          waResult = await sendFriendlyReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            dueDate: invoice.due_date,
            paymentLink: invoice.payment_link || "",
          })
        } else if (reminderType === "1_before") {
          waResult = await sendNudgeReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            dueDate: invoice.due_date,
            paymentLink: invoice.payment_link || "",
          })
        } else if (reminderType === "due_day") {
          waResult = await sendDueTodayReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            paymentLink: invoice.payment_link || "",
          })
        } else if (reminderType === "1_after" || reminderType === "3_after") {
          waResult = await sendOverdueReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            daysOverdue: Math.abs(daysDiff),
            paymentLink: invoice.payment_link || "",
          })
        } else {
          // 7_after and 14_after final warnings
          waResult = await sendFinalWarning({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            paymentLink: invoice.payment_link || "",
          })
        }

        if (waResult?.success) {
          didSend = true
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: reminderType,
            channel: "whatsapp",
            status: "sent",
            message_content: `WhatsApp sent to +91${invoice.client.phone.slice(-10)}`,
          })
        } else {
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: reminderType,
            channel: "whatsapp",
            status: "failed",
            error_message: waResult?.error || "Interakt API failed",
          })
        }
      } catch (waErr: any) {
        console.error(`WhatsApp cron dispatch failed for invoice ${invoice.invoice_number}:`, waErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: reminderType,
          channel: "whatsapp",
          status: "failed",
          error_message: waErr.message || "WhatsApp send crashed",
        })
      }
    }

    // Email Dispatch
    if (channelEmail && invoice.client.email) {
      try {
        // Map scheduler type to email template options ('friendly' | 'nudge' | 'overdue')
        let emailReminderType: "friendly" | "nudge" | "overdue" = "friendly"
        if (reminderType === "1_before" || reminderType === "due_day") {
          emailReminderType = "nudge"
        } else if (
          reminderType === "1_after" ||
          reminderType === "3_after" ||
          reminderType === "7_after" ||
          reminderType === "14_after"
        ) {
          emailReminderType = "overdue"
        }

        await sendReminderEmail({
          to: invoice.client.email,
          businessName: invoice.business.name,
          clientName: invoice.client.name,
          invoiceNumber: invoice.invoice_number,
          amount: formattedAmount,
          dueDate: invoice.due_date,
          paymentLink: invoice.payment_link || "",
          reminderType: emailReminderType,
          daysOverdue: Math.abs(daysDiff),
        })

        didSend = true
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: reminderType,
          channel: "email",
          status: "sent",
          message_content: `Email sent to ${invoice.client.email}`,
        })
      } catch (mailErr: any) {
        console.error(`Email cron dispatch failed for invoice ${invoice.invoice_number}:`, mailErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: reminderType,
          channel: "email",
          status: "failed",
          error_message: mailErr.message || "Resend dispatch crashed",
        })
      }
    }

    if (didSend) {
      sentCount++
      // Update invoice reminder count and shift to overdue status if due date has passed
      const nextStatus = daysDiff > 0 && invoice.status !== "overdue" ? "overdue" : invoice.status
      await supabase
        .from("invoices")
        .update({
          reminder_count: (Number(invoice.reminder_count) || 0) + 1,
          status: nextStatus,
        })
        .eq("id", invoice.id)
    }

    // 8. Escalation for 14 days overdue: Notify the business owner
    if (reminderType === "14_after" && invoice.business.email) {
      try {
        await transporter.sendMail({
          from: FROM_EMAIL_FALLBACK(invoice.business.email),
          to: invoice.business.email,
          subject: `⚠️ URGENT: Invoice ${invoice.invoice_number} is 14 Days Overdue`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
              <h2 style="color: #dc2626; margin-top: 0;">⚠️ Overdue Escalation</h2>
              <p>Hello,</p>
              <p>Invoice <strong>${invoice.invoice_number}</strong> to client <strong>${invoice.client.name}</strong> is now <strong>14 days overdue</strong>.</p>
              <p><strong>Invoice Details:</strong></p>
              <ul>
                <li>Client: ${invoice.client.name}</li>
                <li>Amount: ${formattedAmount}</li>
                <li>Due Date: ${invoice.due_date}</li>
              </ul>
              <p>Consider following up with the client directly to resolve this outstanding balance.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <span style="font-size: 11px; color: #94a3b8;">Sent by CollectBot Reminder Engine.</span>
            </div>
          `,
        })
        console.log(`Escalation alert dispatched to owner: ${invoice.business.email}`)
      } catch (escErr) {
        console.error("Failed to send 14_after owner alert:", escErr)
      }
    }
  }

  return { processedCount, sentCount }
}

// Fallback sender function (replaces direct const to avoid initialization errors)
function FROM_EMAIL_FALLBACK(ownerEmail: string) {
  return process.env.RESEND_FROM_EMAIL || "CollectBot <onboarding@resend.dev>"
}
