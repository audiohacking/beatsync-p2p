import type { ClientDataType } from "./types/WSBroadcast";
import { GRID } from "./types/basic";

// Epoch now in milliseconds (high precision)
export const epochNow = () => performance.timeOrigin + performance.now();

/** Position clients in a circle around the grid origin (used by host peer). */
export function positionClientsInCircle(clients: ClientDataType[]): void {
  const clientCount = clients.length;
  if (clientCount === 0) return;

  if (clientCount === 1) {
    const client = clients[0];
    client.position = {
      x: GRID.ORIGIN_X,
      y: GRID.ORIGIN_Y - 25,
    };
    return;
  }

  let index = 0;
  clients.forEach((client) => {
    const angle = (index / clientCount) * 2 * Math.PI - Math.PI / 2;
    client.position = {
      x: GRID.ORIGIN_X + GRID.CLIENT_RADIUS * Math.cos(angle),
      y: GRID.ORIGIN_Y + GRID.CLIENT_RADIUS * Math.sin(angle),
    };
    index++;
  });
}

/** Smallest peer id is host (deterministic across peers). */
export function electHostPeerId(peerIds: string[]): string | null {
  if (peerIds.length === 0) return null;
  return [...peerIds].sort()[0] ?? null;
}
