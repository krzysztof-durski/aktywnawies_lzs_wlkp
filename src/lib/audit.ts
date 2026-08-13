import { logAuditEvent } from "./db";

interface Actor {
  id: number;
  username: string;
}

/** Thin wrapper over logAuditEvent that pulls ip/user-agent from the request — call after every admin mutation. */
export function audit(
  db: D1Database,
  request: Request,
  actor: Actor | null,
  action: string,
  target?: { type: string; id?: string | number | null },
  details?: string,
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
