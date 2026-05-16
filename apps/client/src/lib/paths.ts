/**
 * Base path for GitHub Pages (e.g. /beatsync-p2p).
 * Must match `basePath` in next.config.ts / NEXT_PUBLIC_BASE_PATH at build time.
 */
export function getBasePath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** True for `next build` with `output: 'export'` (GitHub Pages). */
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/**
 * App route for Next.js `Link` / `router` — do NOT prepend basePath; Next adds it automatically.
 */
export function appPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Absolute URL path for plain `<a href>`, manifest icons, etc. (outside Next's router).
 */
export function publicAssetPath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Join / share URL for a room code (works on static GitHub Pages). */
export function roomEntryPath(roomCode: string): string {
  return `${appPath("/")}?room=${encodeURIComponent(roomCode)}`;
}
