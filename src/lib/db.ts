// Every query in this codebase goes through here. Rule: SQL text is always a
// static string literal; user-controlled values are only ever passed via
// `.bind(...)`, never interpolated into the SQL string. That's what makes
// injection structurally impossible — keep it that way in every new query.

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  password_algo: string;
  created_at: string;
  disabled: number;
}

export interface Session {
  id: string;
  admin_user_id: number;
  created_at: string;
  expires_at: string;
  user_agent: string | null;
  ip: string | null;
}

export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_image_key: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface DocumentRow {
  id: number;
  title: string;
  file_key: string;
  file_size: number | null;
  mime_type: string;
  category: string;
  discipline: string | null;
  sort_order: number;
  published: number;
  created_at: string;
  uploaded_by: number | null;
}

export interface GalleryAlbum {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cover_image_id: number | null;
  sort_order: number;
  created_at: string;
  is_private: number;
}

export interface GalleryImage {
  id: number;
  album_id: number;
  file_key: string;
  thumb_key: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
  uploaded_by: number | null;
  exclude_from_main: number;
  featured: number;
  featured_order: number;
  featured_full_width: number;
}

export interface Discipline {
  id: number;
  slug: string;
  title: string;
  body_html: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
  cover_image_key: string | null;
  regulamin_key: string | null;
  regulamin_text: string | null;
  listy_startowe_key: string | null;
  wyniki_key: string | null;
  section: string | null;
}

// Known section labels, matching the regulamin's own headings — shown as
// suggestions in the admin form, but the field itself is free text so new
// sections can be introduced without a code change.
export const KNOWN_DISCIPLINE_SECTIONS = [
  "Konkurencje sportowo-rekreacyjne",
  "Ludowe Gry Sportowe",
  "Imprezy towarzyszące",
];

export const UNSECTIONED_DISCIPLINES_LABEL = "Pozostałe konkurencje";

/** Buckets disciplines by `section`, ordered: known sections (regulamin order) first, then any custom section in first-seen order, then unsectioned rows last. */
export function groupDisciplinesBySection(disciplines: Discipline[]): Map<string, Discipline[]> {
  const bySection = new Map<string, Discipline[]>();
  for (const d of disciplines) {
    const key = d.section || UNSECTIONED_DISCIPLINES_LABEL;
    const list = bySection.get(key) ?? [];
    list.push(d);
    bySection.set(key, list);
  }
  const order = [
    ...KNOWN_DISCIPLINE_SECTIONS.filter((s) => bySection.has(s)),
    ...Array.from(bySection.keys()).filter(
      (s) => s !== UNSECTIONED_DISCIPLINES_LABEL && !KNOWN_DISCIPLINE_SECTIONS.includes(s),
    ),
    ...(bySection.has(UNSECTIONED_DISCIPLINES_LABEL) ? [UNSECTIONED_DISCIPLINES_LABEL] : []),
  ];
  return new Map(order.map((key) => [key, bySection.get(key)!]));
}

export function listPublishedNews(db: D1Database, limit = 20) {
  return db
    .prepare(
      `SELECT * FROM news_posts
       WHERE status = 'published'
       ORDER BY published_at DESC
       LIMIT ?1`,
    )
    .bind(limit)
    .all<NewsPost>();
}

export function getNewsBySlug(db: D1Database, slug: string) {
  return db
    .prepare("SELECT * FROM news_posts WHERE slug = ?1 AND status = 'published'")
    .bind(slug)
    .first<NewsPost>();
}

export function listDocumentsByCategory(db: D1Database, category: string) {
  return db
    .prepare(
      `SELECT * FROM documents
       WHERE category = ?1 AND published = 1
       ORDER BY sort_order ASC, created_at DESC`,
    )
    .bind(category)
    .all<DocumentRow>();
}

export function listDocumentsByDiscipline(db: D1Database, discipline: string) {
  return db
    .prepare(
      `SELECT * FROM documents
       WHERE discipline = ?1 AND published = 1
       ORDER BY sort_order ASC, created_at DESC`,
    )
    .bind(discipline)
    .all<DocumentRow>();
}

export function listAllPublishedDocuments(db: D1Database) {
  return db
    .prepare(
      `SELECT * FROM documents
       WHERE published = 1
       ORDER BY category ASC, sort_order ASC, created_at DESC`,
    )
    .all<DocumentRow>();
}

export function listAllDocumentsAdmin(db: D1Database) {
  return db
    .prepare("SELECT * FROM documents ORDER BY category ASC, sort_order ASC, created_at DESC")
    .all<DocumentRow>();
}

