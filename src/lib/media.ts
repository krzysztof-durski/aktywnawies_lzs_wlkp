/**
 * Builds a public URL for an R2 object key. Once `MEDIA_BASE_URL` is set (after
 * `wrangler r2 bucket domain add`), this points straight at the CDN-served
 * custom domain — zero Worker CPU. Until then it falls back to the
 * `/media/[...key]` Worker route, which streams the object out of the
 * `MEDIA_BUCKET` binding directly; that keeps local dev and any interim
 * deploy fully working before the custom domain exists.
 */
export function mediaUrl(baseUrl: string, key: string): string {
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `/media/${key}`;
}
