import * as React from "react"

interface ReceiptEmailProps {
  businessName: string
  clientName: string
  invoiceNumber: string
  amount: string
  paymentDate: string
  paymentMethod: string
  razorpayId: string | null
  receiptUrl: string | null
}

export function ReceiptEmail({
  businessName,
  clientName,
  invoiceNumber,
  amount,
  paymentDate,
  paymentMethod,
  razorpayId,
  receiptUrl,
}: ReceiptEmailProps) {
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
        {/* Header Success Ribbon */}
        <div style={{ height: "6px", backgroundColor: "#10b981" }}></div>

        {/* Brand Header */}
        <div style={{ padding: "30px 40px 10px 40px" }}>
          <span style={{ fontSize: "16px", fontWeight: "850", color: "#1e293b", letterSpacing: "-0.5px" }}>
            {businessName}
          </span>
        </div>

        {/* Content Box */}
        <div style={{ padding: "10px 40px 30px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#d1fae5",
                color: "#10b981",
                fontSize: "24px",
                margin: "0 auto 12px auto",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontSize: "20px",
                color: "#10b981",
                margin: "0",
                fontWeight: "800",
                letterSpacing: "-0.3px",
              }}
            >
              Payment Confirmed
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "6px 0 0 0" }}>
              Thank you for your business! Your payment has been processed.
            </p>
          </div>

          <p style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600", margin: "0 0 10px 0" }}>
            Hello {clientName},
          </p>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 25px 0", lineHeight: "1.6" }}>
            We have successfully received your payment of <strong>{amount}</strong> for invoice <strong>{invoiceNumber}</strong>. 
            Below is your payment summary.
          </p>

          {/* Details Table */}
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
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Amount Paid</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#10b981", fontWeight: "800", fontSize: "15px" }}>
                    {amount}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Payment Date</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#0f172a", fontWeight: "700" }}>
                    {paymentDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", fontWeight: "600" }}>Payment Method</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#0f172a", fontWeight: "700", textTransform: "capitalize" }}>
                    {paymentMethod}
                  </td>
                </tr>
                {razorpayId && (
                  <tr>
                    <td style={{ padding: "6px 0", fontWeight: "600" }}>Transaction ID</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#64748b", fontWeight: "700", fontFamily: "monospace" }}>
                      {razorpayId}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Receipt Download Link */}
          {receiptUrl && (
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "750",
                  textDecoration: "none",
                  padding: "12px 28px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)",
                }}
              >
                DOWNLOAD PDF RECEIPT
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: "#f8fafc", padding: "20px 40px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Payment processed securely by CollectBot.
          </span>
        </div>
      </div>
    </div>
  )
}
