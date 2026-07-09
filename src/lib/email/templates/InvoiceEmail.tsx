import * as React from "react"

interface InvoiceEmailProps {
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
}

export function InvoiceEmail({
  businessName,
  businessLogo,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  paymentLink,
  items = [],
  businessPhone,
  businessEmail,
}: InvoiceEmailProps) {
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
        {/* Header Ribbon Accent */}
        <div style={{ height: "6px", background: "linear-gradient(90deg, #6366f1, #3b82f6)" }}></div>

        {/* Brand & Logo Header */}
        <div style={{ padding: "30px 40px 20px 40px", borderBottom: "1px solid #f1f5f9" }}>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td>
                  {businessLogo ? (
                    <img
                      src={businessLogo}
                      alt={businessName}
                      style={{ maxHeight: "40px", maxWidth: "160px", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.5px" }}>
                      {businessName}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#6366f1",
                      backgroundColor: "#e0e7ff",
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    New Invoice
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Area */}
        <div style={{ padding: "30px 40px" }}>
          <h2 style={{ fontSize: "18px", color: "#1e293b", margin: "0 0 10px 0", fontWeight: "700" }}>
            Hello {clientName},
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 25px 0", lineHeight: "1.6" }}>
            You have received a new invoice <strong>{invoiceNumber}</strong> from <strong>{businessName}</strong>. 
            A summary of the invoice and its line items is detailed below.
          </p>

          {/* Amount Showcase Card */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", letterSpacing: "1px" }}>
              Amount Due
            </span>
            <div style={{ fontSize: "36px", fontWeight: "800", color: "#0f172a", margin: "6px 0" }}>
              {amount}
            </div>
            <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>
              Due Date: {dueDate}
            </span>
          </div>

          {/* Call to Action Button */}
          <div style={{ textAlign: "center", marginBottom: "35px" }}>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "700",
                textDecoration: "none",
                padding: "14px 32px",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
              }}
            >
              PAY INVOICE NOW
            </a>
          </div>

          {/* Invoice Items Table */}
          <h3 style={{ fontSize: "13px", color: "#475569", textTransform: "uppercase", margin: "0 0 12px 0", fontWeight: "700", letterSpacing: "0.5px" }}>
            Invoice Breakdown
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ textAlign: "left", padding: "8px 0", fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>Description</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 0", fontSize: "13px", color: "#334155" }}>{item.description}</td>
                  <td style={{ padding: "10px 0", fontSize: "13px", color: "#0f172a", fontWeight: "600", textAlign: "right" }}>
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Contacts footer */}
          <div
            style={{
              paddingTop: "20px",
              borderTop: "1px dashed #e2e8f0",
              fontSize: "12px",
              color: "#64748b",
              lineHeight: "1.5",
            }}
          >
            <strong>Questions? Contact {businessName} directly:</strong>
            <br />
            {businessPhone && <span>📞 {businessPhone} &nbsp;</span>}
            {businessEmail && <span>✉️ {businessEmail}</span>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: "#f8fafc", padding: "20px 40px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Sent securely via CollectBot. Please do not reply directly to this email.
          </span>
        </div>
      </div>
    </div>
  )
}
