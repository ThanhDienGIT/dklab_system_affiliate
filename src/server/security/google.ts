import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env, googleEnabled } from "../config/env";
import { AppError } from "../domain/errors";

/** Adapter Google OAuth 2.0 (authorization code + PKCE + nonce). Co the thay bang provider khac cung interface. */
export interface OAuthIdentity { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null }
export interface OAuthProvider {
  enabled(): boolean;
  start(): { url: string; state: string; verifier: string; nonce: string };
  finish(code: string, verifier: string, nonce: string): Promise<OAuthIdentity>;
}

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const rnd = (n = 32) => randomBytes(n).toString("base64url");
export const redirectUri = () => `${env().APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;

export const googleProvider: OAuthProvider = {
  enabled: googleEnabled,
  start() {
    const state = rnd(), verifier = rnd(48), nonce = rnd(16);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const q = new URLSearchParams({
      client_id: env().GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code",
      scope: "openid email profile", state, nonce, code_challenge: challenge, code_challenge_method: "S256",
      access_type: "online", prompt: "select_account",
    });
    return { url: `${AUTH_URL}?${q}`, state, verifier, nonce };
  },
  async finish(code, verifier, nonce) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: env().GOOGLE_CLIENT_ID!, client_secret: env().GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(), grant_type: "authorization_code", code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new AppError("UNAUTHORIZED", "Đăng nhập Google không thành công");
    const json = (await res.json()) as { id_token?: string };
    if (!json.id_token) throw new AppError("UNAUTHORIZED", "Google không trả về id_token");
    const { payload } = await jwtVerify(json.id_token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"], audience: env().GOOGLE_CLIENT_ID!,
    });
    if (payload.nonce !== nonce) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập Google không hợp lệ");
    const email = String(payload.email ?? "").toLowerCase();
    if (!email || payload.email_verified !== true) throw new AppError("UNAUTHORIZED", "Email Google chưa được xác minh");
    return {
      sub: String(payload.sub), email, emailVerified: true,
      name: String(payload.name ?? email.split("@")[0]), picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  },
};
