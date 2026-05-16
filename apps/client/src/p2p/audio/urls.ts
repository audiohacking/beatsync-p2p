const P2P_PREFIX = "p2p://";

export function isP2PTrackUrl(url: string): boolean {
  return url.startsWith(P2P_PREFIX);
}

export function toP2PTrackUrl(trackId: string): string {
  return `${P2P_PREFIX}${trackId}`;
}

export function parseP2PTrackId(url: string): string | null {
  if (!isP2PTrackUrl(url)) return null;
  return url.slice(P2P_PREFIX.length) || null;
}
