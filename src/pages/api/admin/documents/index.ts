import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createDocument } from "../../../../lib/db";
import { buildDocumentKey, isPdf, putObject, deleteObject, MAX_PDF_BYTES } from "../../../../lib/r2";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const discipline = String(form.get("discipline") ?? "").trim() || null;
  const file = form.get("file");

  if (!title || !category || !(file instanceof File) || file.size === 0) {
    return new Response(null, { status: 303, headers: { Location: "/admin/documents/new?error=missing" } });
  }
  if (file.size > MAX_PDF_BYTES) {
    return new Response(null, { status: 303, headers: { Location: "/admin/documents/new?error=too_large" } });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) {
    return new Response(null, { status: 303, headers: { Location: "/admin/documents/new?error=not_pdf" } });
  }

  const key = buildDocumentKey(category, title, "pdf");
  await putObject(env.MEDIA_BUCKET, key, bytes, "application/pdf");

  let documentId: number | undefined;
  try {
    const result = await createDocument(
      env.DB,
      { title, fileKey: key, fileSize: file.size, mimeType: "application/pdf", category, discipline },
      locals.admin.id,
    );
    documentId = result.meta.last_row_id;
  } catch (err) {
    await deleteObject(env.MEDIA_BUCKET, key);
    throw err;
  }

  await audit(env.DB, request, locals.admin, "document.create", { type: "document", id: documentId ?? null }, `${title} (${category})`);
  return new Response(null, { status: 303, headers: { Location: "/admin/documents?saved=1" } });
};
