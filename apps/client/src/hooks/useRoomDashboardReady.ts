import { IS_P2P_MODE } from "@/lib/p2p";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { useGlobalStore } from "@/store/global";

/**
 * P2P: show the room UI once Trystero is attached (sync can finish in the background).
 * Server mode: require NTP sync before exposing controls.
 */
export function useRoomDashboardReady(): boolean {
  const p2pReady = useP2PConnectionStore((state) => state.isReady);
  const isSynced = useGlobalStore((state) => state.isSynced);
  const isInitingSystem = useGlobalStore((state) => state.isInitingSystem);

  if (IS_P2P_MODE) {
    // P2P: show the room as soon as Trystero attaches; clock sync continues in the background.
    return p2pReady;
  }
  return isSynced && !isInitingSystem;
}
