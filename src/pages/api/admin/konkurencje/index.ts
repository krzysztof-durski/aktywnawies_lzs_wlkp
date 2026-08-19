import type { APIRoute } from "astro";
import { createDiscipline, type DisciplineInput } from "../../../../lib/db";
import { slugify } from "../../../../lib/slugify";
import {
  buildDisciplineCoverKey,
  detectImageType,
  putObject,
  deleteObject,
  uploadOptionalDisciplinePdf,
  MAX_IMAGE_BYTES,
} from "../../../../lib/r2";
import { audit, diffFields } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const sortOrder = Number(form.get("sort_order") ?? 0) || 0;
  const section = String(form.get("section") ?? "").trim() || null;

  if (!title) {
    return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=1" } });
  }

  let coverImageKey: string | null = null;
  const coverFile = form.get("cover_image");
  if (coverFile instanceof File && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=cover_too_large" } });
    }
    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const signature = detectImageType(bytes);
    if (!signature) {
      return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje/new?error=cover_not_image" } });
    }
    coverImageKey = buildDisciplineCoverKey(signature.ext);
    await putObject(env.MEDIA_BUCKET, coverImageKey, bytes, signature.mime);
  }

  const uploadedKeys: string[] = coverImageKey ? [coverImageKey] : [];
  const rollback = async () => {
    for (const key of uploadedKeys) await deleteObject(env.MEDIA_BUCKET, key);
  };

  const regulamin = await uploadOptionalDisciplinePdf(env.MEDIA_BUCKET, form.get("regulamin"), "regulamin");
  if (regulamin.error) {
    await rollback();
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/konkurencje/new?error=pdf_${regulamin.error}` },
    });
  }
  if (regulamin.key) uploadedKeys.push(regulamin.key);

  const listyStartowe = await uploadOptionalDisciplinePdf(env.MEDIA_BUCKET, form.get("listy_startowe"), "listy-startowe");
  if (listyStartowe.error) {
    await rollback();
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/konkurencje/new?error=pdf_${listyStartowe.error}` },
    });
  }
  if (listyStartowe.key) uploadedKeys.push(listyStartowe.key);

  const wyniki = await uploadOptionalDisciplinePdf(env.MEDIA_BUCKET, form.get("wyniki"), "wyniki");
  if (wyniki.error) {
    await rollback();
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/konkurencje/new?error=pdf_${wyniki.error}` },
    });
  }
  if (wyniki.key) uploadedKeys.push(wyniki.key);

  const input: DisciplineInput = {
    slug: slugify(slugInput || title),
    title,
    bodyHtml: String(form.get("body_html") ?? ""),
    sortOrder,
    coverImageKey,
    regulaminKey: regulamin.key,
    regulaminText: String(form.get("regulamin_text") ?? "").trim() || null,
    listyStartoweKey: listyStartowe.key,
    wynikiKey: wyniki.key,
    section,
  };

  let result;
  try {
    result = await createDiscipline(env.DB, input, locals.admin.id);
  } catch (err) {
    await rollback();
    throw err;
  }
  const details = diffFields(
    null,
    { title, slug: input.slug, section, sort_order: sortOrder, body_html: input.bodyHtml },
    ["title", "slug", "section", "sort_order", "body_html"],
  );
  await audit(env.DB, request, locals.admin, "discipline.create", { type: "discipline", id: result.meta.last_row_id }, details ?? title);
  return new Response(null, { status: 303, headers: { Location: "/admin/konkurencje?saved=1" } });
};
