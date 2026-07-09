import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { Invoice, Client, Business } from "@/types"

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9.5,
    color: "#334155",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  businessDetails: {
    flexDirection: "column",
    maxWidth: "60%",
  },
  businessName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  titleBlock: {
    textAlign: "right",
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981", // Emerald green for payment receipt success
    marginBottom: 6,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginVertical: 15,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  section: {
    width: "48%",
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 5,
    textTransform: "uppercase",
    tracking: 1,
  },
  boldText: {
    fontWeight: "bold",
    color: "#0f172a",
  },
  receiptBox: {
    backgroundColor: "#ecfdf5", // Emerald light background
    borderColor: "#a7f3d0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginVertical: 20,
    alignItems: "center",
  },
  receiptAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#065f46",
    marginVertical: 4,
  },
  detailsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  label: {
    color: "#64748b",
  },
  value: {
    fontWeight: "bold",
    color: "#334155",
  },
  footer: {
    marginTop: 60,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 15,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
  },
})

interface ReceiptDocumentProps {
  invoice: Invoice
  client: Client
  business: Business
}

export default function ReceiptDocument({ invoice, client, business }: ReceiptDocumentProps) {
  const formattedCurrency = (val: number) => {
    return "INR " + (Number(val) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
  }

  const receiptNumber = "REC-" + invoice.invoice_number.substring(invoice.invoice_number.indexOf("-") + 1)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.businessDetails}>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.address && <Text>{business.address}</Text>}
            <Text>
              {business.city}, {business.state} - {business.pincode}
            </Text>
            {business.email && <Text>Email: {business.email}</Text>}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
            <Text style={{ color: "#64748b" }}>Receipt #: {receiptNumber}</Text>
            <Text style={{ color: "#64748b", marginTop: 2 }}>Date: {invoice.paid_at ? invoice.paid_at.substring(0, 10) : new Date().toISOString().substring(0, 10)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill Details */}
        <View style={styles.grid}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECEIVED FROM:</Text>
            <Text style={styles.boldText}>{client.name}</Text>
            {client.company_name && <Text>{client.company_name}</Text>}
            {client.address && <Text style={{ color: "#475569", marginTop: 2 }}>{client.address}</Text>}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BUSINESS DETAILS:</Text>
            <Text style={styles.boldText}>{business.name}</Text>
            {business.gstin && <Text>GSTIN: {business.gstin}</Text>}
            {business.phone && <Text>Phone: {business.phone}</Text>}
          </View>
        </View>

        {/* Highlight box */}
        <View style={styles.receiptBox}>
          <Text style={{ color: "#047857", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Amount Paid In Full</Text>
          <Text style={styles.receiptAmount}>{formattedCurrency(Number(invoice.total))}</Text>
          <Text style={{ color: "#065f46", fontSize: 9 }}>Thank you for your prompt payment!</Text>
        </View>

        {/* Transaction details ledger */}
        <View style={styles.detailsBox}>
          <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Transaction Details</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.label}>Invoice Date:</Text>
            <Text style={styles.value}>{invoice.issue_date}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.label}>Payment Clearing Date:</Text>
            <Text style={styles.value}>{invoice.paid_at ? invoice.paid_at.substring(0, 10) : "N/A"}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={[styles.value, { textTransform: "uppercase" }]}>Online Checkout</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.label}>Transaction Status:</Text>
            <Text style={[styles.value, { color: "#10b981" }]}>SUCCESS</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Receipt generated securely via CollectBot checkout shielding systems.</Text>
          <Text style={{ marginTop: 2, color: "#cbd5e1" }}>If you have billing inquiries, please contact {business.email || business.name}.</Text>
        </View>
      </Page>
    </Document>
  )
}
