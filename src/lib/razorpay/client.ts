import Razorpay from "razorpay"

let instance: Razorpay | null = null

export function getRazorpayClient(): Razorpay {
  if (!instance) {
    const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_fallback"
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_fallback"
    instance = new Razorpay({ key_id, key_secret })
  }
  return instance
}

export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop, receiver) {
    const client = getRazorpayClient() as any
    const value = Reflect.get(client, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  }
})

