/** Delays for re-announcing room state while Trystero data channels come up. */
export const ROOM_SYNC_RETRY_DELAYS_MS = [0, 1500, 4000, 8000, 15000] as const;

export const TRACK_PUSH_RETRY_DELAYS_MS = [0, 2000, 5000] as const;

let syncGeneration = 0;

export function beginRoomSyncGeneration(): number {
  syncGeneration += 1;
  return syncGeneration;
}

export function isCurrentRoomSyncGeneration(generation: number): boolean {
  return generation === syncGeneration;
}

export function scheduleRoomSyncRetries(runSync: () => void, generation: number): void {
  for (const delayMs of ROOM_SYNC_RETRY_DELAYS_MS) {
    setTimeout(() => {
      if (!isCurrentRoomSyncGeneration(generation)) return;
      runSync();
    }, delayMs);
  }
}

export function scheduleTrackPushRetries(runPush: () => void): void {
  for (const delayMs of TRACK_PUSH_RETRY_DELAYS_MS) {
    setTimeout(() => void runPush(), delayMs);
  }
}
