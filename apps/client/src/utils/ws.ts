import { IS_P2P_MODE } from "@/lib/p2p";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { WSRequestType } from "@beatsync/shared";

export const sendWSRequest = ({ ws, request }: { ws?: WebSocket | null; request: WSRequestType }) => {
  if (IS_P2P_MODE) {
    useP2PConnectionStore.getState().sendRequest(request);
    return;
  }
  if (!ws) {
    console.warn("[WS] No socket available for request", request.type);
    return;
  }
  ws.send(JSON.stringify(request));
};
