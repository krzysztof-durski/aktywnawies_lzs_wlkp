import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAdminUserByUsername, createSession, logAuditEvent } from "../../../lib/db";
import { generateSessionToken, verifyPassword, SESSION_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "../../../lib/auth";
import { verifyTurnstileToken } from "../../../lib/turnstile";

export const prerender = false;

function loginRedirect(error: string): Response {
  return new Response(null, { status: 303, headers: { Location: `/admin/login?error=${error}` } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: withinLimit } = await env.RATE_LIMITER.limit({ key: ip });
  if (!withinLimit) return loginRedirect("rate_limited");

  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const turnstileToken = String(form.get("cf-turnstile-response") ?? "");

  const turnstileOk = await verifyTurnstileToken(env.TURNSTILE_SECRET, turnstileToken, ip);
  if (!turnstileOk) return loginRedirect("captcha");

  if (!username || !password) return loginRedirect("invalid");

  // Same generic failure path (and roughly the same amount of work) whether the
  // username doesn't exist or the password is wrong — never reveal which one it was.
  const user = await getAdminUserByUsername(env.DB, username);
  const passwordOk = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
  if (!user || !passwordOk) {
    await logAuditEvent(env.DB, {
      adminUserId: null,
      username,
      action: "login.failed",
      ip,
      userAgent: request.headers.get("user-agent"),
    });
    return loginRedirect("invalid");
  }

  const { token, tokenHash } = await generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await createSession(env.DB, tokenHash, user.id, expiresAt, request.headers.get("user-agent"), ip);
  await logAuditEvent(env.DB, {
    adminUserId: user.id,
    username: user.username,
    action: "login.success",
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  const isHttps = new URL(request.url).protocol === "https:";
  cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return new Response(null, { status: 303, headers: { Location: "/admin" } });
};
