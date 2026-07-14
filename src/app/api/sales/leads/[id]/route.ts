import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and SALES can edit leads
  if (role !== "OWNER" && role !== "SALES") {
    return NextResponse.json({ error: "Access denied: Sales CRM scope only." }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, company, source, value, assigned_to, status, notes } = body

    const adminDb = getSupabaseServiceRoleClient()

    // Verify lead belongs to business
    const { data: existingLead, error: leadError } = await adminDb
      .from("sales_leads")
      .select("id, status")
      .eq("id", id)
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .maybeSingle()

    if (!existingLead) {
      return NextResponse.json({ error: "CRM lead not found." }, { status: 404 })
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email || null
    if (phone !== undefined) updates.phone = phone || null
    if (company !== undefined) updates.company = company || null
    if (source !== undefined) updates.source = source
    if (value !== undefined) updates.value = value ? parseFloat(value) : 0.00
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null
    if (status !== undefined && ["new", "qualified", "contacted", "proposal_sent", "negotiation", "won", "lost"].includes(status)) {
      updates.status = status
    }

    updates.updated_at = new Date().toISOString()
    updates.updated_by = user.id

    const { data: lead, error: updateError } = await adminDb
      .from("sales_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // If stage/status changed, log to pipeline history
    if (status && status !== existingLead.status) {
      await adminDb.from("sales_pipeline").insert({
        business_id: business.id,
        lead_id: id,
        stage: status,
        notes: notes || `Lead moved to stage: ${status}.`,
        created_by: user.id
      })

      // Log general activity
      await adminDb.from("activity_logs").insert({
        business_id: business.id,
        type: "lead_stage_updated",
        description: `Lead "${lead.name}" stage updated to "${status}".`,
        created_by: user.id
      })
    }

    // Add note if content is supplied
    if (notes && notes.trim().length > 0) {
      await adminDb.from("sales_notes").insert({
        business_id: business.id,
        lead_id: id,
        content: notes.trim(),
        created_by: user.id
      })
    }

    return NextResponse.json({ success: true, lead })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update CRM lead." }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and SALES can edit leads
  if (role !== "OWNER" && role !== "SALES") {
    return NextResponse.json({ error: "Access denied: Sales CRM scope only." }, { status: 403 })
  }

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Verify lead belongs to business
    const { data: lead, error: leadError } = await adminDb
      .from("sales_leads")
      .select("id, name")
      .eq("id", id)
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .maybeSingle()

    if (!lead) {
      return NextResponse.json({ error: "CRM lead not found." }, { status: 404 })
    }

    // Soft delete lead
    const { error: deleteError } = await adminDb
      .from("sales_leads")
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "lead_deleted",
      description: `Soft deleted CRM lead "${lead.name}".`,
      created_by: user.id
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete CRM lead." }, { status: 500 })
  }
}
