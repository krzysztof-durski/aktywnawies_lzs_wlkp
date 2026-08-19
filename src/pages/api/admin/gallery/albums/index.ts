import type { APIRoute } from "astro";
import { createGalleryAlbum } from "../../../../../lib/db";
import { slugify } from "../../../../../lib/slugify";
import { MAIN_GALLERY_SLUG } from "../../../../../lib/nav";
import { audit, diffFields } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const description = String(form.get("description") ?? "");
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;
  const isPrivate = form.get("is_private") === "on";

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: "/admin/gallery?error=1" } });
  }

  const slug = slugify(slugInput || title);
  if (slug === MAIN_GALLERY_SLUG) {
    return new Response(null, { status: 303, headers: { Location: "/admin/gallery?error=reserved_slug" } });
  }

  const result = await createGalleryAlbum(env.DB, slug, title, description, sortOrder, isPrivate);
  const details = diffFields(
    null,
    { title, slug, description, sort_order: sortOrder, is_private: isPrivate ? 1 : 0 },
    ["title", "slug", "description", "sort_order", "is_private"],
  );
  await audit(
    env.DB,
    request,
    locals.admin,
    "gallery_album.create",
    { type: "gallery_album", id: result.meta.last_row_id },
    details ?? title,
  );
  return new Response(null, { status: 303, headers: { Location: "/admin/gallery?saved=1" } });
};
