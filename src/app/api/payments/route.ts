import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Payments GET API stub" })
}

export async function POST() {
  return NextResponse.json({ message: "Payments POST API stub" })
}
