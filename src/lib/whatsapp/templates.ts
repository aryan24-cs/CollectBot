import { sendWhatsAppTemplate } from "./client"

interface InvoiceNotificationParams {
  phone: string
  clientName: string
  invoiceNumber: string
  businessName: string
  amount: string
  dueDate: string
  paymentLink: string
}

interface FriendlyReminderParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  dueDate: string
  paymentLink: string
}

interface NudgeReminderParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  dueDate: string
  paymentLink: string
}

interface DueTodayReminderParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  paymentLink: string
}

interface OverdueReminderParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  daysOverdue: number
  paymentLink: string
}

interface FinalWarningParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  paymentLink: string
}

interface PaymentThankYouParams {
  phone: string
  clientName: string
  amount: string
  businessName: string
  invoiceNumber: string
  date: string
}

interface OwnerPaymentAlertParams {
  phone: string
  ownerName: string
  clientName: string
  amount: string
  invoiceNumber: string
  paymentMethod: string
}

export async function sendInvoiceNotification({
  phone,
  clientName,
  invoiceNumber,
  businessName,
  amount,
  dueDate,
  paymentLink,
}: InvoiceNotificationParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_invoice_sent",
    bodyVariables: [clientName, invoiceNumber, businessName, amount, dueDate, paymentLink],
  })
}

export async function sendFriendlyReminder({
  phone,
  clientName,
  amount,
  businessName,
  dueDate,
  paymentLink,
}: FriendlyReminderParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_reminder_friendly",
    bodyVariables: [clientName, amount, businessName, dueDate, paymentLink],
  })
}

export async function sendNudgeReminder({
  phone,
  clientName,
  amount,
  businessName,
  dueDate,
  paymentLink,
}: NudgeReminderParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_reminder_nudge",
    bodyVariables: [clientName, amount, businessName, dueDate, paymentLink],
  })
}

export async function sendDueTodayReminder({
  phone,
  clientName,
  amount,
  businessName,
  paymentLink,
}: DueTodayReminderParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_reminder_due_today",
    bodyVariables: [clientName, amount, businessName, paymentLink],
  })
}

export async function sendOverdueReminder({
  phone,
  clientName,
  amount,
  businessName,
  daysOverdue,
  paymentLink,
}: OverdueReminderParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_reminder_overdue_3",
    bodyVariables: [clientName, amount, businessName, daysOverdue.toString(), paymentLink],
  })
}

export async function sendFinalWarning({
  phone,
  clientName,
  amount,
  businessName,
  paymentLink,
}: FinalWarningParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_reminder_final",
    bodyVariables: [clientName, amount, businessName, paymentLink],
  })
}

export async function sendPaymentThankYou({
  phone,
  clientName,
  amount,
  businessName,
  invoiceNumber,
  date,
}: PaymentThankYouParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_payment_received",
    bodyVariables: [clientName, amount, businessName, invoiceNumber, date],
  })
}

export async function sendOwnerPaymentAlert({
  phone,
  ownerName,
  clientName,
  amount,
  invoiceNumber,
  paymentMethod,
}: OwnerPaymentAlertParams) {
  return sendWhatsAppTemplate({
    phone,
    templateName: "collectbot_owner_payment_alert",
    bodyVariables: [ownerName, clientName, amount, invoiceNumber, paymentMethod],
  })
}
