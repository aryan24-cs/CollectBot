import Link from "next/link"
import { ArrowLeft, Home, FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] flex flex-col justify-center items-center px-6 py-12 selection:bg-[#E91E63] selection:text-white">
      <div className="max-w-md w-full bg-white border border-[#EEE9E4] rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#FDF2F7] border border-[#F8BBD9]/50 flex items-center justify-center text-[#E91E63] mx-auto shadow-sm">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#E91E63]">
            Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
            The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto bg-[#FAF8F5] hover:bg-[#EDE7E1] text-[#1A1A1A] border border-[#EEE9E4] text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

