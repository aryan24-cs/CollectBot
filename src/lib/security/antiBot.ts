/**
 * Anti-Bot & Form Abuse Protection
 * Combines honeypot traps and minimum human interaction time windows.
 */

export interface AntiBotSubmission {
  // Honeypot field (must remain empty for human submissions)
  website_trap?: string | null
  // Form render timestamp (ms) to detect sub-second machine submissions
  rendered_at?: number | string | null
}

export function verifyAntiBot(
  data: AntiBotSubmission,
  minSubmissionTimeMs = 1200 // Machine submissions typically trigger in < 500ms
): { isHuman: boolean; reason?: string } {
  // 1. Honeypot check: If the hidden honeypot field is filled, it's an automated bot
  if (data.website_trap && data.website_trap.trim().length > 0) {
    return { isHuman: false, reason: "Automated submission detected via honeypot trap." }
  }

  // 2. Machine speed check: If timestamp is provided, verify it wasn't submitted in < 1.2s
  if (data.rendered_at) {
    const rendered = Number(data.rendered_at)
    if (!isNaN(rendered) && rendered > 0) {
      const elapsed = Date.now() - rendered
      if (elapsed < minSubmissionTimeMs) {
        return { isHuman: false, reason: "Submission occurred too quickly for human input." }
      }
    }
  }

  return { isHuman: true }
}

