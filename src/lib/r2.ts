import { shortHash, slugify } from "./slugify";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

interface ImageSignature {
  mime: string;
  ext: string;
}

/**
 * Sniffs magic bytes rather than trusting the client-supplied Content-Type —
 * a renamed .php-as-.jpg or similarly mislabeled upload must fail here before
 * ever reaching R2.put().
 */
export function detectImageType(bytes: Uint8Array): ImageSignature | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, i) => bytes[i] === byte);
}

function assertSafeSegment(segment: string, label: string): void {
  if (!segment || segment.includes("..") || segment.includes("/") || segment.includes("\\")) {
    throw new Error(`Unsafe R2 key segment for ${label}`);
  }
}

// Keys are built from slugs + a random hash rather than the D1 row id, so the
// upload order can be R2.put() first, then the D1 insert (rollback the R2
// object if the insert fails) — no chicken-and-egg wait for an id that doesn't
// exist yet. The D1 row's `file_key` column is the actual source of truth for
// which object belongs to which record; the id isn't needed in the key itself.

export function buildGalleryImageKey(albumSlug: string, ext: string, thumb = false): string {
  const safeAlbum = slugify(albumSlug);
  assertSafeSegment(safeAlbum, "albumSlug");
  const suffix = thumb ? "-thumb" : "";
  return `gallery/${safeAlbum}/${shortHash()}${suffix}.${ext}`;
}

export function buildDocumentKey(category: string, title: string, ext: string): string {
  const safeCategory = slugify(category);
  assertSafeSegment(safeCategory, "category");
  return `documents/${safeCategory}/${shortHash()}-${slugify(title)}.${ext}`;
}

export function buildNewsCoverKey(ext: string): string {
  return `news/${shortHash()}-cover.${ext}`;
}

export function buildDisciplineCoverKey(ext: string): string {
  return `disciplines/${shortHash()}-cover.${ext}`;
}

export function buildKonkurencjeTileKey(ext: string): string {
  return `konkurencje-tiles/${shortHash()}.${ext}`;
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function putObject(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE_CONTROL },
  });
}

export async function deleteObject(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}
