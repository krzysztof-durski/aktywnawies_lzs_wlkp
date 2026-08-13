const PBKDF2_ITERATIONS = 210_000;
const SESSION_TOKEN_BYTES = 32;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PasswordHash {
  hash: string;
  salt: string;
}

/** Reused as-is by scripts/create-admin.ts, which runs under Node — relies only on Web Crypto. */
export async function hashPassword(password: string, existingSaltB64?: string): Promise<PasswordHash> {
  const salt = existingSaltB64 ? base64ToBytes(existingSaltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return { hash: bytesToBase64(new Uint8Array(bits)), salt: bytesToBase64(salt) };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt);
  return timingSafeEqual(hash, storedHash);
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return bytesToBase64Url(new Uint8Array(digest));
}

/** Returns { token } for the cookie and { tokenHash } for the `sessions.id` DB column — never store the raw token. */
export async function generateSessionToken(): Promise<{ token: string; tokenHash: string }> {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES)));
  const tokenHash = await sha256Base64Url(token);
  return { token, tokenHash };
}

export async function hashSessionToken(token: string): Promise<string> {
  return sha256Base64Url(token);
}

export const SESSION_COOKIE_NAME = "lzs_admin_session";
export const CSRF_COOKIE_NAME = "lzs_csrf";

/**
 * Cookie *assembly* is left to Astro's `context.cookies` API (used directly in
 * middleware.ts/API routes) rather than hand-rolled here — it handles
 * Set-Cookie encoding correctly and is adapter-agnostic. This module only
 * generates the values that go in them.
 */
export function generateCsrfToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}
