import type { NextConfig } from "next";

// Cho phep trinh duyet goi Supabase (REST/Realtime) neu co cau hinh
const sbHost = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : ""; } catch { return ""; } })();
const connectSrc = ["'self'", ...(sbHost ? [`https://${sbHost}`, `wss://${sbHost}`] : [])].join(" ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline'",
      // Anh san pham co the la link tu do (Shopee CDN...) nen mo https:
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const config: NextConfig = {
  // Docker build dat BUILD_STANDALONE=1 -> image nho; Vercel de trong.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }, { pathname: "/uploads/**" }],
    deviceSizes: [360, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 128, 256, 384],
  },
  serverExternalPackages: ["postgres", "sharp"],
  experimental: { optimizePackageImports: ["lucide-react", "motion"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