const KNOWN_DOCUMENT_CATEGORIES = ["klasyfikacje"];

export async function listDocumentCategorySuggestions(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare("SELECT DISTINCT category FROM documents ORDER BY category ASC").all<{
    category: string;
  }>();
  const existing = results.map((r) => r.category);
  return Array.from(new Set([...KNOWN_DOCUMENT_CATEGORIES, ...existing]));
}

export interface DocumentInput {
  title: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  category: string;
  discipline: string | null;
}

export function createDocument(db: D1Database, input: DocumentInput, uploadedBy: number) {
  return db
    .prepare(
      `INSERT INTO documents (title, file_key, file_size, mime_type, category, discipline, uploaded_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(input.title, input.fileKey, input.fileSize, input.mimeType, input.category, input.discipline, uploadedBy)
    .run();
}

export function getDocumentById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).first<DocumentRow>();
}

export interface DocumentUpdateInput {
  title: string;
  category: string;
  discipline: string | null;
  /** Only set when the file itself was replaced; leave undefined to keep the existing R2 object. */
  fileKey?: string;
  fileSize?: number;
}

export function updateDocument(db: D1Database, id: number, input: DocumentUpdateInput) {
  if (input.fileKey !== undefined) {
    return db
      .prepare(
        `UPDATE documents SET title = ?1, category = ?2, discipline = ?3, file_key = ?4, file_size = ?5 WHERE id = ?6`,
      )
      .bind(input.title, input.category, input.discipline, input.fileKey, input.fileSize ?? null, id)
      .run();
  }
  return db
    .prepare(`UPDATE documents SET title = ?1, category = ?2, discipline = ?3 WHERE id = ?4`)
    .bind(input.title, input.category, input.discipline, id)
    .run();
}

export function deleteDocument(db: D1Database, id: number) {
  return db.prepare("DELETE FROM documents WHERE id = ?1").bind(id).run();
}

/** All disciplines, for rendering the Konkurencje nav flyout in one query. */
export function listAllDisciplines(db: D1Database) {
  return db
    .prepare("SELECT * FROM disciplines ORDER BY sort_order ASC, title ASC")
    .all<Discipline>();
}

export function getDiscipline(db: D1Database, slug: string) {
  return db
    .prepare("SELECT * FROM disciplines WHERE slug = ?1")
    .bind(slug)
    .first<Discipline>();
}

/** All albums, including private ones — admin use only. */
export function listGalleryAlbums(db: D1Database) {
  return db
    .prepare("SELECT * FROM gallery_albums ORDER BY sort_order ASC, created_at DESC")
    .all<GalleryAlbum>();
}

/** Public gallery listing — private albums (used e.g. to stage carousel-only photos) never appear here. */
export function listPublicGalleryAlbums(db: D1Database) {
  return db
    .prepare("SELECT * FROM gallery_albums WHERE is_private = 0 ORDER BY sort_order ASC, created_at DESC")
    .all<GalleryAlbum>();
}

/**
 * The "main" gallery is a virtual aggregation, not a real album row: every
 * image from every public album, unless that specific image was marked
 * excluded. Keeps a single source of truth (the image's own album_id) instead
 * of duplicating rows into a second album whenever something is uploaded.
 */
export function listMainGalleryImages(db: D1Database) {
  return db
    .prepare(
      `SELECT gi.* FROM gallery_images gi
       JOIN gallery_albums ga ON ga.id = gi.album_id
       WHERE gi.exclude_from_main = 0 AND ga.is_private = 0
       ORDER BY gi.created_at DESC`,
    )
    .all<GalleryImage>();
}

export function getMainGalleryCoverImage(db: D1Database) {
  return db
    .prepare(
      `SELECT gi.* FROM gallery_images gi
       JOIN gallery_albums ga ON ga.id = gi.album_id
       WHERE gi.exclude_from_main = 0 AND ga.is_private = 0
       ORDER BY gi.created_at DESC LIMIT 1`,
    )
    .first<GalleryImage>();
}

/** Featured ("Wyróżnij") images for the homepage carousel — independent of album privacy, ordered by its own `featured_order`. */
export function listFeaturedImages(db: D1Database) {
  return db
    .prepare("SELECT * FROM gallery_images WHERE featured = 1 ORDER BY featured_order ASC, created_at DESC")
    .all<GalleryImage>();
}

export function getGalleryAlbumCoverImage(db: D1Database, album: GalleryAlbum) {
  if (album.cover_image_id) {
    return db
      .prepare("SELECT * FROM gallery_images WHERE id = ?1")
      .bind(album.cover_image_id)
      .first<GalleryImage>();
  }
  return db
    .prepare(
      "SELECT * FROM gallery_images WHERE album_id = ?1 ORDER BY sort_order ASC, created_at ASC LIMIT 1",
    )
    .bind(album.id)
    .first<GalleryImage>();
}

export function getGalleryAlbum(db: D1Database, slug: string) {
  return db
    .prepare("SELECT * FROM gallery_albums WHERE slug = ?1")
    .bind(slug)
    .first<GalleryAlbum>();
}

export function getGalleryAlbumById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM gallery_albums WHERE id = ?1").bind(id).first<GalleryAlbum>();
}

export function createGalleryAlbum(
  db: D1Database,
  slug: string,
  title: string,
  description: string,
  sortOrder: number,
  isPrivate: boolean,
) {
  return db
    .prepare(
      `INSERT INTO gallery_albums (slug, title, description, sort_order, is_private) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(slug, title, description, sortOrder, isPrivate ? 1 : 0)
    .run();
}

export function deleteGalleryAlbum(db: D1Database, id: number) {
  return db.prepare("DELETE FROM gallery_albums WHERE id = ?1").bind(id).run();
}

export function getGalleryImageById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM gallery_images WHERE id = ?1").bind(id).first<GalleryImage>();
}

