import { trimFileName } from "@/lib/utils";
import { isP2PTrackUrl } from "@/p2p/audio/urls";
import type { AudioSourceType } from "@beatsync/shared";

/** Human-readable queue / title label — never surface raw P2P track ids. */
export function getAudioSourceDisplayName(source: AudioSourceType): string {
  if (source.name) return trimFileName(source.name);
  if (isP2PTrackUrl(source.url)) return "Track";
  const parts = source.url.split("/");
  const last = parts[parts.length - 1];
  if (!last) return "Track";
  try {
    return trimFileName(decodeURIComponent(last));
  } catch {
    return trimFileName(last);
  }
}
