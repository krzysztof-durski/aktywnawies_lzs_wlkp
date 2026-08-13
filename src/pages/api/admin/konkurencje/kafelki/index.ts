import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createKonkurencjeTile, type KonkurencjeTileInput } from "../../../../../lib/db";
import { buildKonkurencjeTileKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../../lib/r2";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const linkUrl = String(form.get("link_url") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;

  if (!title || !linkUrl) {
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?error=missing" } });
  }

  let imageKey: string | null = null;
  const imageFile = form.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?error=too_large" } });
    }
    const bytes = new Uint8Array(await imageFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?error=not_image" } });
    }
    imageKey = buildKonkurencjeTileKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, imageKey, bytes, signature.mime);
  }

  const input: KonkurencjeTileInput = { title, linkUrl, sortOrder, imageKey };

  let result;
  try {
    result = await createKonkurencjeTile(env.DB, input);
  } catch (err) {
    if (imageKey) await deleteObject(env.MEDIA_BUCKET, imageKey);
    throw err;
  }

  await audit(env.DB, request, locals.admin, "konkurencje_tile.create", { type: "konkurencje_tile", id: result.meta.last_row_id }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?saved=1" } });
};
