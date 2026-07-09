import { razorpay } from "./client"

interface CreatePaymentLinkParams {
  invoiceId: string
  invoiceNumber: string
  amount: number       // in rupees
  clientName: string
  clientEmail: string | null
  clientPhone: string
  businessName: string
  businessId: string
  dueDate: string
}

export async function createPaymentLink({
  invoiceId,
  invoiceNumber,
  amount,
  clientName,
  clientEmail,
  clientPhone,
  businessName,
  businessId,
  dueDate,
}: CreatePaymentLinkParams): Promise<{ url: string; id: string }> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  // Convert amount to paise (must be integer)
  const amountInPaise = Math.round(amount * 100)

  // Calculate expiration date (due_date + 30 days) in Unix timestamp (seconds)
  const due = new Date(dueDate)
  const expireDate = new Date(due.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expireBy = Math.floor(expireDate.getTime() / 1000)

  // Format customer object. Phone must include country code (e.g. +91) for Indian numbers or be a valid contact
  const customer: { name: string; contact: string; email?: string } = {
    name: clientName,
    contact: clientPhone.startsWith("+") ? clientPhone : `+91${clientPhone.replace(/\D/g, "")}`,
  }
  
  if (clientEmail) {
    customer.email = clientEmail
  }

  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `Invoice ${invoiceNumber} from ${businessName}`,
      customer,
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        invoice_id: invoiceId,
        business_id: businessId,
      },
      callback_url: `${APP_URL}/pay/${invoiceId}/success`,
      callback_method: "get",
      expire_by: expireBy,
    })

    return {
      url: paymentLink.short_url,
      id: paymentLink.id,
    }
  } catch (error: any) {
    console.error("Razorpay payment link creation failed:", error)
    throw new Error(error.description || error.message || "Failed to create Razorpay payment link")
  }
}
