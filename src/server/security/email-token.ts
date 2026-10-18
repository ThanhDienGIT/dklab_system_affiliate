import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";

const ISS = "eleonore", AUD = "eleonore-email";
export const VERIFY_TTL_S = 24 * 60 * 60;
const secret = () => new TextEncoder().encode(`${env().AUTH_SECRET}|email-verify`);

/** Token xac thuc email khong luu DB: ky HMAC, gan voi userId + email, het han sau 24h. Doi email -> token cu vo hieu. */
export async function signVerifyToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ typ: "verify-email", email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuer(ISS).setAudience(AUD)
    .setIssuedAt().setExpirationTime(`${VERIFY_TTL_S}s`).sign(secret());
}

export type VerifyTokenResult = { ok: true; userId: string; email: string } | { ok: false; reason: "expired" | "invalid" };
export async function verifyVerifyToken(token: string): Promise<VerifyTokenResult> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISS, audience: AUD, algorithms: ["HS256"] });
    if (payload.typ !== "verify-email" || !payload.sub || typeof payload.email !== "string") return { ok: false, reason: "invalid" };
    return { ok: true, userId: payload.sub, email: payload.email };
  } catch (e) {
    return { ok: false, reason: (e as { code?: string }).code === "ERR_JWT_EXPIRED" ? "expired" : "invalid" };
  }
}
