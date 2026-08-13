import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable",
      "Content-Length": String(object.size),
    },
  });
};
