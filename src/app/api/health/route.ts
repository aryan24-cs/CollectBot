import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const services = {
    database: "error",
    storage: "error",
  }

  try {
    const supabase = getSupabaseServiceRoleClient()

    // 1. Check database connection
    const { count, error: dbError } = await supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .limit(1)

    if (!dbError) {
      services.database = "ok"
    } else {
      console.error("Health check database error:", dbError.message)
    }

    // 2. Check storage connection
    const { data: storageList, error: storageError } = await supabase.storage
      .from("invoices")
      .list("", { limit: 1 })

    if (!storageError) {
      services.storage = "ok"
    } else {
      console.error("Health check storage error:", storageError.message)
    }

    const overallStatus = services.database === "ok" && services.storage === "ok" ? "ok" : "error"

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp,
        services,
      },
      {
        status: overallStatus === "ok" ? 200 : 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (err: any) {
    console.error("Health check execution crashed:", err)
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        services,
        error: err.message || "Execution crashed",
      },
      { status: 500 }
    )
  }
}
