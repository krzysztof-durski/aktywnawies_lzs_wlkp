import type { APIRoute } from "astro";
import { deleteSession } from "../../../lib/db";
import { SESSION_COOKIE_NAME, hashSessionToken } from "../../../lib/auth";
import { audit } from "../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const { env } = locals.runtime;
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(env.DB, await hashSessionToken(token));
  }
  if (locals.admin) await audit(env.DB, request, locals.admin, "logout");
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
  return new Response(null, { status: 303, headers: { Location: "/admin/login" } });
};
