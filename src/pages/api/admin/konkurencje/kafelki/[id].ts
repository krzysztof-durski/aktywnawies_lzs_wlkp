import type { APIRoute } from "astro";
import { getKonkurencjeTileById, updateKonkurencjeTile, deleteKonkurencjeTile, type KonkurencjeTileInput } from "../../../../../lib/db";
import { buildKonkurencjeTileKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../../lib/r2";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

function parseId(idParam: string | undefined): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = parseId(params.id);
  if (!id) return new Response("Not found", { status: 404 });

  const form = await request.formData();

  if (form.get("intent") === "delete") {
    const existing = await getKonkurencjeTileById(env.DB, id);
    await deleteKonkurencjeTile(env.DB, id);
    if (existing?.image_key) await deleteObject(env.MEDIA_BUCKET, existing.image_key);
    await audit(env.DB, request, locals.admin, "konkurencje_tile.delete", { type: "konkurencje_tile", id }, existing?.title);
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?deleted=1" } });
  }

  const title = String(form.get("title") ?? "").trim();
  const linkUrl = String(form.get("link_url") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;

  if (!title || !linkUrl) {
    return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/kafelki/${id}/edit?error=missing` } });
  }

  const existing = await getKonkurencjeTileById(env.DB, id);
  let imageKey: string | null | undefined; // undefined = leave unchanged
  let newlyUploadedKey: string | null = null;

  const removeImage = form.get("remove_image") === "on";
  const imageFile = form.get("image");

  if (imageFile instanceof File && imageFile.size > 0) {
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/kafelki/${id}/edit?error=too_large` } });
    }
    const bytes = new Uint8Array(await imageFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/kafelki/${id}/edit?error=not_image` } });
    }
    newlyUploadedKey = buildKonkurencjeTileKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, newlyUploadedKey, bytes, signature.mime);
    imageKey = newlyUploadedKey;
  } else if (removeImage) {
    imageKey = null;
  }

  const input: KonkurencjeTileInput = { title, linkUrl, sortOrder, imageKey };

  try {
    await updateKonkurencjeTile(env.DB, id, input);
  } catch (err) {
    if (newlyUploadedKey) await deleteObject(env.MEDIA_BUCKET, newlyUploadedKey);
    throw err;
  }

  const oldKey = existing?.image_key;
  if (oldKey && (newlyUploadedKey || removeImage) && oldKey !== newlyUploadedKey) {
    await deleteObject(env.MEDIA_BUCKET, oldKey);
  }

  await audit(env.DB, request, locals.admin, "konkurencje_tile.update", { type: "konkurencje_tile", id }, title);
  return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/kafelki?saved=1" } });
};
