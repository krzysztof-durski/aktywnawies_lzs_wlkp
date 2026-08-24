import type { APIRoute } from "astro";
import { setSiteSetting } from "../../../lib/db";
import { audit } from "../../../lib/audit";

export const prerender = false;

const DAY_FIELD_RE = /^days\[(\d+)\]\[(date|label)\]$/;
const ITEM_FIELD_RE = /^days\[(\d+)\]\[items\]\[(\d+)\]\[(time|text)\]$/;

interface ProgramItem {
  time: string;
  text: string;
}
interface ProgramDay {
  date: string;
  label: string;
  items: ProgramItem[];
}

/**
 * Reconstructs the day/item tree from bracket-style form field names
 * (days[N][date], days[N][items][M][time], ...). Indices come from the admin
 * form's ever-incrementing counters, so they may have gaps from deleted rows —
 * sorting by index (rather than relying on insertion order) is what keeps day
 * and item order correct despite that.
 */
function parseProgramForm(form: FormData): { term: string; note: string; days: ProgramDay[] } {
  const term = String(form.get("term") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();

  const daysByIndex = new Map<number, { date: string; label: string; items: Map<number, ProgramItem> }>();
  function getDay(index: number) {
    let day = daysByIndex.get(index);
    if (!day) {
      day = { date: "", label: "", items: new Map() };
      daysByIndex.set(index, day);
    }
    return day;
  }

  for (const [key, rawValue] of form.entries()) {
    const value = String(rawValue).trim();
    const dayMatch = key.match(DAY_FIELD_RE);
    if (dayMatch) {
      const [, indexStr, field] = dayMatch;
      const day = getDay(Number(indexStr));
      if (field === "date") day.date = value;
      else day.label = value;
      continue;
    }
    const itemMatch = key.match(ITEM_FIELD_RE);
    if (itemMatch) {
      const [, dayIndexStr, itemIndexStr, field] = itemMatch;
      const day = getDay(Number(dayIndexStr));
      const itemIndex = Number(itemIndexStr);
      const item = day.items.get(itemIndex) ?? { time: "", text: "" };
      if (field === "time") item.time = value;
      else item.text = value;
      day.items.set(itemIndex, item);
    }
  }

  const days: ProgramDay[] = Array.from(daysByIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([, day]) => ({
      date: day.date,
      label: day.label,
      items: Array.from(day.items.entries())
        .sort(([a], [b]) => a - b)
        .map(([, item]) => item)
        .filter((item) => item.time || item.text),
    }))
    .filter((day) => day.date || day.label);

  return { term, note, days };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!locals.admin) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const program = parseProgramForm(form);

  if (!program.term || program.days.length === 0) {
    return new Response(null, { status: 303, headers: { Location: "/admin/program-igrzysk?error=1" } });
  }

  await setSiteSetting(env.DB, "program_igrzysk_json", JSON.stringify(program));
  await audit(env.DB, request, locals.admin, "program_igrzysk.update", { type: "program_igrzysk" }, `${program.days.length} dni`);

  return new Response(null, { status: 303, headers: { Location: "/admin/program-igrzysk?saved=1" } });
};
