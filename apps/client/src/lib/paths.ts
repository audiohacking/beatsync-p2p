/**
 * Base path for GitHub Pages (e.g. /beatsync-p2p).
 * Set NEXT_PUBLIC_BASE_PATH at build time; must match repo/project Pages path.
 */
export function getBasePath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** Prefix an app route for Link/router (e.g. /room/123 → /beatsync-p2p/room/123). */
export function appPath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}
