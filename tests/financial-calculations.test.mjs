import { test, describe } from "node:test"
import assert from "node:assert/strict"

// Pure calculation logic mirroring /api/invoices and reconciliation
function calculateInvoiceTotals(items, discount = 0) {
  let subtotal = 0
  let taxAmount = 0

  const preparedItems = items.map((item, index) => {
    const qty = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const taxRate = Number(item.taxRate) || 0
    const amount = Math.round(qty * rate * 100) / 100
    const taxVal = Math.round(amount * (taxRate / 100) * 100) / 100

    subtotal += amount
    taxAmount += taxVal

    return {
      description: item.description,
      quantity: qty,
      rate,
      amount,
      taxRate,
      taxAmount: taxVal,
      sortOrder: item.sortOrder || index,
    }
  })

  // Avoid IEEE 754 precision artifacts
  subtotal = Math.round(subtotal * 100) / 100
  taxAmount = Math.round(taxAmount * 100) / 100
  const parsedDiscount = Math.round(Number(discount || 0) * 100) / 100
  const total = Math.max(0, Math.round((subtotal + taxAmount - parsedDiscount) * 100) / 100)
  const balanceDue = total

  return {
    subtotal,
    taxAmount,
    discount: parsedDiscount,
    total,
    balanceDue,
    items: preparedItems,
  }
}

function reconcilePayment(invoice, amountPaid) {
  const currentPaid = Number(invoice.amountPaid) || 0
  const parsedPayment = Number(amountPaid) || 0
  const total = Number(invoice.total) || 0

  const newAmountPaid = Math.round((currentPaid + parsedPayment) * 100) / 100
  const newBalanceDue = Math.max(0, Math.round((total - newAmountPaid) * 100) / 100)
  const isFullyPaid = newBalanceDue <= 0.01

  return {
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue,
    status: isFullyPaid ? "paid" : "partial",
    isFullyPaid,
  }
}

describe("CollectBot Financial Engine & Calculation Tests", () => {
  test("Calculates standard GST invoice with multiple line items", () => {
    const items = [
      { description: "Website Development", quantity: 1, rate: 50000, taxRate: 18 },
      { description: "Domain & Hosting Setup", quantity: 1, rate: 5000, taxRate: 18 },
    ]
    const result = calculateInvoiceTotals(items, 2500)

    assert.equal(result.subtotal, 55000)
    assert.equal(result.taxAmount, 9900) // 18% of 50000 (9000) + 18% of 5000 (900)
    assert.equal(result.discount, 2500)
    assert.equal(result.total, 62400) // 55000 + 9900 - 2500
    assert.equal(result.balanceDue, 62400)
  })

  test("Handles zero quantity or zero rate line items gracefully", () => {
    const items = [
      { description: "Complimentary Consultation", quantity: 2, rate: 0, taxRate: 18 },
      { description: "Design Sprint", quantity: 0, rate: 25000, taxRate: 18 },
      { description: "Auditing Service", quantity: 1, rate: 10000, taxRate: 0 },
    ]
    const result = calculateInvoiceTotals(items, 0)

    assert.equal(result.subtotal, 10000)
    assert.equal(result.taxAmount, 0)
    assert.equal(result.total, 10000)
    assert.equal(result.balanceDue, 10000)
  })

  test("Enforces non-negative total even if discount exceeds gross amount", () => {
    const items = [{ description: "Service", quantity: 1, rate: 1000, taxRate: 0 }]
    const result = calculateInvoiceTotals(items, 5000) // Discount ₹5000 > ₹1000

    assert.equal(result.subtotal, 1000)
    assert.equal(result.total, 0)
    assert.equal(result.balanceDue, 0)
  })

  test("Reconciles single full payment correctly", () => {
    const invoice = { total: 10000, amountPaid: 0, balanceDue: 10000, status: "sent" }
    const reconciliation = reconcilePayment(invoice, 10000)

    assert.equal(reconciliation.amountPaid, 10000)
    assert.equal(reconciliation.balanceDue, 0)
    assert.equal(reconciliation.status, "paid")
    assert.equal(reconciliation.isFullyPaid, true)
  })

  test("Reconciles consecutive partial payments accurately", () => {
    let invoice = { total: 15000, amountPaid: 0, balanceDue: 15000, status: "sent" }

    // First instalment: ₹5,000
    let step1 = reconcilePayment(invoice, 5000)
    assert.equal(step1.amountPaid, 5000)
    assert.equal(step1.balanceDue, 10000)
    assert.equal(step1.status, "partial")
    assert.equal(step1.isFullyPaid, false)

    // Second instalment: ₹7,500
    invoice = { ...invoice, amountPaid: step1.amountPaid, balanceDue: step1.balanceDue }
    let step2 = reconcilePayment(invoice, 7500)
    assert.equal(step2.amountPaid, 12500)
    assert.equal(step2.balanceDue, 2500)
    assert.equal(step2.status, "partial")

    // Final instalment: ₹2,500
    invoice = { ...invoice, amountPaid: step2.amountPaid, balanceDue: step2.balanceDue }
    let step3 = reconcilePayment(invoice, 2500)
    assert.equal(step3.amountPaid, 15000)
    assert.equal(step3.balanceDue, 0)
    assert.equal(step3.status, "paid")
    assert.equal(step3.isFullyPaid, true)
  })

  test("Avoids floating point micro-cents discrepancy (0.1 + 0.2)", () => {
    const items = [
      { description: "Item 1", quantity: 1, rate: 0.1, taxRate: 0 },
      { description: "Item 2", quantity: 1, rate: 0.2, taxRate: 0 },
    ]
    const result = calculateInvoiceTotals(items, 0)
    assert.equal(result.total, 0.3)
  })
})