export interface GalleryImageInput {
  albumId: number;
  fileKey: string;
  caption: string | null;
}

export function createGalleryImages(db: D1Database, images: GalleryImageInput[], uploadedBy: number) {
  const statements = images.map((img) =>
    db
      .prepare(
        `INSERT INTO gallery_images (album_id, file_key, caption, uploaded_by) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(img.albumId, img.fileKey, img.caption, uploadedBy),
  );
  return db.batch(statements);
}

export function deleteGalleryImage(db: D1Database, id: number) {
  return db.prepare("DELETE FROM gallery_images WHERE id = ?1").bind(id).run();
}

export function updateGalleryImageFlags(
  db: D1Database,
  id: number,
  flags: { excludeFromMain: boolean; featured: boolean; featuredOrder: number },
) {
  return db
    .prepare(
      `UPDATE gallery_images SET exclude_from_main = ?1, featured = ?2, featured_order = ?3 WHERE id = ?4`,
    )
    .bind(flags.excludeFromMain ? 1 : 0, flags.featured ? 1 : 0, flags.featuredOrder, id)
    .run();
}

export interface BulkFlagUpdate {
  id: number;
  featured: boolean;
  caption: string | null;
}

/**
 * Preserves each image's existing featured_order (ordering is Karuzela-only) and
 * exclude_from_main (no UI sets this anymore — untouched here means it's never
 * silently reset, unlike writing a false default every save would do).
 */
export async function bulkUpdateGalleryImageFlags(db: D1Database, updates: BulkFlagUpdate[]) {
  if (updates.length === 0) return;
  const placeholders = updates.map((_, i) => `?${i + 1}`).join(",");
  const { results: existing } = await db
    .prepare(`SELECT id, featured_order FROM gallery_images WHERE id IN (${placeholders})`)
    .bind(...updates.map((u) => u.id))
    .all<{ id: number; featured_order: number }>();
  const orderById = new Map(existing.map((row) => [row.id, row.featured_order]));

  const statements = updates.map((u) =>
    db
      .prepare("UPDATE gallery_images SET featured = ?1, featured_order = ?2, caption = ?3 WHERE id = ?4")
      .bind(u.featured ? 1 : 0, orderById.get(u.id) ?? 0, u.caption, u.id),
  );
  return db.batch(statements);
}

export function listGalleryImages(db: D1Database, albumId: number) {
  return db
    .prepare(
      "SELECT * FROM gallery_images WHERE album_id = ?1 ORDER BY sort_order ASC, created_at ASC",
    )
    .bind(albumId)
    .all<GalleryImage>();
}

export function getAdminUserByUsername(db: D1Database, username: string) {
  return db
    .prepare("SELECT * FROM admin_users WHERE username = ?1 AND disabled = 0")
    .bind(username)
    .first<AdminUser>();
}

export function createSession(
  db: D1Database,
  tokenHash: string,
  adminUserId: number,
  expiresAt: string,
  userAgent: string | null,
  ip: string | null,
) {
  return db
    .prepare(
      `INSERT INTO sessions (id, admin_user_id, expires_at, user_agent, ip)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(tokenHash, adminUserId, expiresAt, userAgent, ip)
    .run();
}

export function getValidSessionByTokenHash(db: D1Database, tokenHash: string) {
  return db
    .prepare(
      `SELECT sessions.*, admin_users.username AS admin_username
       FROM sessions
       JOIN admin_users ON admin_users.id = sessions.admin_user_id
       WHERE sessions.id = ?1 AND sessions.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         AND admin_users.disabled = 0`,
    )
    .bind(tokenHash)
    .first<Session & { admin_username: string }>();
}

export function deleteSession(db: D1Database, tokenHash: string) {
  return db.prepare("DELETE FROM sessions WHERE id = ?1").bind(tokenHash).run();
}

export function listAllNews(db: D1Database) {
  return db.prepare("SELECT * FROM news_posts ORDER BY created_at DESC").all<NewsPost>();
}

export function getNewsPostById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM news_posts WHERE id = ?1").bind(id).first<NewsPost>();
}

export interface NewsInput {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  status: "draft" | "published";
  /** undefined = leave the existing cover image alone (update only); null = explicitly clear it. */
  coverImageKey?: string | null;
}

export function createNewsPost(db: D1Database, input: NewsInput, createdBy: number) {
  return db
    .prepare(
      `INSERT INTO news_posts (slug, title, excerpt, body_html, status, published_at, cover_image_key, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, CASE WHEN ?5 = 'published' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END, ?6, ?7)`,
    )
    .bind(input.slug, input.title, input.excerpt, input.bodyHtml, input.status, input.coverImageKey ?? null, createdBy)
    .run();
}

export function updateNewsPost(db: D1Database, id: number, input: NewsInput) {
  if (input.coverImageKey === undefined) {
    return db
      .prepare(
        `UPDATE news_posts SET
           slug = ?1, title = ?2, excerpt = ?3, body_html = ?4, status = ?5,
           published_at = CASE WHEN ?5 = 'published' THEN COALESCE(published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ELSE published_at END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?6`,
      )
      .bind(input.slug, input.title, input.excerpt, input.bodyHtml, input.status, id)
      .run();
  }
  return db
    .prepare(
      `UPDATE news_posts SET
         slug = ?1, title = ?2, excerpt = ?3, body_html = ?4, status = ?5, cover_image_key = ?6,
         published_at = CASE WHEN ?5 = 'published' THEN COALESCE(published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ELSE published_at END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?7`,
    )
    .bind(input.slug, input.title, input.excerpt, input.bodyHtml, input.status, input.coverImageKey, id)
    .run();
}

export function deleteNewsPost(db: D1Database, id: number) {
  return db.prepare("DELETE FROM news_posts WHERE id = ?1").bind(id).run();
}

export function listAllDisciplinesAdmin(db: D1Database) {
  return db
    .prepare("SELECT * FROM disciplines ORDER BY sort_order ASC, title ASC")
    .all<Discipline>();
}

export function getDisciplineById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM disciplines WHERE id = ?1").bind(id).first<Discipline>();
}

