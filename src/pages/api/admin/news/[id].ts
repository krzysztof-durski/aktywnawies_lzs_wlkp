import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getNewsPostById, updateNewsPost, deleteNewsPost, type NewsInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import { buildNewsCoverKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../lib/r2";
import { audit } from "../../../../lib/audit";

export const prerender = false;

function parseId(idParam: string | undefined): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Plain HTML forms can only POST — "intent" tells this single endpoint whether
// to update or delete, instead of relying on a PUT/DELETE method forms can't send.
export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = parseId(params.id);
  if (!id) return new Response("Not found", { status: 404 });

  const form = await request.formData();

  if (form.get("intent") === "delete") {
    const existing = await getNewsPostById(env.DB, id);
    await deleteNewsPost(env.DB, id);
    if (existing?.cover_image_key) await deleteObject(env.MEDIA_BUCKET, existing.cover_image_key);
    await audit(env.DB, request, locals.admin, "news.delete", { type: "news_post", id }, existing?.title);
    return new Response(null, { status: 303, headers: { Location: "/admin/news?deleted=1" } });
  }

  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const status = form.get("status") === "published" ? "published" : "draft";

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: `/admin/news/${id}/edit?error=1` } });
  }

  const existing = await getNewsPostById(env.DB, id);
  let coverImageKey: string | null | undefined; // undefined = leave unchanged
  let newlyUploadedKey: string | null = null;

  const removeCover = form.get("remove_cover") === "on";
  const coverFile = form.get("cover_image");

  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: `/admin/news/${id}/edit?error=cover_too_large` } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: `/admin/news/${id}/edit?error=cover_not_image` } });
    }
    newlyUploadedKey = buildNewsCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, newlyUploadedKey, bytes, signature.mime);
    coverImageKey = newlyUploadedKey;
  } else if (removeCover) {
    coverImageKey = null;
  }

  const input: NewsInput = {
    slug: slugify(slugInput || title),
    title,
    excerpt: String(form.get("excerpt") ?? ""),
    bodyHtml: String(form.get("body_html") ?? ""),
    status,
    coverImageKey,
  };

  try {
    await updateNewsPost(env.DB, id, input);
  } catch (err) {
    if (newlyUploadedKey) await deleteObject(env.MEDIA_BUCKET, newlyUploadedKey);
    throw err;
  }

  // Old cover is only removed from R2 after the DB write that stops referencing it succeeds.
  const oldKey = existing?.cover_image_key;
  if (oldKey && (newlyUploadedKey || removeCover) && oldKey !== newlyUploadedKey) {
    await deleteObject(env.MEDIA_BUCKET, oldKey);
  }

  await audit(env.DB, request, locals.admin, "news.update", { type: "news_post", id }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/news?saved=1" } });
};
