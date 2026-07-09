export function trackEvent(
  eventName:
    | "user_signed_up"
    | "invoice_created"
    | "invoice_sent"
    | "payment_received"
    | "reminder_sent"
    | "plan_upgraded"
    | "feature_used",
  metadata: any = {}
) {
  // 1. Dev Console Logging
  console.log(`[Analytics Event: ${eventName}]`, metadata)

  // 2. PostHog Client Integration (Optional/Scalable)
  try {
    if (typeof window !== "undefined") {
      const posthog = (window as any).posthog
      if (posthog && typeof posthog.capture === "function") {
        posthog.capture(eventName, metadata)
      }
    }
  } catch (err) {
    console.error("Failed to capture PostHog client event:", err)
  }
}
