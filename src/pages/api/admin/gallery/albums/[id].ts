import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getGalleryAlbumById, listGalleryImages, deleteGalleryAlbum } from "../../../../../lib/db";
import { deleteObject } from "../../../../../lib/r2";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  if (form.get("intent") !== "delete") return new Response("Bad request", { status: 400 });

  const album = await getGalleryAlbumById(env.DB, id);
  if (!album) return new Response("Not found", { status: 404 });

  const { results: images } = await listGalleryImages(env.DB, id);
  await Promise.all(
    images.flatMap((img) => [
      deleteObject(env.MEDIA_BUCKET, img.file_key),
      ...(img.thumb_key ? [deleteObject(env.MEDIA_BUCKET, img.thumb_key)] : []),
    ]),
  );

  // gallery_images rows cascade-delete with the album via the FK ON DELETE CASCADE.
  await deleteGalleryAlbum(env.DB, id);
  await audit(env.DB, request, locals.admin, "gallery_album.delete", { type: "gallery_album", id }, album.title);

  return new Response(null, { status: 303, headers: { Location: "/admin/gallery?deleted=1" } });
};
