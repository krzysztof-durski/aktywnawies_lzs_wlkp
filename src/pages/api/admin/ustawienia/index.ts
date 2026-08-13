import type { APIRoute } from "astro";
import { setSiteSetting } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";

export const prerender = false;

// Gated to superadmin only via the SUPERADMIN_ONLY_PREFIXES check in src/middleware.ts.
export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const offline = form.get("site_offline") === "on";
  const message = String(form.get("site_offline_message") ?? "").trim() || "Strona jest tymczasowo niedostępna.";

  await setSiteSetting(env.DB, "site_offline", offline ? "1" : "0");
  await setSiteSetting(env.DB, "site_offline_message", message);
  await audit(env.DB, request, locals.admin, "site.offline_toggle", { type: "site_settings" }, `offline=${offline}`);

  return new Response(null, { status: 303, headers: { Location: "/admin/ustawienia?saved=1" } });
};
