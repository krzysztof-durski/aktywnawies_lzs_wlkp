import type { APIRoute } from "astro";
import { saveCarouselOrder, type CarouselOrderUpdate } from "../../../../../lib/db";
import { audit } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const orderParam = String(form.get("order") ?? "");
  const ids = orderParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return new Response(null, { status: 303, headers: { Location: "/admin/gallery/karuzela?error=1" } });
  }

  const updates: CarouselOrderUpdate[] = ids.map((id) => ({
    id,
    fullWidth: form.get(`full_width_${id}`) === "on",
  }));

  await saveCarouselOrder(env.DB, updates);
  const order = updates.map((u, i) => `${i + 1}:#${u.id}${u.fullWidth ? "(full)" : ""}`).join(", ");
  await audit(env.DB, request, locals.admin, "gallery_carousel.reorder", { type: "carousel", id: null }, order);

  return new Response(null, { status: 303, headers: { Location: "/admin/gallery/karuzela?saved=1" } });
};
