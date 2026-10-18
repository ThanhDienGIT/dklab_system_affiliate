import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "../config/env";
import { AppError } from "../domain/errors";

/** Strategy: moi driver luu 1 buffer da xu ly va tra ve URL de dat vao <img>. */
export interface StorageDriver {
  readonly name: "local" | "inline" | "cloudinary";
  put(buf: Buffer, folder: string, contentType: string): Promise<string>;
}

const root = () => path.resolve(env().UPLOAD_DIR);

export const localDriver: StorageDriver = {
  name: "local",
  async put(buf, folder) {
    const safe = folder.replace(/[^a-z0-9-]/gi, "");
    const dir = path.join(root(), safe);
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(dir, name), buf);
    return `/uploads/${safe}/${name}`;
  },
};

/** Phu hop Vercel (dia chi chi doc): anh nho nhung truc tiep vao DB duoi dang data-URL. */
export const inlineDriver: StorageDriver = {
  name: "inline",
  async put(buf, _folder, contentType) {
    return `data:${contentType};base64,${buf.toString("base64")}`;
  },
};

/** Chu ky upload Cloudinary: sha1( "k1=v1&k2=v2" (sap xep theo ten) + api_secret ). Bo qua file/api_key/resource_type. */
export function cloudinarySignature(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

/** Cloudinary (signed upload qua REST, khong can SDK). Tra ve secure_url https de luu thang vao DB. */
export const cloudinaryDriver: StorageDriver = {
  name: "cloudinary",
  async put(buf, folder, contentType) {
    const e = env();
    if (!e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) {
      throw new AppError("INTERNAL", "Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)");
    }
    const safe = folder.replace(/[^a-z0-9-]/gi, "");
    const signed = {
      folder: `${e.CLOUDINARY_FOLDER}/${safe}`,
      public_id: randomUUID(),
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(buf)], { type: contentType }), "upload.webp");
    form.set("api_key", e.CLOUDINARY_API_KEY);
    form.set("signature", cloudinarySignature(signed, e.CLOUDINARY_API_SECRET));
    for (const [k, v] of Object.entries(signed)) form.set(k, v);
    let res: Response;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(e.CLOUDINARY_CLOUD_NAME)}/image/upload`, {
        method: "POST", body: form, signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new AppError("INTERNAL", "Không kết nối được Cloudinary");
    }
    const data = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
    if (!res.ok || !data?.secure_url) {
      console.error("[cloudinary] upload loi:", res.status, data?.error?.message);
      throw new AppError("INTERNAL", "Tải ảnh lên Cloudinary thất bại");
    }
    return data.secure_url;
  },
};

export const storage = (): StorageDriver => {
  const d = env().UPLOAD_DRIVER;
  return d === "cloudinary" ? cloudinaryDriver : d === "inline" ? inlineDriver : localDriver;
};

export async function readUpload(rel: string): Promise<{ buf: Buffer; type: string } | null> {
  const full = path.resolve(root(), rel);
  if (!full.startsWith(root() + path.sep)) return null; // chong path traversal
  try {
    return { buf: await readFile(full), type: "image/webp" };
  } catch {
    return null;
  }
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif"]);

export interface ImageSpec { width: number; height: number; fit: "cover" | "inside" }
export const AVATAR_SPEC: ImageSpec = { width: 512, height: 512, fit: "cover" };
export const PRODUCT_SPEC: ImageSpec = { width: 1200, height: 1500, fit: "inside" };
export const BANNER_SPEC: ImageSpec = { width: 2400, height: 1000, fit: "inside" };

/** Kiem tra magic bytes (khong tin Content-Type), xoay theo EXIF, bo metadata, doi sang WebP. */
export async function processImage(file: File, spec: ImageSpec): Promise<Buffer> {
  if (file.size > MAX_BYTES) throw new AppError("VALIDATION", "Ảnh tối đa 5MB");
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new AppError("VALIDATION", "Tệp không phải ảnh hợp lệ");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new AppError("VALIDATION", "Chỉ nhận ảnh JPG, PNG, WebP, AVIF, GIF");
  return sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize(spec.width, spec.height, { fit: spec.fit, withoutEnlargement: spec.fit === "inside" })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function saveImage(file: File, folder: string, spec: ImageSpec): Promise<string> {
  const buf = await processImage(file, spec);
  return storage().put(buf, folder, "image/webp");
}
