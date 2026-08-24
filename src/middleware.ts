import { defineMiddleware } from "astro:middleware";
import { getValidSessionByTokenHash, isSiteOffline, getSiteOfflineMessage } from "./lib/db";
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  generateCsrfToken,
  hashSessionToken,
} from "./lib/auth";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// TODO: narrow img-src/connect-src to the real R2 media custom domain once it's provisioned.
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

/**
 * `frame-ancestors` governs whether *this response itself* may be loaded inside an
 * iframe — the opposite direction from `frame-src`. Every PDF preview on the site
 * (Regulamin Igrzysk, DocumentList, the admin regulamin editor) embeds a same-origin
 * `/media/[...key]` object in an <iframe>, so that route needs `'self'` or the
 * browser blocks its own embedding; everything else stays locked to `'none'`.
 */
function buildCsp(pathname: string): string {
  const frameAncestors = pathname.startsWith("/media/") ? "frame-ancestors 'self'" : "frame-ancestors 'none'";
  return [
    "default-src 'self'",
    // The hash allows Turnstile's inline bootstrap script under a strict CSP (no 'unsafe-inline').
    // If Cloudflare changes api.js, the browser console will report the new hash to swap in.
    // wasm-unsafe-eval: Turnstile's bot-detection runs as WebAssembly, which needs this to instantiate under CSP.
    "script-src 'self' https://challenges.cloudflare.com 'sha256-l2ZuM+GKBUw7rVCIimH2/fLfttdOUGdmYKRKn6JKkGM=' 'wasm-unsafe-eval'",
    // 'self' lets the inline PDF preview iframes (Regulamin Igrzysk, DocumentList) embed
    // same-origin PDFs — bundled assets served from /_astro/ and, until MEDIA_BASE_URL
    // points at a real R2 custom domain, R2 objects proxied through /media/[...key].
    "frame-src 'self' https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline'",
    frameAncestors,
    "base-uri 'self'",
  ].join("; ");
}

function withSecurityHeaders(response: Response, pathname: string): Response {
  response.headers.set("Content-Security-Policy", buildCsp(pathname));
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

const FRIENDLY_500_HTML = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Błąd serwera</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;">
<h1>Coś poszło nie tak</h1><p>Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę.</p>
<a href="/">Wróć na stronę główną</a></body></html>`;

function offlineHtml(message: string): string {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Strona niedostępna</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;text-align:center;">
<h1>Aktualnie strona jest niedostępna</h1><p>${message}</p></body></html>`;
}

/** Static assets (build output, dev-mode module scripts, favicons) never need the offline gate or an admin session. */
function isAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/media") ||
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/src/") ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { env } = context.locals.runtime;
  const url = new URL(context.request.url);
  const { pathname } = url;
  const isAdminLogin = pathname === "/admin/login";
  const isAdminUI = pathname.startsWith("/admin") && !isAdminLogin;
  const isAdminApiLogin = pathname === "/api/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && !isAdminApiLogin;
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  try {
    if (!isAdminArea && !isAssetPath(pathname) && (await isSiteOffline(env.DB))) {
      const message = await getSiteOfflineMessage(env.DB);
      return withSecurityHeaders(
        new Response(offlineHtml(message), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }),
        pathname,
      );
    }

    if (isAdminUI || isAdminApi) {
      const token = context.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = token ? await getValidSessionByTokenHash(env.DB, await hashSessionToken(token)) : null;

      if (!session) {
        if (isAdminApi) return withSecurityHeaders(new Response("Unauthorized", { status: 401 }), pathname);
        return context.redirect("/admin/login");
      }

      context.locals.admin = { id: session.admin_user_id, username: session.admin_username };

      if (isAdminApi && MUTATING_METHODS.has(context.request.method)) {
        // Read from the query string (set on every admin form's `action`) rather than a
        // header or the body, so plain HTML form posts work with zero client JS and
        // multipart file-upload bodies never need to be parsed twice.
        const csrfCookie = context.cookies.get(CSRF_COOKIE_NAME)?.value;
        const csrfParam = url.searchParams.get("csrf_token");
        if (!csrfCookie || !csrfParam || csrfCookie !== csrfParam) {
          return withSecurityHeaders(new Response("Invalid CSRF token", { status: 403 }), pathname);
        }
      }

      if (isAdminUI && context.request.method === "GET" && !context.cookies.get(CSRF_COOKIE_NAME)) {
        const csrfToken = generateCsrfToken();
        context.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          secure: url.protocol === "https:",
          maxAge: SESSION_MAX_AGE_SECONDS,
        });
        context.locals.csrfToken = csrfToken;
      } else {
        context.locals.csrfToken = context.cookies.get(CSRF_COOKIE_NAME)?.value;
      }
    }

    const response = await next();
    return withSecurityHeaders(response, pathname);
  } catch (err) {
    // Logged for `wrangler tail`/Workers Logs visibility; never surfaced to the client —
    // an unhandled exception's message/stack could leak internal details (query text, keys).
    console.error("Unhandled error:", err);
    return withSecurityHeaders(
      new Response(FRIENDLY_500_HTML, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }),
      pathname,
    );
  }
});
