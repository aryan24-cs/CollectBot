import { transporter } from "./client"
import { InvoiceEmail } from "./templates/InvoiceEmail"
import { ReminderEmail } from "./templates/ReminderEmail"
import { ReceiptEmail } from "./templates/ReceiptEmail"
import { ThankYouEmail } from "./templates/ThankYouEmail"

async function renderHtml(element: React.ReactElement): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server")
  return renderToStaticMarkup(element)
}

// Fallback sender address for testing (SMTP verified sender)
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "CollectBot <billing@yourdomain.com>"

/**
 * Downloads a remote file (e.g., Supabase Storage PDF) to attach to emails.
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

  const html = await renderHtml(InvoiceEmail({ businessName, ...props }))

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    attachments,
  })

  console.log(`Invoice email sent successfully via SMTP to ${to}`)
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

  const html = await renderHtml(ReminderEmail({ reminderType, ...props }))

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })

  console.log(`Reminder email (${reminderType}) sent successfully via SMTP to ${to}`)
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

  const html = await renderHtml(ReceiptEmail({ receiptUrl, ...props }))

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    attachments,
  })

  console.log(`Receipt email sent successfully via SMTP to ${to}`)
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

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlContent,
  })

  console.log(`Owner payment alert email sent successfully via SMTP to ${to}`)
}

export async function sendWelcomeEmail({ to, ownerName }: { to: string; ownerName: string }) {
  const subject = `Welcome to CollectBot — Free Plan Active! 🚀`
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #1a1a1a; max-width: 550px; margin: 0 auto; border: 1px solid #eee9e4; border-radius: 16px; background-color: #FAF8F5;">
      <h2 style="color: #0A0A0A; margin-top: 0; font-family: sans-serif; font-weight: 800; tracking: tight;">Welcome to CollectBot!</h2>
      <p>Hello ${ownerName},</p>
      <p>Thank you for registering your workspace! Your <strong>Free Plan</strong> is now active. You can immediately start creating clients, drafting invoices, and setting up automated reminder routines.</p>
      
      <div style="background-color: #ffffff; border: 1px solid #eee9e4; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: center;">
        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; display: block; margin-bottom: 5px;">Current Assigned Tier</span>
        <span style="font-size: 18px; font-weight: 800; color: #E91E63;">FREE PLAN</span>
      </div>

      <p>Want to unlock WhatsApp automated reminders, premium Razorpay invoice checkouts, custom layouts, and unlimited invoices?</p>
      <p style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 10px rgba(233, 30, 99, 0.2);">Upgrade Your Plan Now</a>
      </p>
      <p>If you have any questions or need onboarding assistance, simply reply to this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee9e4; margin: 20px 0;" />
      <span style="font-size: 10px; color: #9B9B9B;">Sent with care from the CollectBot Team.</span>
    </div>
  `
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlContent,
  })
  console.log(`Welcome email sent successfully to ${to}`)
}

export async function sendClientAddedEmail({ to, clientName, businessName }: { to: string; clientName: string; businessName: string }) {
  const subject = `You have been added as a client of ${businessName} on CollectBot`
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #1a1a1a; max-width: 550px; margin: 0 auto; border: 1px solid #eee9e4; border-radius: 16px; background-color: #FAF8F5;">
      <h2 style="color: #0A0A0A; margin-top: 0; font-weight: 800;">Notification: Client Portal Active</h2>
      <p>Hello ${clientName},</p>
      <p>This email is to notify you that <strong>${businessName}</strong> has registered you as a client on their billing and invoicing system powered by CollectBot.</p>
      <p>Going forward, you will receive invoices, automated payment due reminders, and payment receipts directly to this email address.</p>
      <p>For any billing or transaction inquiries, please reach out directly to <strong>${businessName}</strong>.</p>
      <hr style="border: 0; border-top: 1px solid #eee9e4; margin: 20px 0;" />
      <span style="font-size: 10px; color: #9B9B9B;">Powered by CollectBot.</span>
    </div>
  `
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlContent,
  })
  console.log(`Client added email sent to client ${to} for business ${businessName}`)
}
