import * as React from "react"

interface ReminderEmailProps {
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  paymentLink: string
  reminderType: "friendly" | "nudge" | "overdue"
  daysOverdue?: number
}

export function ReminderEmail({
  businessName,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  paymentLink,
  reminderType,
  daysOverdue,
}: ReminderEmailProps) {
  // Determine color theme based on reminder urgency level
  let themeColor = "#3b82f6" // default friendly blue
  let headerText = "Upcoming Payment Reminder"
  let bodyNudge = `This is a friendly reminder that invoice ${invoiceNumber} is due soon.`

  if (reminderType === "nudge") {
    themeColor = "#f59e0b" // warm warning amber
    headerText = "Payment Action Required"
    bodyNudge = `Please review invoice ${invoiceNumber} which is due for payment shortly.`
  } else if (reminderType === "overdue") {
    themeColor = "#ef4444" // critical crimson red
    const overdueLabel = daysOverdue ? ` (${daysOverdue} days overdue)` : ""
    headerText = `Invoice Overdue Notice${overdueLabel}`
    bodyNudge = `URGENT: Invoice ${invoiceNumber} is overdue. Please clear this balance immediately.`
  }

  return (
    <div
      style={{
        backgroundColor: "#f4f6f8",
        padding: "30px 15px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "580px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          border: "1px solid #eef2f6",
        }}
      >
        {/* Dynamic Theme Color Stripe */}
        <div style={{ height: "6px", backgroundColor: themeColor }}></div>

        {/* Brand Header */}
        <div style={{ padding: "30px 40px 10px 40px" }}>
          <span style={{ fontSize: "16px", fontWeight: "850", color: "#1e293b", letterSpacing: "-0.5px" }}>
            {businessName}
          </span>
        </div>

        {/* Content Box */}
        <div style={{ padding: "10px 40px 30px 40px" }}>
          <h2
            style={{
              fontSize: "20px",
              color: themeColor,
              margin: "0 0 16px 0",
              fontWeight: "800",
              letterSpacing: "-0.3px",
            }}
          >
            {headerText}
          </h2>
          <p style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600", margin: "0 0 10px 0" }}>
            Hello {clientName},
          </p>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 25px 0", lineHeight: "1.6" }}>
            {bodyNudge} Below are the payment summary details.
          </p>

          {/* Details Grid Box */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "30px",
            }}
          >
            <table style={{ width: "100%", fontSize: "13px", color: "#475569", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Invoice Number</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#0f172a", fontWeight: "700" }}>
                    {invoiceNumber}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Amount Due</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: themeColor, fontWeight: "800", fontSize: "16px" }}>
                    {amount}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Due Date</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#ef4444", fontWeight: "700" }}>
                    {dueDate}
                  </td>
                </tr>
                {reminderType === "overdue" && daysOverdue && (
                  <tr>
                    <td style={{ padding: "6px 0", fontWeight: "600" }}>Days Overdue</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#ef4444", fontWeight: "800" }}>
                      {daysOverdue} Days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Checkout CTA */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: themeColor,
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "700",
                textDecoration: "none",
                padding: "12px 30px",
                borderRadius: "8px",
                boxShadow: `0 4px 10px rgba(0, 0, 0, 0.08)`,
              }}
            >
              PAY OUTSTANDING BALANCE
            </a>
          </div>

          <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.5", margin: "20px 0 0 0" }}>
            If you have already paid this invoice, please disregard this reminder or contact us to verify your transaction.
          </p>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: "#f8fafc", padding: "20px 40px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Automated reminder sent via CollectBot.
          </span>
        </div>
      </div>
    </div>
  )
}
