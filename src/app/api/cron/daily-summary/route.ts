import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { resend } from "@/lib/email/client"

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize Cron trigger using Header
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("Unauthorized attempt to trigger daily summary cron endpoint.")
      return new Response("Unauthorized", { status: 401 })
    }

    const supabase = getSupabaseServiceRoleClient()

    // 2. Fetch all businesses with their notification settings
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select(`
        *,
        notification_settings(*)
      `)

    if (bizError) throw bizError
    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ success: true, message: "No businesses found." })
    }

    // Get current date in IST as YYYY-MM-DD
    const todayISTString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())

    const results = []

    for (const business of businesses) {
      const rawSettings = business.notification_settings
      const settings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings

      // Only process daily summaries if enabled by the business owner
      if (!settings || !settings.owner_daily_summary) {
        continue
      }

      if (!business.email) {
        console.warn(`Business "${business.name}" has summary enabled but no email configured.`)
        continue
      }

      // A. Calculate collections today
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("business_id", business.id)
        .eq("status", "success")
        .gte("created_at", `${todayISTString}T00:00:00.000Z`)
        .lte("created_at", `${todayISTString}T23:59:59.999Z`)

      const collectedToday = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      const paymentCount = payments?.length || 0

      // B. Count invoices that are newly overdue today (due date = today, status is unpaid)
      const { data: overdues } = await supabase
        .from("invoices")
        .select("id")
        .eq("business_id", business.id)
        .eq("due_date", todayISTString)
        .in("status", ["sent", "viewed", "partial"])

      const newOverdueCount = overdues?.length || 0

      // C. Count total outstanding balance
      const { data: outstandings } = await supabase
        .from("invoices")
        .select("balance_due")
        .eq("business_id", business.id)
        .in("status", ["sent", "viewed", "overdue", "partial"])

      const totalOutstanding = (outstandings || []).reduce((sum: number, inv: any) => sum + Number(inv.balance_due), 0)

      // D. Send email summary
      const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`
      const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "CollectBot <onboarding@resend.dev>"

      const subject = `📊 Today's Summary — ${business.name}`
      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
          <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📊 Daily Collection Summary</h2>
          <p>Hello,</p>
          <p>Here is the automated daily operations and collection report for <strong>${business.name}</strong> on <strong>${todayISTString}</strong>.</p>
          
          <div style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 10px 0; font-weight: 600; color: #475569;">Collected Today</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 800; color: #10b981; fontSize: 16px;">
                  ₹${collectedToday.toLocaleString("en-IN")} (${paymentCount} payments)
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 10px 0; font-weight: 600; color: #475569;">New Overdues Today</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 800; color: #ef4444;">
                  ${newOverdueCount} Invoices
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #475569;">Total Outstanding Balance</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 800; color: #6366f1;">
                  ₹${totalOutstanding.toLocaleString("en-IN")}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${dashboardLink}" style="background-color: #6366f1; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Dashboard details
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
          <span style="font-size: 11px; color: #94a3b8;">Sent automatically via CollectBot.</span>
        </div>
      `

      await resend.emails.send({
        from: FROM_EMAIL,
        to: business.email,
        subject,
        html: htmlContent,
      })

      results.push({
        businessId: business.id,
        collected: collectedToday,
        overdueCount: newOverdueCount,
        outstanding: totalOutstanding,
      })
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Cron daily summary execution failed:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
