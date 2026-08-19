import type { APIRoute } from "astro";
import { getAdminUserById, setAdminUserDisabled } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });

  if (id === locals.admin.id) {
    return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?error=self" } });
  }

  const target = await getAdminUserById(env.DB, id);
  if (!target) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const disable = form.get("intent") === "disable";

  await setAdminUserDisabled(env.DB, id, disable);
  await audit(
    env.DB,
    request,
    locals.admin,
    disable ? "admin_user.disable" : "admin_user.enable",
    { type: "admin_user", id },
    JSON.stringify({ username: target.username, disabled: { from: !!target.disabled, to: disable } }),
  );

  return new Response(null, { status: 303, headers: { Location: "/admin/uzytkownicy?saved=1" } });
};
