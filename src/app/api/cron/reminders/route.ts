import { NextRequest, NextResponse } from "next/server"
import { processAllReminders } from "@/lib/reminders/processor"

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize Cron trigger using Header
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("Unauthorized attempt to trigger reminders cron endpoint.")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("Triggering scheduled reminder processor via cron...")
    const result = await processAllReminders()

    return NextResponse.json({
      success: true,
      processed: result.processedCount,
      sent: result.sentCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Cron reminders execution failed:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
