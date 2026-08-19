import type { APIRoute } from "astro";
import { getDocumentById, deleteDocument, updateDocument } from "../../../../lib/db";
import { buildDocumentKey, deleteObject, isPdf, putObject, MAX_PDF_BYTES } from "../../../../lib/r2";
import { audit, diffFields, snapshotFields } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const intent = form.get("intent");

  const doc = await getDocumentById(env.DB, id);
  if (!doc) return new Response("Not found", { status: 404 });

  if (intent === "delete") {
    await deleteDocument(env.DB, id);
    await deleteObject(env.MEDIA_BUCKET, doc.file_key);
    const deleteDetails = snapshotFields(doc, ["title", "category", "discipline"]);
    await audit(env.DB, request, locals.admin, "document.delete", { type: "document", id }, deleteDetails ?? doc.title);
    return new Response(null, { status: 303, headers: { Location: "/admin/documents?deleted=1" } });
  }

  if (intent === "update") {
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const discipline = String(form.get("discipline") ?? "").trim() || null;
    const file = form.get("file");

    if (!title || !category) {
      return new Response(null, { status: 303, headers: { Location: `/admin/documents/${id}/edit?error=missing` } });
    }

    let newKey: string | undefined;
    let newSize: number | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PDF_BYTES) {
        return new Response(null, { status: 303, headers: { Location: `/admin/documents/${id}/edit?error=too_large` } });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isPdf(bytes)) {
        return new Response(null, { status: 303, headers: { Location: `/admin/documents/${id}/edit?error=not_pdf` } });
      }
      newKey = buildDocumentKey(category, title, "pdf");
      await putObject(env.MEDIA_BUCKET, newKey, bytes, "application/pdf");
      newSize = file.size;
    }

    try {
      await updateDocument(env.DB, id, { title, category, discipline, fileKey: newKey, fileSize: newSize });
    } catch (err) {
      if (newKey) await deleteObject(env.MEDIA_BUCKET, newKey);
      throw err;
    }

    if (newKey) await deleteObject(env.MEDIA_BUCKET, doc.file_key);

    const updateDetails = diffFields(
      doc,
      { title, category, discipline, file_key: newKey ?? doc.file_key },
      ["title", "category", "discipline", "file_key"],
    );
    await audit(env.DB, request, locals.admin, "document.update", { type: "document", id }, updateDetails ?? `${title} (${category})`);
    return new Response(null, { status: 303, headers: { Location: "/admin/documents?saved=1" } });
  }

  return new Response("Bad request", { status: 400 });
};
