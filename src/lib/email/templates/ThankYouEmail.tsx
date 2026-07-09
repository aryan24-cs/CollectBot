import * as React from "react"

interface ThankYouEmailProps {
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: string
}

export function ThankYouEmail({
  businessName,
  clientName,
  invoiceNumber,
  amount,
}: ThankYouEmailProps) {
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
        {/* Header Success Accent */}
        <div style={{ height: "6px", backgroundColor: "#10b981" }}></div>

        {/* Content Box */}
        <div style={{ padding: "40px" }}>
          <h2
            style={{
              fontSize: "22px",
              color: "#0f172a",
              margin: "0 0 16px 0",
              fontWeight: "800",
              letterSpacing: "-0.5px",
            }}
          >
            Thank You for Your Payment!
          </h2>

          <p style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600", margin: "0 0 10px 0" }}>
            Hello {clientName},
          </p>

          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: "1.6" }}>
            We have processed your payment of <strong>{amount}</strong> for invoice <strong>{invoiceNumber}</strong>. 
            Your transaction is now fully cleared, and the updated record is visible in your account portal.
          </p>

          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 25px 0", lineHeight: "1.6" }}>
            We sincerely appreciate your prompt payment and business partnership with <strong>{businessName}</strong>. 
            Please reach out if you have any questions or require additional assistance.
          </p>

          <div
            style={{
              paddingTop: "20px",
              borderTop: "1px solid #e2e8f0",
              fontSize: "13px",
              color: "#334155",
              fontWeight: "600",
            }}
          >
            Warm regards,
            <br />
            <span style={{ color: "#0f172a", fontWeight: "750", fontSize: "14px" }}>{businessName}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: "#f8fafc", padding: "20px 40px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Receipt generated securely by CollectBot.
          </span>
        </div>
      </div>
    </div>
  )
}
