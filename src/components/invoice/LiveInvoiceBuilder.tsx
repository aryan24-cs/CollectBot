"use client"

import * as React from "react"
import { Check, Sparkles, Building2, QrCode, FileText, Shield } from "lucide-react"

interface LiveInvoiceBuilderProps {
  branding: {
    primary_color: string
    accent_color: string
    font_family: string
    template_style: string
    show_logo: boolean
    show_qr_code: boolean
    show_stamp: boolean
    stamp_url?: string | null
    signature_url?: string | null
    custom_watermark?: string | null
    show_collectbot_badge: boolean
    terms_text?: string | null
    notes_text?: string | null
  }
  businessName?: string
}

export default function LiveInvoiceBuilder({ branding, businessName = "Acme Corp India" }: LiveInvoiceBuilderProps) {
  const {
    primary_color,
    accent_color,
    font_family,
    template_style,
    show_logo,
    show_qr_code,
    show_stamp,
    stamp_url,
    signature_url,
    custom_watermark,
    show_collectbot_badge,
    terms_text,
    notes_text
  } = branding

  return (
    <div 
      style={{ fontFamily: font_family || "Inter" }}
      className="bg-white rounded-2xl border border-[#EEE9E4] p-6 shadow-card text-left space-y-6 text-ink-black relative overflow-hidden transition-all duration-300"
    >
      {/* Optional Watermark Overlay */}
      {custom_watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none text-6xl font-black uppercase transform -rotate-45">
          {custom_watermark}
        </div>
      )}

      {/* Template Header */}
      <div className="flex items-start justify-between border-b border-[#EEE9E4] pb-6">
        <div className="space-y-1.5">
          {show_logo && (
            <div 
              style={{ backgroundColor: `${accent_color}15`, borderColor: `${accent_color}30` }}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm border mb-2"
            >
              <span style={{ color: accent_color }}>{businessName.charAt(0)}</span>
            </div>
          )}
          <h3 style={{ color: primary_color }} className="text-base font-extrabold">{businessName}</h3>
          <p className="text-[10px] text-ink-secondary">Floor 4, Financial District, Mumbai 400001</p>
          <p className="text-[10px] text-ink-secondary">GSTIN: 27AAAAA0000A1Z5</p>
        </div>

        <div className="text-right space-y-1">
          <span 
            style={{ backgroundColor: `${accent_color}15`, color: accent_color }}
            className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full inline-block tracking-wider"
          >
            INVOICE
          </span>
          <p className="text-xs font-mono font-bold text-ink-black mt-1">#INV-2026-089</p>
          <p className="text-[10px] text-ink-secondary">Date: Oct 24, 2026</p>
          <p className="text-[10px] text-ink-secondary">Due: Oct 31, 2026</p>
        </div>
      </div>

      {/* Bill To Info */}
      <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EEE9E4]">
        <div>
          <span className="text-[9px] font-bold uppercase text-ink-muted tracking-wider block">Billed To</span>
          <p className="font-bold text-ink-black mt-0.5">Starlight Innovations Pvt Ltd</p>
          <p className="text-[10px] text-ink-secondary">contact@starlight.in</p>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase text-ink-muted tracking-wider block">Payment Method</span>
          <p className="font-bold text-ink-black mt-0.5">UPI / Razorpay Gateway</p>
          <p className="text-[10px] text-emerald-600 font-bold">Auto-Settlement Enabled</p>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="border border-[#EEE9E4] rounded-xl overflow-hidden text-xs">
        <div style={{ backgroundColor: primary_color }} className="px-3.5 py-2.5 text-white font-bold grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider">
          <span className="col-span-6">Description</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-2 text-right">Rate</span>
          <span className="col-span-2 text-right">Amount</span>
        </div>
        <div className="divide-y divide-[#EEE9E4] text-[11px] bg-white">
          <div className="px-3.5 py-2.5 grid grid-cols-12 gap-2">
            <span className="col-span-6 font-semibold">Monthly Digital Services Retainer</span>
            <span className="col-span-2 text-center">1</span>
            <span className="col-span-2 text-right">₹40,000</span>
            <span className="col-span-2 text-right font-bold">₹40,000</span>
          </div>
          <div className="px-3.5 py-2.5 grid grid-cols-12 gap-2">
            <span className="col-span-6 font-semibold">Custom Software Development</span>
            <span className="col-span-2 text-center">10 hrs</span>
            <span className="col-span-2 text-right">₹1,500</span>
            <span className="col-span-2 text-right font-bold">₹15,000</span>
          </div>
        </div>
      </div>

      {/* Totals Section & Optional QR Code */}
      <div className="flex items-end justify-between pt-2">
        <div>
          {show_qr_code && (
            <div className="bg-[#FAF8F5] border border-[#EEE9E4] p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold text-ink-secondary">
              <QrCode className="w-8 h-8 text-ink-black shrink-0" />
              <div>
                <span className="text-ink-black block">Scan & Pay via UPI</span>
                <span className="text-[9px] text-ink-muted">Google Pay / PhonePe / Paytm</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-44 space-y-1.5 text-xs text-right">
          <div className="flex justify-between text-ink-secondary text-[11px]">
            <span>Subtotal</span>
            <span>₹55,000</span>
          </div>
          <div className="flex justify-between text-ink-secondary text-[11px]">
            <span>GST (18%)</span>
            <span>₹9,900</span>
          </div>
          <div style={{ color: accent_color }} className="flex justify-between font-black text-sm pt-1.5 border-t border-[#EEE9E4]">
            <span>Total Due</span>
            <span>₹64,900</span>
          </div>
        </div>
      </div>

      {/* Footer Notes & Optional Whitelabeling Badge */}
      <div className="pt-4 border-t border-[#EEE9E4] flex items-center justify-between text-[9px] text-ink-muted">
        <div>
          <p className="font-semibold text-ink-secondary">{notes_text || "Thank you for your business!"}</p>
          <p className="text-[9px]">{terms_text || "Terms: Payment due within 7 days."}</p>
        </div>

        {show_collectbot_badge ? (
          <div className="flex items-center gap-1 bg-[#FAF8F5] px-2 py-1 rounded-md border border-[#EEE9E4]">
            <span>Powered by</span>
            <span className="font-bold text-ink-black">CollectBot</span>
          </div>
        ) : (
          <span className="text-emerald-600 font-bold uppercase tracking-wider">Whitelabel Active</span>
        )}
      </div>

    </div>
  )
}
