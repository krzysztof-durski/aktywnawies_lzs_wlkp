import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDisciplineById, updateDiscipline, deleteDiscipline, type DisciplineInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import { isBlockSlug } from "../../../../lib/nav";
import { buildDisciplineCoverKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../lib/r2";
import { audit } from "../../../../lib/audit";

export const prerender = false;

function parseId(idParam: string | undefined): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = parseId(params.id);
  if (!id) return new Response("Not found", { status: 404 });

  const form = await request.formData();

  if (form.get("intent") === "delete") {
    const existing = await getDisciplineById(env.DB, id);
    await deleteDiscipline(env.DB, id);
    if (existing?.cover_image_key) await deleteObject(env.MEDIA_BUCKET, existing.cover_image_key);
    await audit(env.DB, request, locals.admin, "discipline.delete", { type: "discipline", id }, existing?.title);
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje?deleted=1" } });
  }

  const block = String(form.get("block") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;

  if (!title || !isBlockSlug(block)) {
    return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=1` } });
  }

  const existing = await getDisciplineById(env.DB, id);
  let coverImageKey: string | null | undefined; // undefined = leave unchanged
  let newlyUploadedKey: string | null = null;

  const removeCover = form.get("remove_cover") === "on";
  const coverFile = form.get("cover_image");

  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=cover_too_large` } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=cover_not_image` } });
    }
    newlyUploadedKey = buildDisciplineCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, newlyUploadedKey, bytes, signature.mime);
    coverImageKey = newlyUploadedKey;
  } else if (removeCover) {
    coverImageKey = null;
  }

  const input: DisciplineInput = {
    block,
    slug: slugify(slugInput || title),
    title,
    bodyHtml: String(form.get("body_html") ?? ""),
    sortOrder,
    coverImageKey,
  };

  try {
    await updateDiscipline(env.DB, id, input, locals.admin.id);
  } catch (err) {
    if (newlyUploadedKey) await deleteObject(env.MEDIA_BUCKET, newlyUploadedKey);
    throw err;
  }

  const oldKey = existing?.cover_image_key;
  if (oldKey && (newlyUploadedKey || removeCover) && oldKey !== newlyUploadedKey) {
    await deleteObject(env.MEDIA_BUCKET, oldKey);
  }

  await audit(env.DB, request, locals.admin, "discipline.update", { type: "discipline", id }, `${title} (${block})`);
  return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje?saved=1" } });
};
