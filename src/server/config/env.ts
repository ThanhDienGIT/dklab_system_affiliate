import { z } from "zod";

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optStr = z.preprocess(emptyToUndef, z.string().optional());

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET phải ≥ 32 ký tự"),
  PII_ENCRYPTION_KEY: z.string().min(1, "Thiếu PII_ENCRYPTION_KEY"),
  APP_URL: z.preprocess(emptyToUndef, z.string().url().default("http://localhost:3000")),
  SEED_ADMIN_EMAIL: z.preprocess(emptyToUndef, z.string().email().default("admin@eleonore.vn")),
  SEED_ADMIN_PASSWORD: z.preprocess(emptyToUndef, z.string().min(8).default("Eleonore@2026")),
  GOOGLE_CLIENT_ID: optStr,
  GOOGLE_CLIENT_SECRET: optStr,
  GEMINI_API_KEY: optStr,
  /** Tim trang tham khao cho blog AI: dung Tavily (TAVILY_API_KEY) hoac Google Programmable Search (GOOGLE_CSE_KEY + GOOGLE_CSE_CX) */
  TAVILY_API_KEY: optStr,
  GOOGLE_CSE_KEY: optStr,
  GOOGLE_CSE_CX: optStr,
  /** Gui email xac thuc: brevo | resend | gmail. Bo trong = tu chon theo khoa nao co. */
  EMAIL_PROVIDER: z.preprocess(emptyToUndef, z.enum(["brevo", "resend", "gmail"]).optional()),
  BREVO_API_KEY: optStr,
  RESEND_API_KEY: optStr,
  GMAIL_USER: optStr,
  GMAIL_APP_PASSWORD: optStr,
  MAIL_FROM: optStr,
  MAIL_FROM_NAME: z.preprocess(emptyToUndef, z.string().default("Éleonore")),
  /** "true" = phai xac thuc email moi dang nhap duoc bang mat khau */
  REQUIRE_VERIFIED_EMAIL: z.preprocess(emptyToUndef, z.enum(["true", "false"]).default("false")),
  /** Gioi han toc do dung chung giua cac instance Vercel (https://upstash.com - free). Khong co -> dung bo nho tung instance */
  UPSTASH_REDIS_REST_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optStr,
  /** Tran so lan goi Gemini cho tim kiem moi gio (toan he thong) - het tran thi tu dong dung bo loc luat */
  LLM_SEARCH_HOURLY_CAP: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).default(600)),
  GEMINI_MODEL: z.preprocess(emptyToUndef, z.string().default("gemini-2.5-flash")),
  /** Ket noi truc tiep cho migration (Supabase: Session pooler :5432 hoac db.<ref>.supabase.co). Khong dat -> dung DATABASE_URL */
  DIRECT_URL: optStr,
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optStr,
  /** Khoa bi mat (sb_secret_...) - CHI dung o server, bo qua RLS. Tuy chon. */
  SUPABASE_SECRET_KEY: optStr,
  UPLOAD_DRIVER: z.preprocess(emptyToUndef, z.enum(["local", "inline", "cloudinary"]).default("local")),
  CLOUDINARY_CLOUD_NAME: optStr,
  CLOUDINARY_API_KEY: optStr,
  CLOUDINARY_API_SECRET: optStr,
  /** thu muc goc tren Cloudinary: <folder>/avatars, <folder>/products, <folder>/banners */
  CLOUDINARY_FOLDER: z.preprocess(emptyToUndef, z.string().regex(/^[a-z0-9_-]+$/i).default("system_clothes")),
  UPLOAD_DIR: z.preprocess(emptyToUndef, z.string().default("./uploads")),
  DB_POOL_MAX: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(50).default(5)),
  TRUST_PROXY: z.preprocess(emptyToUndef, z.enum(["true", "false"]).default("true")),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

/** Doc va kiem tra env o lan dung dau tien (khong chay luc `next build`). */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`[eleonore] Cấu hình môi trường không hợp lệ: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
export const isHttps = () => env().APP_URL.startsWith("https://");
export const googleEnabled = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
export const supabaseEnabled = () => Boolean(env().NEXT_PUBLIC_SUPABASE_URL && env().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const geminiEnabled = () => Boolean(env().GEMINI_API_KEY);
