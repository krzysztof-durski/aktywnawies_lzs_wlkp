import type { APIRoute } from "astro";
import { getDisciplineById, updateDiscipline, deleteDiscipline, type DisciplineInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import {
  buildDisciplineCoverKey,
  detectImageType,
  putObject,
  deleteObject,
  uploadOptionalDisciplinePdf,
  MAX_IMAGE_BYTES,
} from "../../../../lib/r2";
import { audit, diffFields, snapshotFields } from "../../../../lib/audit";

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
    const existing = await getDisciplineById(env.DB, id);
    await deleteDiscipline(env.DB, id);
    for (const key of [existing?.cover_image_key, existing?.regulamin_key, existing?.listy_startowe_key, existing?.wyniki_key]) {
      if (key) await deleteObject(env.MEDIA_BUCKET, key);
    }
    const deleteDetails = snapshotFields(existing, ["title", "slug", "section"]);
    await audit(env.DB, request, locals.admin, "discipline.delete", { type: "discipline", id }, deleteDetails ?? existing?.title);
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje?deleted=1" } });
  }

  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;
  const section = String(form.get("section") ?? "").trim() || null;

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=1` } });
  }

  const existing = await getDisciplineById(env.DB, id);
  const newlyUploadedKeys: string[] = [];
  const rollback = async () => {
    for (const key of newlyUploadedKeys) await deleteObject(env.MEDIA_BUCKET, key);
  };

  let coverImageKey: string | null = existing?.cover_image_key ?? null;
  const removeCover = form.get("remove_cover") === "on";
  const coverFile = form.get("cover_image");
  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=cover_too_large` } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=cover_not_image` } });
    }
    coverImageKey = buildDisciplineCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, coverImageKey, bytes, signature.mime);
    newlyUploadedKeys.push(coverImageKey);
  } else if (removeCover) {
    coverImageKey = null;
  }

  const pdfFields = [
    { name: "regulamin", removeName: "remove_regulamin", field: "regulamin" as const, existingKey: existing?.regulamin_key ?? null },
    {
      name: "listy_startowe",
      removeName: "remove_listy_startowe",
      field: "listy-startowe" as const,
      existingKey: existing?.listy_startowe_key ?? null,
    },
    { name: "wyniki", removeName: "remove_wyniki", field: "wyniki" as const, existingKey: existing?.wyniki_key ?? null },
  ];

  const resolvedPdfKeys: Record<string, string | null> = {};
  for (const pdf of pdfFields) {
    const upload = await uploadOptionalDisciplinePdf(env.MEDIA_BUCKET, form.get(pdf.name), pdf.field);
    if (upload.error) {
      await rollback();
      return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?error=pdf_${upload.error}` } });
    }
    if (upload.key) {
      newlyUploadedKeys.push(upload.key);
      resolvedPdfKeys[pdf.name] = upload.key;
    } else if (form.get(pdf.removeName) === "on") {
      resolvedPdfKeys[pdf.name] = null;
    } else {
      resolvedPdfKeys[pdf.name] = pdf.existingKey;
    }
  }

  const input: DisciplineInput = {
    slug: slugify(slugInput || title),
    title,
    bodyHtml: String(form.get("body_html") ?? ""),
    sortOrder,
    coverImageKey,
    regulaminKey: resolvedPdfKeys.regulamin,
    regulaminText: String(form.get("regulamin_text") ?? "").trim() || null,
    listyStartoweKey: resolvedPdfKeys.listy_startowe,
    wynikiKey: resolvedPdfKeys.wyniki,
    section,
  };

  try {
    await updateDiscipline(env.DB, id, input, locals.admin.id);
  } catch (err) {
    await rollback();
    throw err;
  }

  // Delete old R2 objects that were replaced or removed (never the ones still in use).
  const oldKeys = [existing?.cover_image_key, existing?.regulamin_key, existing?.listy_startowe_key, existing?.wyniki_key];
  const newKeys = new Set([coverImageKey, ...Object.values(resolvedPdfKeys)]);
  for (const oldKey of oldKeys) {
    if (oldKey && !newKeys.has(oldKey)) await deleteObject(env.MEDIA_BUCKET, oldKey);
  }

  const updateDetails = diffFields(
    existing,
    { title, slug: input.slug, section, sort_order: sortOrder, body_html: input.bodyHtml },
    ["title", "slug", "section", "sort_order", "body_html"],
  );
  await audit(env.DB, request, locals.admin, "discipline.update", { type: "discipline", id }, updateDetails ?? title);
  return new Response(null, { status: 303, headers: { Location: `/admin/konkurencje/${id}/edit?saved=1` } });
};
