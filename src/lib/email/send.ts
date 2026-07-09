import { resend } from "./client"
import { InvoiceEmail } from "./templates/InvoiceEmail"
import { ReminderEmail } from "./templates/ReminderEmail"
import { ReceiptEmail } from "./templates/ReceiptEmail"
import { ThankYouEmail } from "./templates/ThankYouEmail"

// Fallback sender address for testing (Resend Sandbox)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "CollectBot <onboarding@resend.dev>"

/**
 * Downloads a remote file (e.g., Supabase Storage PDF) to attach to Resend emails.
 */
async function getAttachmentBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    console.error(`Failed to download attachment from URL: ${url}`, err)
    return null
  }
}

interface SendInvoiceEmailParams {
  to: string
  businessName: string
  businessLogo: string | null
  clientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  paymentLink: string
  items: { description: string; amount: string }[]
  businessPhone: string
  businessEmail: string
  pdfUrl?: string | null
}

export async function sendInvoiceEmail({
  to,
  businessName,
  pdfUrl,
  ...props
}: SendInvoiceEmailParams) {
  const subject = `Invoice ${props.invoiceNumber} from ${businessName} — ${props.amount} due ${props.dueDate}`
  
  const attachments: any[] = []
  if (pdfUrl) {
    const buffer = await getAttachmentBuffer(pdfUrl)
    if (buffer) {
      attachments.push({
        filename: `${props.invoiceNumber}.pdf`,
        content: buffer,
      })
    }
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react: InvoiceEmail({ businessName, ...props }),
    attachments,
  })

  if (error) {
    throw new Error(`Resend sendInvoiceEmail failed: ${error.message}`)
  }

  console.log(`Invoice email sent successfully to ${to} (ID: ${data?.id})`)
}

interface SendReminderEmailParams {
  to: string
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  paymentLink: string
  reminderType: "friendly" | "nudge" | "overdue"
  daysOverdue?: number
}

export async function sendReminderEmail({
  to,
  reminderType,
  ...props
}: SendReminderEmailParams) {
  let subject = `Friendly reminder: Invoice ${props.invoiceNumber} due ${props.dueDate}`
  if (reminderType === "nudge") {
    subject = `Payment due tomorrow: ${props.amount} — ${props.invoiceNumber}`
  } else if (reminderType === "overdue") {
    const daysLabel = props.daysOverdue ? `${props.daysOverdue} days ` : ""
    subject = `URGENT: Invoice ${props.invoiceNumber} is ${daysLabel}overdue`
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react: ReminderEmail({ reminderType, ...props }),
  })

  if (error) {
    throw new Error(`Resend sendReminderEmail failed: ${error.message}`)
  }

  console.log(`Reminder email (${reminderType}) sent successfully to ${to} (ID: ${data?.id})`)
}

interface SendReceiptEmailParams {
  to: string
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: string
  paymentDate: string
  paymentMethod: string
  razorpayId: string | null
  receiptUrl: string | null
}

export async function sendReceiptEmail({
  to,
  receiptUrl,
  ...props
}: SendReceiptEmailParams) {
  const subject = `Payment confirmed: ${props.amount} received for ${props.invoiceNumber}`

  const attachments: any[] = []
  if (receiptUrl) {
    const buffer = await getAttachmentBuffer(receiptUrl)
    if (buffer) {
      attachments.push({
        filename: `Receipt-${props.invoiceNumber}.pdf`,
        content: buffer,
      })
    }
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react: ReceiptEmail({ receiptUrl, ...props }),
    attachments,
  })

  if (error) {
    throw new Error(`Resend sendReceiptEmail failed: ${error.message}`)
  }

  console.log(`Receipt email sent successfully to ${to} (ID: ${data?.id})`)
}

interface SendOwnerPaymentAlertParams {
  to: string
  ownerName: string
  clientName: string
  amount: string
  invoiceNumber: string
  paymentMethod: string
}

export async function sendOwnerPaymentAlert({
  to,
  ownerName,
  clientName,
  amount,
  invoiceNumber,
  paymentMethod,
}: SendOwnerPaymentAlertParams) {
  const subject = `💰 Payment Received: ${amount} from ${clientName}`
  
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #10b981; margin-top: 0;">💰 Payment Confirmed!</h2>
      <p>Hello ${ownerName},</p>
      <p>Your business has received a payment of <strong>${amount}</strong> from <strong>${clientName}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b;">Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">${amount}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b;">Payment Method</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; text-transform: capitalize;">${paymentMethod}</td>
        </tr>
      </table>
      <p>The invoice status has been updated to paid and the ledger is updated.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <span style="font-size: 11px; color: #94a3b8;">Sent automatically via CollectBot.</span>
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlContent,
  })

  if (error) {
    throw new Error(`Resend sendOwnerPaymentAlert failed: ${error.message}`)
  }

  console.log(`Owner payment alert email sent successfully to ${to} (ID: ${data?.id})`)
}