export interface DisciplineInput {
  slug: string;
  title: string;
  bodyHtml: string;
  sortOrder: number;
  coverImageKey: string | null;
  regulaminKey: string | null;
  regulaminText: string | null;
  listyStartoweKey: string | null;
  wynikiKey: string | null;
  section: string | null;
}

export function createDiscipline(db: D1Database, input: DisciplineInput, updatedBy: number) {
  return db
    .prepare(
      `INSERT INTO disciplines
         (slug, title, body_html, sort_order, cover_image_key, regulamin_key, regulamin_text, listy_startowe_key, wyniki_key, section, updated_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    )
    .bind(
      input.slug,
      input.title,
      input.bodyHtml,
      input.sortOrder,
      input.coverImageKey,
      input.regulaminKey,
      input.regulaminText,
      input.listyStartoweKey,
      input.wynikiKey,
      input.section,
      updatedBy,
    )
    .run();
}

export function updateDiscipline(db: D1Database, id: number, input: DisciplineInput, updatedBy: number) {
  return db
    .prepare(
      `UPDATE disciplines SET
         slug = ?1, title = ?2, body_html = ?3, sort_order = ?4, cover_image_key = ?5,
         regulamin_key = ?6, regulamin_text = ?7, listy_startowe_key = ?8, wyniki_key = ?9, section = ?10,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?11
       WHERE id = ?12`,
    )
    .bind(
      input.slug,
      input.title,
      input.bodyHtml,
      input.sortOrder,
      input.coverImageKey,
      input.regulaminKey,
      input.regulaminText,
      input.listyStartoweKey,
      input.wynikiKey,
      input.section,
      updatedBy,
      id,
    )
    .run();
}

export function deleteDiscipline(db: D1Database, id: number) {
  return db.prepare("DELETE FROM disciplines WHERE id = ?1").bind(id).run();
}

export interface DashboardCounts {
  newsCount: number;
  documentsCount: number;
  albumsCount: number;
  imagesCount: number;
  disciplinesCount: number;
}

export async function getDashboardCounts(db: D1Database): Promise<DashboardCounts> {
  const [news, documents, albums, images, disciplines] = await db.batch<{ n: number }>([
    db.prepare("SELECT COUNT(*) AS n FROM news_posts"),
    db.prepare("SELECT COUNT(*) AS n FROM documents"),
    db.prepare("SELECT COUNT(*) AS n FROM gallery_albums"),
    db.prepare("SELECT COUNT(*) AS n FROM gallery_images"),
    db.prepare("SELECT COUNT(*) AS n FROM disciplines"),
  ]);
  return {
    newsCount: news.results[0]?.n ?? 0,
    documentsCount: documents.results[0]?.n ?? 0,
    albumsCount: albums.results[0]?.n ?? 0,
    imagesCount: images.results[0]?.n ?? 0,
    disciplinesCount: disciplines.results[0]?.n ?? 0,
  };
}

// --- Carousel ordering -----------------------------------------------------

export interface CarouselOrderUpdate {
  id: number;
  fullWidth: boolean;
}

/** Applied from the drag-and-drop "Karuzela zdjęć" panel — index in `updates` becomes the new featured_order. */
export function saveCarouselOrder(db: D1Database, updates: CarouselOrderUpdate[]) {
  const statements = updates.map((u, index) =>
    db
      .prepare("UPDATE gallery_images SET featured_order = ?1, featured_full_width = ?2 WHERE id = ?3")
      .bind(index, u.fullWidth ? 1 : 0, u.id),
  );
  return db.batch(statements);
}

// --- Admin users / roles -----------------------------------------------------

export function listAdminUsers(db: D1Database) {
  return db
    .prepare("SELECT * FROM admin_users ORDER BY created_at ASC")
    .all<AdminUser>();
}

export function createAdminUser(
  db: D1Database,
  username: string,
  passwordHash: string,
  passwordSalt: string,
) {
  return db
    .prepare("INSERT INTO admin_users (username, password_hash, password_salt) VALUES (?1, ?2, ?3)")
    .bind(username, passwordHash, passwordSalt)
    .run();
}

export function getAdminUserById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM admin_users WHERE id = ?1").bind(id).first<AdminUser>();
}

export function setAdminUserDisabled(db: D1Database, id: number, disabled: boolean) {
  return db.prepare("UPDATE admin_users SET disabled = ?1 WHERE id = ?2").bind(disabled ? 1 : 0, id).run();
}

// --- Audit log -----------------------------------------------------
// Write-only from the app; read via the D1 dashboard/wrangler (see README).

export interface AuditLogInput {
  adminUserId: number | null;
  username: string;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: string | null;
  ip: string | null;
  userAgent: string | null;
}

export function logAuditEvent(db: D1Database, entry: AuditLogInput) {
  return db
    .prepare(
      `INSERT INTO audit_log (admin_user_id, username, action, target_type, target_id, details, ip, user_agent)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      entry.adminUserId,
      entry.username,
      entry.action,
      entry.targetType ?? null,
      entry.targetId !== undefined && entry.targetId !== null ? String(entry.targetId) : null,
      entry.details ?? null,
      entry.ip,
      entry.userAgent,
    )
    .run();
}

// --- Site settings -----------------------------------------------------

export async function isSiteOffline(db: D1Database): Promise<boolean> {
  const row = await db.prepare("SELECT value FROM site_settings WHERE key = 'site_offline'").first<{
    value: string;
  }>();
  return row?.value === "1";
}

export async function getSiteOfflineMessage(db: D1Database): Promise<string> {
  const row = await db.prepare("SELECT value FROM site_settings WHERE key = 'site_offline_message'").first<{
    value: string;
  }>();
  return row?.value ?? "Strona jest tymczasowo niedostępna.";
}

export function setSiteSetting(db: D1Database, key: string, value: string) {
  return db
    .prepare("INSERT INTO site_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, value)
    .run();
}

