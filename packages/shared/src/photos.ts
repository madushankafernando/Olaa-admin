/**
 * Photo URL builder — the ONLY place an image URL is made.
 *
 * The database stores only our own photo key, e.g. `users/<userId>/<photoId>`.
 * Never store a full CDN URL. To move CDN (or add signed URLs), change this file.
 *
 * Today: Cloudflare R2 bucket on a custom domain with Cloudflare Image Resizing
 *   https://<PHOTO_CDN>/cdn-cgi/image/width=600,height=800,fit=cover,format=auto/<key>
 */
export type PhotoSize = 'thumb' | 'card' | 'full';

export const PHOTO_SIZES: Record<PhotoSize, { width: number; height: number }> = {
  thumb: { width: 200, height: 200 },
  card: { width: 600, height: 800 },
  full: { width: 1200, height: 1600 },
};

/** Originals are kept untouched under this prefix (needed for re-processing or a future move). */
export const ORIGINALS_PREFIX = 'originals';

export function photoKey(userId: string, photoId: string): string {
  return `users/${userId}/${photoId}`;
}

export function originalKey(key: string): string {
  return `${ORIGINALS_PREFIX}/${key}`;
}

export interface PhotoUrlOptions {
  /** e.g. https://img.olaa.io — the custom domain bound to the R2 bucket. */
  cdnBaseUrl: string;
  /** Set false in local dev if Image Resizing isn't enabled on the zone. */
  resizing?: boolean;
}

export function buildPhotoUrl(key: string, size: PhotoSize, opts: PhotoUrlOptions): string {
  const base = opts.cdnBaseUrl.replace(/\/+$/, '');
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  if (opts.resizing === false) return `${base}/${originalKey(safeKey)}`;
  const { width, height } = PHOTO_SIZES[size];
  return `${base}/cdn-cgi/image/width=${width},height=${height},fit=cover,format=auto/${originalKey(safeKey)}`;
}
