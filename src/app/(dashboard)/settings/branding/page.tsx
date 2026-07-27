"use client"

import * as React from "react"
import { 
  Palette, 
  Check, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  Sliders,
  Image as ImageIcon,
  Building
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LiveInvoiceBuilder from "@/components/invoice/LiveInvoiceBuilder"

export default function BrandingSettingsPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const [primaryColor, setPrimaryColor] = React.useState("#1A1A1A")
  const [accentColor, setAccentColor] = React.useState("#E91E63")
  const [fontFamily, setFontFamily] = React.useState("Inter")
  const [templateStyle, setTemplateStyle] = React.useState("modern")
  const [showLogo, setShowLogo] = React.useState(true)
  const [showQrCode, setShowQrCode] = React.useState(true)
  const [showCollectbotBadge, setShowCollectbotBadge] = React.useState(true)
  const [customWatermark, setCustomWatermark] = React.useState("")
  const [termsText, setTermsText] = React.useState("Payment is due within 7 days.")
  const [notesText, setNotesText] = React.useState("Thank you for your business!")

  const loadBranding = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/settings/branding")
      if (res.ok) {
        const data = await res.json()
        const b = data.branding || {}
        setPrimaryColor(b.primary_color || "#1A1A1A")
        setAccentColor(b.accent_color || "#E91E63")
        setFontFamily(b.font_family || "Inter")
        setTemplateStyle(b.template_style || "modern")
        setShowLogo(b.show_logo !== false)
        setShowQrCode(b.show_qr_code !== false)
        setShowCollectbotBadge(b.show_collectbot_badge !== false)
        setCustomWatermark(b.custom_watermark || "")
        setTermsText(b.terms_text || "Payment is due within 7 days.")
        setNotesText(b.notes_text || "Thank you for your business!")
      }
    } catch (err: any) {
      toast.error("Failed to load branding settings.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadBranding()
  }, [])

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primaryColor,
          accent_color: accentColor,
          font_family: fontFamily,
          template_style: templateStyle,
          show_logo: showLogo,
          show_qr_code: showQrCode,
          show_collectbot_badge: showCollectbotBadge,
          custom_watermark: customWatermark,
          terms_text: termsText,
          notes_text: notesText
        })
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || "Failed to save branding settings.")
      }

      toast.success("Invoice branding and whitelabel preferences saved!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-[#EEE9E4]">
        <Loader2 className="w-7 h-7 text-[#E91E63] animate-spin" />
        <span className="text-xs font-bold text-ink-secondary">Loading custom invoice designer...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-black">Invoice Designer & Whitelabel Branding</h1>
        <p className="text-ink-secondary text-xs mt-1">Customize brand colors, template layouts, watermarks, and remove CollectBot branding for your clients.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Controls Form Panel */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-white border-[#EEE9E4] shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-[#EEE9E4]/60 bg-[#FAF8F5]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-extrabold text-ink-black">Theme & Color Options</CardTitle>
                  <CardDescription className="text-[11px] text-ink-secondary">Pick primary, accent hex colors, and font styles.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <form onSubmit={handleSaveBranding} className="space-y-5">
                
                {/* Template Preset Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-primary">Template Presets</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "modern", label: "Modern" },
                      { id: "classic", label: "Classic" },
                      { id: "minimal", label: "Minimal" },
                      { id: "corporate", label: "Corporate" },
                      { id: "premium", label: "Premium" }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateStyle(t.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                          templateStyle === t.id 
                            ? "bg-[#1A1A1A] text-white border-transparent shadow-sm" 
                            : "bg-[#FAF8F5] border-[#EEE9E4] text-ink-secondary hover:text-ink-black"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-primary">Primary Header Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-[#EEE9E4] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-primary">Accent Highlight Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-[#EEE9E4] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Whitelabel & Visibility Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-[#EEE9E4]/60">
                  <label className="text-xs font-bold text-ink-primary">Whitelabel & Elements</label>
                  
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#EEE9E4] text-xs font-semibold text-ink-black cursor-pointer">
                    <span>Remove "Powered by CollectBot" Branding</span>
                    <input
                      type="checkbox"
                      checked={!showCollectbotBadge}
                      onChange={(e) => setShowCollectbotBadge(!e.target.checked)}
                      className="rounded text-[#E91E63] focus:ring-[#E91E63]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#EEE9E4] text-xs font-semibold text-ink-black cursor-pointer">
                    <span>Display Dynamic UPI QR Code on Invoices</span>
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={(e) => setShowQrCode(e.target.checked)}
                      className="rounded text-[#E91E63] focus:ring-[#E91E63]"
                    />
                  </label>
                </div>

                {/* Custom Watermark Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-primary">Custom Background Watermark (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ORIGINAL INVOICE or PAID"
                    value={customWatermark}
                    onChange={(e) => setCustomWatermark(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2 text-xs font-semibold"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-7 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
                    <span>Save Theme Settings</span>
                  </button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-6 space-y-2 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-ink-primary flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#E91E63]" />
              Live PDF & Invoice Preview
            </span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Realtime Sync</span>
          </div>

          <LiveInvoiceBuilder 
            branding={{
              primary_color: primaryColor,
              accent_color: accentColor,
              font_family: fontFamily,
              template_style: templateStyle,
              show_logo: showLogo,
              show_qr_code: showQrCode,
              show_stamp: false,
              show_collectbot_badge: showCollectbotBadge,
              custom_watermark: customWatermark,
              terms_text: termsText,
              notes_text: notesText
            }} 
          />
        </div>

      </div>
    </div>
  )
}
