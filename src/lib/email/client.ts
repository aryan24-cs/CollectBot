import nodemailer from "nodemailer"

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com"
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === "true"

if (!smtpUser || !smtpPass) {
  console.warn("SMTP_USER or SMTP_PASS is not defined in environment variables.")
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})
