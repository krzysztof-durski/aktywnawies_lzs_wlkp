import type { APIRoute } from "astro";
import { getGalleryImageById, deleteGalleryImage, updateGalleryImageFlags } from "../../../../../lib/db";
import { deleteObject } from "../../../../../lib/r2";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const intent = form.get("intent");
  // Album pages post here with no return_to (default back to their own album);
  // the virtual "Główna galeria" admin view sets it explicitly since there's no album to return to.
  const returnTo = String(form.get("return_to") ?? "");

  const image = await getGalleryImageById(env.DB, id);
  if (!image) return new Response("Not found", { status: 404 });

  const backTo = returnTo || `/admin/gallery/albums/${image.album_id}`;

  if (intent === "delete") {
    await deleteGalleryImage(env.DB, id);
    await deleteObject(env.MEDIA_BUCKET, image.file_key);
    if (image.thumb_key) await deleteObject(env.MEDIA_BUCKET, image.thumb_key);
    await audit(env.DB, request, locals.admin, "gallery_image.delete", { type: "gallery_image", id });
    return new Response(null, { status: 303, headers: { Location: `${backTo}?deleted=1` } });
  }

  if (intent === "update") {
    const excludeFromMain = form.get("exclude_from_main") === "on";
    const featured = form.get("featured") === "on";
    // Ordering is set exclusively in the "Karuzela zdjęć" drag-and-drop panel — this
    // form only toggles selection, so the existing featured_order is preserved as-is.
    await updateGalleryImageFlags(env.DB, id, {
      excludeFromMain,
      featured,
      featuredOrder: image.featured_order,
    });
    await audit(
      env.DB,
      request,
      locals.admin,
      "gallery_image.update_flags",
      { type: "gallery_image", id },
      `wykluczone_z_glownej=${excludeFromMain}, wyroznione=${featured}`,
    );
    return new Response(null, { status: 303, headers: { Location: `${backTo}?flags_saved=1` } });
  }

  return new Response("Bad request", { status: 400 });
};
