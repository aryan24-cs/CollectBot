import { test, describe } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"

function signRazorpayPayload(payloadString, secret) {
  return crypto.createHmac("sha256", secret).update(payloadString).digest("hex")
}

function verifyRazorpaySignature(payloadString, signature, secret) {
  if (!signature || !secret || !payloadString) return false

  const expectedSignature = signRazorpayPayload(payloadString, secret)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    )
  } catch (_) {
    return false
  }
}

// Payment Idempotency Engine
class PaymentIdempotencyTracker {
  constructor() {
    this.processedPaymentIds = new Set()
  }

  processPayment(paymentId, amount, invoice) {
    if (this.processedPaymentIds.has(paymentId)) {
      return { status: "already_processed", credited: false }
    }

    this.processedPaymentIds.add(paymentId)
    const newAmountPaid = (invoice.amountPaid || 0) + amount
    const newBalanceDue = Math.max(0, invoice.total - newAmountPaid)

    return {
      status: "processed",
      credited: true,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
    }
  }
}

describe("CollectBot Webhook Security & Idempotency Tests", () => {
  const SECRET = "rzp_secret_audit_key_2026"

  test("Validates authentic Razorpay webhook signature successfully", () => {
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_xyz123", amount: 500000, notes: { invoice_id: "inv_001" } } },
      },
    })

    const signature = signRazorpayPayload(payload, SECRET)
    const isValid = verifyRazorpaySignature(payload, signature, SECRET)

    assert.equal(isValid, true)
  })

  test("Rejects webhook if payload is tampered with in-transit", () => {
    const authenticPayload = JSON.stringify({ event: "payment.captured", amount: 50000 })
    const signature = signRazorpayPayload(authenticPayload, SECRET)

    const tamperedPayload = JSON.stringify({ event: "payment.captured", amount: 1000 })
    const isValid = verifyRazorpaySignature(tamperedPayload, signature, SECRET)

    assert.equal(isValid, false)
  })

  test("Rejects webhook if signature is forged with wrong secret", () => {
    const payload = JSON.stringify({ event: "payment.captured", id: "pay_999" })
    const forgedSignature = signRazorpayPayload(payload, "wrong_attacker_secret")

    const isValid = verifyRazorpaySignature(payload, forgedSignature, SECRET)
    assert.equal(isValid, false)
  })

  test("Prevents double-crediting when identical webhook delivery is replayed", () => {
    const tracker = new PaymentIdempotencyTracker()
    const invoice = { total: 5000, amountPaid: 0, balanceDue: 5000 }

    // First attempt: Payment successfully logged
    const firstAttempt = tracker.processPayment("pay_unique_101", 5000, invoice)
    assert.equal(firstAttempt.status, "processed")
    assert.equal(firstAttempt.credited, true)
    assert.equal(firstAttempt.balanceDue, 0)

    // Replay attempt: Same payment_id received from network retry
    const replayAttempt = tracker.processPayment("pay_unique_101", 5000, invoice)
    assert.equal(replayAttempt.status, "already_processed")
    assert.equal(replayAttempt.credited, false)
  })
})

