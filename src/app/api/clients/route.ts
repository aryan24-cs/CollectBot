import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { clientSchema } from "@/lib/validations/client"

export async function POST(request: NextRequest) {
  const { error: authErr, business } = await requireBusinessUser(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const validation = clientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const clientData = validation.data

    // Phone parsing: strip spaces, dashes, parentheses and country/zero prefixes to retain 10 digits
    let cleanedPhone = clientData.phone.replace(/[\s\-\(\)\+]/g, "")
    if (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) {
      cleanedPhone = cleanedPhone.substring(2)
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) {
      cleanedPhone = cleanedPhone.substring(1)
    }

    const supabase = getSupabaseServiceRoleClient()

    const { data: client, error: insertError } = await supabase
      .from("clients")
      .insert({
        business_id: business.id,
        name: clientData.name,
        email: clientData.email || null,
        phone: cleanedPhone,
        company_name: clientData.company_name || null,
        address: clientData.address || null,
        gstin: clientData.gstin || null,
        payment_terms: clientData.payment_terms,
        notes: clientData.notes || null,
        tags: clientData.tags || [],
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "client_created",
      description: `Client "${clientData.name}" was registered.`,
      metadata: { client_id: client.id }
    })

    // Send notification email to the client if email is provided
    if (client.email) {
      try {
        const { sendClientAddedEmail } = await import("@/lib/email/send")
        sendClientAddedEmail({
          to: client.email,
          clientName: client.name,
          businessName: business.name || "a merchant",
        }).catch(emailErr => console.error("Client email notification send failed:", emailErr))
      } catch (e) {
        console.error("Failed to import/trigger sendClientAddedEmail:", e)
      }
    }

    return NextResponse.json(client)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { error: authErr, business } = await requireBusinessUser(request)
  if (authErr) return authErr

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const filter = searchParams.get("filter") || "all" // all, has_outstanding, overdue
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "name" // name, outstanding_amount, created_at
    const sortOrder = searchParams.get("sortOrder") || "asc"

    const offset = (page - 1) * limit

    const supabase = getSupabaseServiceRoleClient()

    let query = supabase
      .from("clients")
      .select("*")
      .eq("business_id", business.id)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    let { data: clients, error } = await query

    if (error) throw error

    if (!clients) clients = []

    // Map clients with outstanding balance
    let mappedClients = clients.map((client) => {
      const invoiced = Number(client.total_invoiced) || 0
      const paid = Number(client.total_paid) || 0
      const outstanding = Math.max(0, invoiced - paid)
      return {
        ...client,
        outstanding_amount: outstanding,
      }
    })

    // Apply status filters
    if (filter === "has_outstanding" || filter === "overdue") {
      mappedClients = mappedClients.filter((c) => c.outstanding_amount > 0)
    }

    // Sort items
    mappedClients.sort((a, b) => {
      let comparison = 0
      if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "")
      } else if (sortBy === "outstanding_amount") {
        comparison = a.outstanding_amount - b.outstanding_amount
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    // Calculate total summary sums across all clients of this business
    let outstandingSum = 0
    let paidSum = 0
    for (const c of clients) {
      const inv = Number(c.total_invoiced) || 0
      const pd = Number(c.total_paid) || 0
      outstandingSum += Math.max(0, inv - pd)
      paidSum += pd
    }

    // Paginate
    const totalCount = mappedClients.length
    const paginatedClients = mappedClients.slice(offset, offset + limit)

    return NextResponse.json({
      clients: paginatedClients,
      totalCount,
      stats: {
        totalClients: clients.length,
        outstandingSum,
        paidSum,
      },
    })
  } catch (err: any) {
    console.error("GET /api/clients error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
