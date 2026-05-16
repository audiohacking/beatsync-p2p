import { validateFullRoomId } from "@/lib/room";

/** Trystero appId — must be unique across the Trystero network. */
export const TRYSTERO_APP_ID = "beatsync-p2p";

/** Protocol segment in room id; bump when wire protocol breaks compat. */
export const TRYSTERO_PROTOCOL_VERSION = "v1";

const ROOM_ID_PATTERN = /^beatsync-p2p-v\d+-(\d{6})$/;

/**
 * Maps UI room code (6 digits) → Trystero room id.
 * @example toTrysteroRoomId("482910") → "beatsync-p2p-v1-482910"
 */
export function toTrysteroRoomId(roomCode: string): string {
  if (!validateFullRoomId(roomCode)) {
    throw new Error(`Invalid room code: ${roomCode}`);
  }
  return `${TRYSTERO_APP_ID}-${TRYSTERO_PROTOCOL_VERSION}-${roomCode}`;
}

/** Extract 6-digit room code from a Trystero room id, or null if invalid. */
export function parseRoomCodeFromTrysteroRoomId(trysteroRoomId: string): string | null {
  const match = ROOM_ID_PATTERN.exec(trysteroRoomId);
  return match?.[1] ?? null;
}
