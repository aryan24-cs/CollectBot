interface SendWhatsAppTemplateParams {
  phone: string
  templateName: string
  bodyVariables: string[]
  headerVariables?: string[]
  buttonVariables?: string[]
}

/**
 * Sends a WhatsApp message using Interakt's Template API.
 */
export async function sendWhatsAppTemplate({
  phone,
  templateName,
  bodyVariables,
  headerVariables,
  buttonVariables,
}: SendWhatsAppTemplateParams): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.INTERAKT_API_KEY
    if (!apiKey) {
      console.warn("INTERAKT_API_KEY is not defined in environment variables.")
      return { success: false, error: "Interakt API key is missing." }
    }

    // Format phone: strip non-digits, keep last 10 digits for Indian standard
    const digitsOnly = phone.replace(/\D/g, "")
    const cleanedPhone = digitsOnly.slice(-10)
    if (cleanedPhone.length !== 10) {
      const errorMsg = `Invalid phone number format: ${phone}. Expected 10 digits.`
      console.error(errorMsg)
      return { success: false, error: errorMsg }
    }

    const basicAuth = Buffer.from(`${apiKey}:`).toString("base64")
    const url = "https://api.interakt.ai/v1/public/message/"

    // Map button variables to Interakt format {"0": ["val1", "val2"]}
    const buttonValues: Record<string, string[]> = {}
    if (buttonVariables && buttonVariables.length > 0) {
      buttonVariables.forEach((val, idx) => {
        buttonValues[idx.toString()] = [val]
      })
    }

    const payload = {
      countryCode: "+91",
      phoneNumber: cleanedPhone,
      type: "Template",
      template: {
        name: templateName,
        languageCode: "en",
        bodyValues: bodyVariables,
        ...(headerVariables && headerVariables.length > 0 ? { headerValues: headerVariables } : {}),
        ...(buttonVariables && buttonVariables.length > 0 ? { buttonValues } : {}),
      },
    }

    const makeRequest = async (retries = 1): Promise<Response> => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 429 && retries > 0) {
        console.warn("Interakt API rate limit reached. Retrying in 1 second...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return makeRequest(retries - 1)
      }

      return res
    }

    const response = await makeRequest()

    if (!response.ok) {
      const errorText = await response.text()
      const errorMsg = `Interakt API error (${response.status}): ${errorText}`
      console.error(errorMsg)
      return { success: false, error: errorMsg }
    }

    const result = await response.json()
    console.log(`WhatsApp template "${templateName}" sent successfully to +91${cleanedPhone}`, result)
    return { success: true }
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error occurred while sending WhatsApp template."
    console.error("WhatsApp API integration failed:", error)
    return { success: false, error: errorMsg }
  }
}
