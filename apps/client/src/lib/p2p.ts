/** P2P mode is on by default; set NEXT_PUBLIC_P2P_MODE=0 to use legacy WebSocket server. */
export const IS_P2P_MODE = process.env.NEXT_PUBLIC_P2P_MODE !== "0";
