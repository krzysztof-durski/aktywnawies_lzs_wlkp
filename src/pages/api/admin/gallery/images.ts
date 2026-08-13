import type { APIRoute } from "astro";
import { getGalleryAlbumById, createGalleryImages, type GalleryImageInput } from "../../../../lib/db";
import { buildGalleryImageKey, detectImageType, putObject, deleteObject, MAX_IMAGE_BYTES } from "../../../../lib/r2";
import { nameFromFilename } from "../../../../lib/slugify";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const albumId = Number(form.get("album_id"));
  if (!Number.isInteger(albumId) || albumId <= 0) return new Response("Bad request", { status: 400 });

  const album = await getGalleryAlbumById(env.DB, albumId);
  if (!album) return new Response("Not found", { status: 404 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return new Response(null, { status: 303, headers: { Location: `/admin/gallery/albums/${albumId}?error=1` } });
  }

  const uploadedKeys: string[] = [];
  const images: GalleryImageInput[] = [];
  let skipped = 0;

  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      skipped++;
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      skipped++;
      continue;
    }
    const key = buildGalleryImageKey(album.slug, signature.ext);
    await putObject(env.MEDIA_BUCKET, key, bytes, signature.mime);
    uploadedKeys.push(key);
    images.push({ albumId, fileKey: key, caption: nameFromFilename(file.name) });
  }

  if (images.length > 0) {
    try {
      await createGalleryImages(env.DB, images, locals.admin.id);
    } catch (err) {
      await Promise.all(uploadedKeys.map((key) => deleteObject(env.MEDIA_BUCKET, key)));
      throw err;
    }
  }

  if (images.length > 0) {
    await audit(
      env.DB,
      request,
      locals.admin,
      "gallery_image.upload",
      { type: "gallery_album", id: albumId },
      `${images.length} zdjęć do „${album.title}"${skipped > 0 ? `, pominięto ${skipped}` : ""}`,
    );
  }

  const params = new URLSearchParams({ uploaded: String(images.length), skipped: String(skipped) });
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/gallery/albums/${albumId}?${params.toString()}` },
  });
};
