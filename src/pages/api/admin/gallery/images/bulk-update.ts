import type { APIRoute } from "astro";
import { bulkUpdateGalleryImageFlags, type BulkFlagUpdate } from "../../../../../lib/db";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const returnTo = String(form.get("return_to") ?? "/admin/gallery");
  const ids = form
    .getAll("image_ids")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  const updates: BulkFlagUpdate[] = ids.map((id) => ({
    id,
    featured: form.get(`featured_${id}`) === "on",
    caption: String(form.get(`caption_${id}`) ?? "").trim() || null,
  }));

  await bulkUpdateGalleryImageFlags(env.DB, updates);
  await audit(
    env.DB,
    request,
    locals.admin,
    "gallery_image.bulk_update_flags",
    { type: "gallery_image", id: null },
    `${updates.length} zdjęć: ids=${ids.join(",")}`,
  );

  return new Response(null, { status: 303, headers: { Location: `${returnTo}?flags_saved=1` } });
};
