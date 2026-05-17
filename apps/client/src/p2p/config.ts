import { TRYSTERO_APP_ID } from "./constants";

/** Stable config object — must not be recreated each render (Trystero / React hook). */
export const TRYSTERO_ROOM_CONFIG = {
  appId: TRYSTERO_APP_ID,
} as const;

export function getTrysteroConfig() {
  return TRYSTERO_ROOM_CONFIG;
}
