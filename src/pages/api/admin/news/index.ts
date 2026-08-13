import type { APIRoute } from "astro";
import { createNewsPost, type NewsInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import { buildNewsCoverKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../lib/r2";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const status = form.get("status") === "published" ? "published" : "draft";

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: "/admin/news/new?error=1" } });
  }

  let coverImageKey: string | null = null;
  const coverFile = form.get("cover_image");
  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: "/admin/news/new?error=cover_too_large" } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: "/admin/news/new?error=cover_not_image" } });
    }
    coverImageKey = buildNewsCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, coverImageKey, bytes, signature.mime);
  }

  const input: NewsInput = {
    slug: slugify(slugInput || title),
    title,
    excerpt: String(form.get("excerpt") ?? ""),
    bodyHtml: String(form.get("body_html") ?? ""),
    status,
    coverImageKey,
  };

  let newsId: number | undefined;
  try {
    const result = await createNewsPost(env.DB, input, locals.admin.id);
    newsId = result.meta.last_row_id;
  } catch (err) {
    if (coverImageKey) await deleteObject(env.MEDIA_BUCKET, coverImageKey);
    throw err;
  }
  await audit(env.DB, request, locals.admin, "news.create", { type: "news_post", id: newsId ?? null }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/news?saved=1" } });
};
