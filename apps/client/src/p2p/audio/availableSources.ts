import type { AudioSourceType } from "@beatsync/shared";
import { coerceP2PPlaybackPermissions } from "@/p2p/permissions";
import { getLocalTrack } from "@/p2p/audio/localTracks";
import type { RoomCacheSnapshot, RoomPlaybackStateCache } from "@/p2p/roomCache";
import { isP2PTrackUrl, parseP2PTrackId } from "@/p2p/audio/urls";

/** Restore from localStorage / solo reload — require blob in IndexedDB. */
export type P2PSourceReconcileMode = "local-session" | "room";

/**
 * Drop P2P entries we cannot play locally. In room mode, keep remote playlist rows
 * that still carry a display name (peer may send the blob).
 */
export async function reconcileP2PAudioSources(
  sources: AudioSourceType[],
  mode: P2PSourceReconcileMode
): Promise<AudioSourceType[]> {
  const result: AudioSourceType[] = [];

  for (const source of sources) {
    if (!isP2PTrackUrl(source.url)) {
      result.push(source);
      continue;
    }

    const trackId = parseP2PTrackId(source.url);
    if (!trackId) continue;

    const record = await getLocalTrack(trackId);
    if (mode === "local-session" && !record) continue;
    if (mode === "room" && !record && !source.name) continue;

    result.push({
      ...source,
      name: source.name ?? record?.fileName,
    });
  }

  return result;
}

export function sanitizePlaybackStateForSources(
  playbackState: RoomPlaybackStateCache,
  sources: AudioSourceType[]
): RoomPlaybackStateCache {
  if (!playbackState.audioSource) return playbackState;
  if (sources.some((s) => s.url === playbackState.audioSource)) {
    return playbackState;
  }
  return {
    type: "paused",
    audioSource: "",
    serverTimeToExecute: 0,
    trackPositionSeconds: 0,
  };
}

export async function prepareRoomCacheSnapshot(
  snapshot: RoomCacheSnapshot,
  mode: P2PSourceReconcileMode
): Promise<RoomCacheSnapshot> {
  const audioSources = await reconcileP2PAudioSources(snapshot.audioSources, mode);
  return {
    ...snapshot,
    audioSources,
    playbackState: sanitizePlaybackStateForSources(snapshot.playbackState, audioSources),
    playbackControlsPermissions: coerceP2PPlaybackPermissions(snapshot.playbackControlsPermissions),
  };
}
