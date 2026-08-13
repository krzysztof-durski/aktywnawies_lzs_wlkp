import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createDiscipline, type DisciplineInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import { isBlockSlug } from "../../../../lib/nav";
import { buildDisciplineCoverKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../lib/r2";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const block = String(form.get("block") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;

  if (!title || !isBlockSlug(block)) {
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=1" } });
  }

  let coverImageKey: string | null = null;
  const coverFile = form.get("cover_image");
  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=cover_too_large" } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=cover_not_image" } });
    }
    coverImageKey = buildDisciplineCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, coverImageKey, bytes, signature.mime);
  }

  const input: DisciplineInput = {
    block,
    slug: slugify(slugInput || title),
    title,
    bodyHtml: String(form.get("body_html") ?? ""),
    sortOrder,
    coverImageKey,
  };

  let result;
  try {
    result = await createDiscipline(env.DB, input, locals.admin.id);
  } catch (err) {
    if (coverImageKey) await deleteObject(env.MEDIA_BUCKET, coverImageKey);
    throw err;
  }
  await audit(env.DB, request, locals.admin, "discipline.create", { type: "discipline", id: result.meta.last_row_id }, `${title} (${block})`);
  return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje?saved=1" } });
};
