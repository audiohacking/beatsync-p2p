import type { AudioSourceType, ChatMessageType, PlaybackControlsPermissionsType } from "@beatsync/shared";
import { LOW_PASS_CONSTANTS } from "@beatsync/shared";

export interface RoomPlaybackStateCache {
  type: "playing" | "paused";
  audioSource: string;
  serverTimeToExecute: number;
  trackPositionSeconds: number;
}

export interface RoomCacheSnapshot {
  version: number;
  updatedAt: number;
  audioSources: AudioSourceType[];
  playbackState: RoomPlaybackStateCache;
  playbackControlsPermissions: PlaybackControlsPermissionsType;
  globalVolume: number;
  lowPassFreq: number;
  isMetronomeEnabled: boolean;
  chatMessages: ChatMessageType[];
  chatNextMessageId: number;
}

const STORAGE_PREFIX = "beatsync-p2p-room-";

function storageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode}`;
}

export function computeCacheRichness(snapshot: RoomCacheSnapshot): number {
  let score = snapshot.audioSources.length * 100;
  score += snapshot.chatMessages.length * 2;
  if (snapshot.playbackState.audioSource) score += 50;
  if (snapshot.playbackState.type === "playing") score += 25;
  return score;
}

export function loadRoomCache(roomCode: string): RoomCacheSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomCacheSnapshot;
    if (!Array.isArray(parsed.audioSources)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRoomCache(roomCode: string, snapshot: RoomCacheSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const enriched: RoomCacheSnapshot = {
      ...snapshot,
      updatedAt: Date.now(),
    };
    localStorage.setItem(storageKey(roomCode), JSON.stringify(enriched));
  } catch (e) {
    console.warn("[P2P cache] Failed to persist room state", e);
  }
}

export function createEmptyRoomCache(): RoomCacheSnapshot {
  return {
    version: 1,
    updatedAt: 0,
    audioSources: [],
    playbackState: {
      type: "paused",
      audioSource: "",
      serverTimeToExecute: 0,
      trackPositionSeconds: 0,
    },
    playbackControlsPermissions: "ADMIN_ONLY",
    globalVolume: 1,
    lowPassFreq: LOW_PASS_CONSTANTS.MAX_FREQ,
    isMetronomeEnabled: false,
    chatMessages: [],
    chatNextMessageId: 1,
  };
}

/**
 * Merge remote snapshot into local. Local cache wins when it is strictly richer
 * (rejoining participant propagates authoritative state to newcomers).
 */
export function mergeRoomCaches(
  local: RoomCacheSnapshot | null,
  remote: RoomCacheSnapshot
): { merged: RoomCacheSnapshot; acceptedRemote: boolean } {
  if (!local || computeCacheRichness(local) === 0) {
    return { merged: remote, acceptedRemote: true };
  }

  const localRichness = computeCacheRichness(local);
  const remoteRichness = computeCacheRichness(remote);

  if (localRichness > remoteRichness) {
    return { merged: local, acceptedRemote: false };
  }
  if (remoteRichness > localRichness) {
    return { merged: remote, acceptedRemote: true };
  }
  if (remote.updatedAt > local.updatedAt) {
    return { merged: remote, acceptedRemote: true };
  }
  return { merged: local, acceptedRemote: false };
}
