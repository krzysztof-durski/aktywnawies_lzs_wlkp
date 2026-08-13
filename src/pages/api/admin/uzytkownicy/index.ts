import type { APIRoute } from "astro";
import { createAdminUser, getAdminUserByUsername, type AdminRole } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth";
import { audit } from "../../../../lib/audit";

export const prerender = false;

// Gated to superadmin only via the SUPERADMIN_ONLY_PREFIXES check in src/middleware.ts.
export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirm_password") ?? "");
  const role = form.get("role") === "superadmin" ? "superadmin" : "admin";

  if (!username || password.length < 12) {
    return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?error=invalid" } });
  }
  if (password !== confirmPassword) {
    return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?error=mismatch" } });
  }

  const existing = await getAdminUserByUsername(env.DB, username);
  if (existing) {
    return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?error=taken" } });
  }

  const { hash, salt } = await hashPassword(password);
  const result = await createAdminUser(env.DB, username, hash, salt, role as AdminRole);
  await audit(
    env.DB,
    request,
    locals.admin,
    "admin_user.create",
    { type: "admin_user", id: result.meta.last_row_id },
    `${username} (${role})`,
  );

  return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?saved=1" } });
};
