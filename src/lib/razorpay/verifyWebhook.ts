import crypto from "crypto"

interface VerifyWebhookSignatureParams {
  body: string
  signature: string
  secret: string
}

export function verifyWebhookSignature({
  body,
  signature,
  secret,
}: VerifyWebhookSignatureParams): boolean {
  if (!signature || !secret) return false

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  try {
    const signatureBuffer = Buffer.from(signature, "hex") // Razorpay webhook signature is a hex string
    const expectedBuffer = Buffer.from(expectedSignature, "hex")

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return false
  }
}
