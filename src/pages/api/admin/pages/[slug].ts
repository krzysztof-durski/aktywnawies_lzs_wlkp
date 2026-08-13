import type { APIRoute } from "astro";
import { upsertPage } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { env } = locals.runtime;
  const slug = params.slug;
  if (!slug || !locals.admin) return new Response("Bad request", { status: 400 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const bodyHtml = String(form.get("body_html") ?? "");

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: `/admin/pages/${slug}/edit?error=1` } });
  }

  await upsertPage(env.DB, slug, title, bodyHtml, locals.admin.id);
  await audit(env.DB, request, locals.admin, "page.update", { type: "page", id: slug }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/pages?saved=1" } });
};
