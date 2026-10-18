import { SignJWT, jwtVerify, errors } from "jose";
import { randomBytes } from "node:crypto";
import { env } from "../config/env";
import type { Role } from "./rbac";
import { sha256 } from "./pii";

export const ACCESS_TTL_S = 15 * 60;
export const REFRESH_TTL_S = 30 * 24 * 60 * 60;
const ISS = "eleonore", AUD = "eleonore-web";

export interface AccessClaims { sub: string; role: Role; tv: number }

const secret = () => new TextEncoder().encode(env().AUTH_SECRET);

export async function signAccessToken(c: AccessClaims): Promise<string> {
  return new SignJWT({ role: c.role, tv: c.tv, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.sub).setIssuer(ISS).setAudience(AUD)
    .setIssuedAt().setExpirationTime(`${ACCESS_TTL_S}s`)
    .sign(secret());
}

export type VerifyResult = { ok: true; claims: AccessClaims } | { ok: false; reason: "expired" | "invalid" };

export async function verifyAccessToken(token: string | undefined): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: "invalid" };
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISS, audience: AUD, algorithms: ["HS256"] });
    if (payload.typ !== "access" || !payload.sub) return { ok: false, reason: "invalid" };
    return { ok: true, claims: { sub: payload.sub, role: payload.role as Role, tv: Number(payload.tv ?? 0) } };
  } catch (e) {
    return { ok: false, reason: e instanceof errors.JWTExpired ? "expired" : "invalid" };
  }
}

/** Refresh token la chuoi ngau nhien (opaque), DB chi giu SHA-256 */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: sha256(token) };
}
export const hashRefreshToken = sha256;
