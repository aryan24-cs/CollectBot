const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "INTERAKT_API_KEY",
  "CRON_SECRET",
]

export function validateEnv() {
  const missing: string[] = []

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    const errorMsg = `⚠️ CRITICAL LAUNCH FAILURE: The following required environment variables are missing:\n${missing.join("\n")}\n\nPlease check your .env.local configurations.`
    console.error(errorMsg)
    
    // Do not throw build-halting errors during production build compilation
    const isBuildPhase = process.env.PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-production-build"
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error(errorMsg)
    } else if (isBuildPhase) {
      console.warn("⚠️ Warning: Continuing build despite missing required env variables (build phase dynamic bypass).")
    }
  } else {
    console.log("✅ Launch Readiness: Environment variables validated successfully.")
  }
}
