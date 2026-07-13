import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/email/send"

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()
    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    await sendWelcomeEmail({ to: email, ownerName: name })
    return NextResponse.json({ success: true, message: "Welcome email sent" })
  } catch (err: any) {
    console.error("Welcome email route error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}