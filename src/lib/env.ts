const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const optionalEnvVars = [
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
  const missingRequired: string[] = []
  const missingOptional: string[] = []

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missingRequired.push(key)
    }
  })

  optionalEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missingOptional.push(key)
    }
  })

  if (missingRequired.length > 0) {
    const errorMsg = `⚠️ WARNING: Required core environment variables are missing:\n${missingRequired.join("\n")}\n\nFalling back to configured project defaults.`
    console.error(errorMsg)
  } else {
    console.log("✅ Core Launch Readiness: Supabase environment variables validated successfully.")
  }

  if (missingOptional.length > 0) {
    console.warn(`ℹ️ Optional provider services not configured: ${missingOptional.join(", ")}. Related features will run in fallback mode.`)
  }
}
