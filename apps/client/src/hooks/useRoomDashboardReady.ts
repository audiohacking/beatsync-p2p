import { IS_P2P_MODE } from "@/lib/p2p";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { useGlobalStore } from "@/store/global";

/**
 * P2P: show the room UI once Trystero is attached (sync can finish in the background).
 * Server mode: require NTP sync before exposing controls.
 */
export function useRoomDashboardReady(): boolean {
  const isSynced = useGlobalStore((state) => state.isSynced);
  const isInitingSystem = useGlobalStore((state) => state.isInitingSystem);
  const p2pReady = useP2PConnectionStore((state) => state.isReady);

  if (IS_P2P_MODE) {
    return p2pReady && !isInitingSystem;
  }
  return isSynced && !isInitingSystem;
}
