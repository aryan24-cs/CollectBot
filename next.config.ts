import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.supabase.co https://img.logo.dev; connect-src 'self' https://*.supabase.co https://api.razorpay.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://api.razorpay.com https://*.razorpay.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
