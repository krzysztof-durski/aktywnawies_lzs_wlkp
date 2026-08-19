import { logAuditEvent } from "./db";

interface Actor {
  id: number;
  username: string;
}

const MAX_DIFF_VALUE_LENGTH = 200;

function truncate(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str.length > MAX_DIFF_VALUE_LENGTH ? `${str.slice(0, MAX_DIFF_VALUE_LENGTH)}…` : str;
}

/**
 * Field-level before/after diff for the audit log's `details` column — the whole
 * point of "who changed what" is being able to see the actual old/new values,
 * not just "title (foo)". Only changed keys are included; returns null when
 * nothing in `keys` actually changed (e.g. a save with no real edits).
 */
// `before`/`after` are typed loosely (not tied to one shared generic) on purpose —
// "after" is usually a small hand-built object with just the edited fields, not
// a full row, so forcing it to satisfy the row's full interface would defeat
// the point of only listing what actually changed.
export function diffFields(
  before: object | null | undefined,
  after: object,
  keys: string[],
): string | null {
  const b = before as Record<string, unknown> | null | undefined;
  const a = after as Record<string, unknown>;
  const changes: Record<string, { from: string; to: string }> = {};
  for (const key of keys) {
    const from = b?.[key] ?? null;
    const to = a[key] ?? null;
    if (from === to) continue;
    changes[key] = { from: truncate(from), to: truncate(to) };
  }
  return Object.keys(changes).length > 0 ? JSON.stringify(changes) : null;
}

/** Records what a deleted row actually contained, for the audit log's `details` column. */
export function snapshotFields(row: object | null | undefined, keys: string[]): string | null {
  if (!row) return null;
  const r = row as Record<string, unknown>;
  const snapshot: Record<string, string> = {};
  for (const key of keys) {
    const value = r[key];
    if (value === null || value === undefined || value === "") continue;
    snapshot[key] = truncate(value);
  }
  return Object.keys(snapshot).length > 0 ? JSON.stringify(snapshot) : null;
}

/** Thin wrapper over logAuditEvent that pulls ip/user-agent from the request — call after every admin mutation. */
export function audit(
  db: D1Database,
  request: Request,
  actor: Actor | null,
  action: string,
  target?: { type: string; id?: string | number | null },
  details?: string | null,
) {
  return logAuditEvent(db, {
    adminUserId: actor?.id ?? null,
    username: actor?.username ?? "unknown",
    action,
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    details: details ?? null,
    ip: request.headers.get("cf-connecting-ip"),
    userAgent: request.headers.get("user-agent"),
  });
}
