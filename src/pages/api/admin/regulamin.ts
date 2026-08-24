import type { APIRoute } from "astro";
import { getSiteSetting, setSiteSetting } from "../../../lib/db";
import { buildRegulaminGlownyKey, isPdf, putObject, deleteObject, MAX_PDF_BYTES } from "../../../lib/r2";
import { audit } from "../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: "/admin/regulamin?error=missing" } });
  }

  let newKey: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PDF_BYTES) {
      return new Response(null, { status: 303, headers: { Location: "/admin/regulamin?error=too_large" } });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) {
      return new Response(null, { status: 303, headers: { Location: "/admin/regulamin?error=not_pdf" } });
    }
    newKey = buildRegulaminGlownyKey();
    await putObject(env.MEDIA_BUCKET, newKey, bytes, "application/pdf");
  }

  const oldKey = await getSiteSetting(env.DB, "regulamin_glowny_key");

  await setSiteSetting(env.DB, "regulamin_glowny_title", title);
  if (newKey) {
    await setSiteSetting(env.DB, "regulamin_glowny_key", newKey);
    await setSiteSetting(env.DB, "regulamin_glowny_size", String(file instanceof File ? file.size : ""));
  }

  if (newKey && oldKey) await deleteObject(env.MEDIA_BUCKET, oldKey);

  await audit(env.DB, request, locals.admin, "regulamin.update", { type: "regulamin" }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/regulamin?saved=1" } });
};
