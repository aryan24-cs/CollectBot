import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { Invoice, Client, Business, InvoiceItem } from "@/types"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    color: "#334155",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
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
  invoiceTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563eb",
    textAlign: "right",
    marginBottom: 6,
  },
  invoiceMeta: {
    textAlign: "right",
    lineHeight: 1.4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginVertical: 12,
  },
  billTo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    tracking: 1,
  },
  clientName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  // Table
  table: {
    width: "100%",
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  colNo: { width: "8%", paddingLeft: 4 },
  colDesc: { width: "42%" },
  colQty: { width: "10%", textAlign: "center" },
  colRate: { width: "15%", textAlign: "right" },
  colTax: { width: "10%", textAlign: "right" },
  colAmt: { width: "15%", textAlign: "right", paddingRight: 4 },
  
  // Summary
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  summaryBlock: {
    width: "35%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: "bold",
    padding: 6,
    borderRadius: 4,
    marginTop: 5,
  },
  // Lower Details
  lowerSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  paymentDetails: {
    width: "55%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesBlock: {
    width: "40%",
  },
  notesTitle: {
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
  },
  footer: {
    marginTop: 35,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 7.5,
  },
})

interface InvoiceDocumentProps {
  invoice: Invoice
  client: Client
  items: InvoiceItem[]
  business: Business
}

export default function InvoiceDocument({ invoice, client, items, business }: InvoiceDocumentProps) {
  const formattedCurrency = (val: number) => {
    return "INR " + (Number(val) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
  }

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
            {business.phone && <Text>Phone: {business.phone}</Text>}
            {business.email && <Text>Email: {business.email}</Text>}
            {business.gstin && <Text style={{ marginTop: 4, fontWeight: "bold" }}>GSTIN: {business.gstin}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceMeta}>
              <Text>
                <Text style={{ color: "#64748b" }}>Invoice #: </Text>
                {invoice.invoice_number}
              </Text>
              <Text>
                <Text style={{ color: "#64748b" }}>Date: </Text>
                {invoice.issue_date}
              </Text>
              <Text>
                <Text style={{ color: "#64748b" }}>Due Date: </Text>
                {invoice.due_date}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionTitle}>BILL TO:</Text>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.company_name && <Text>{client.company_name}</Text>}
          {client.address && <Text style={{ color: "#475569", marginTop: 2 }}>{client.address}</Text>}
          {client.phone && <Text style={{ marginTop: 2 }}>Phone: {client.phone}</Text>}
          {client.gstin && <Text style={{ marginTop: 2, fontWeight: "bold" }}>GSTIN: {client.gstin}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colTax}>GST</Text>
            <Text style={styles.colAmt}>Amount</Text>
          </View>

          {items.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{Number(item.quantity)}</Text>
              <Text style={styles.colRate}>{formattedCurrency(Number(item.rate))}</Text>
              <Text style={styles.colTax}>{Number(item.tax_rate)}%</Text>
              <Text style={styles.colAmt}>{formattedCurrency(Number(item.amount))}</Text>
            </View>
          ))}
        </View>

        {/* Summary math */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryRow}>
              <Text style={{ color: "#64748b" }}>Subtotal:</Text>
              <Text>{formattedCurrency(Number(invoice.subtotal))}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ color: "#64748b" }}>Tax (GST):</Text>
              <Text>{formattedCurrency(Number(invoice.tax_amount))}</Text>
            </View>
            {Number(invoice.discount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={{ color: "#e11d48" }}>Discount:</Text>
                <Text style={{ color: "#e11d48" }}>-{formattedCurrency(Number(invoice.discount))}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>TOTAL:</Text>
              <Text>{formattedCurrency(Number(invoice.total))}</Text>
            </View>
          </View>
        </View>

        {/* Lower Notes & Bank details */}
        <View style={styles.lowerSection}>
          <View style={styles.paymentDetails}>
            <Text style={styles.sectionTitle}>PAYMENT INSTRUCTIONS</Text>
            {business.upi_id && (
              <Text style={{ marginTop: 2 }}>
                <Text style={{ color: "#64748b" }}>UPI ID: </Text>
                <Text style={{ fontWeight: "bold" }}>{business.upi_id}</Text>
              </Text>
            )}
            {business.bank_name && (
              <View style={{ marginTop: 4 }}>
                <Text>
                  <Text style={{ color: "#64748b" }}>Bank Name: </Text>
                  {business.bank_name}
                </Text>
                <Text>
                  <Text style={{ color: "#64748b" }}>Account Number: </Text>
                  {business.account_number}
                </Text>
                <Text>
                  <Text style={{ color: "#64748b" }}>IFSC Code: </Text>
                  {business.ifsc_code}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.notesBlock}>
            <Text style={styles.notesTitle}>NOTES / TERMS</Text>
            {invoice.notes && <Text style={{ color: "#64748b", marginBottom: 4 }}>{invoice.notes}</Text>}
            {invoice.terms && (
              <Text style={{ color: "#94a3b8", fontSize: 7, lineHeight: 1.2 }}>
                T&C: {invoice.terms}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text style={{ marginTop: 2, color: "#cbd5e1" }}>
            Generated Securely via CollectBot — Automated Invoice Tracking System
          </Text>
        </View>
      </Page>
    </Document>
  )
}
