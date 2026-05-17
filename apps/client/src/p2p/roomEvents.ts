import type { P2PRoomCoordinator } from "@/p2p/host/P2PRoomCoordinator";
import type { WSResponseType } from "@beatsync/shared";

/** Keep the in-memory coordinator playlist aligned with network room events. */
export function applyCoordinatorFromRoomPayload(coordinator: P2PRoomCoordinator, payload: WSResponseType): void {
  if (payload.type !== "ROOM_EVENT") return;
  if (payload.event.type === "SET_AUDIO_SOURCES") {
    coordinator.applyNetworkAudioSources(payload.event.sources, payload.event.currentAudioSource);
  }
}
