import { IS_P2P_MODE } from "@/lib/p2p";
import type { ClientDataType, PlaybackControlsPermissionsType } from "@beatsync/shared";
import { NTP_CONSTANTS, PlaybackControlsPermissionsEnum } from "@beatsync/shared";

/** In P2P mode every connected peer may play, upload, and control the room. */
export const P2P_DEFAULT_PLAYBACK_PERMISSIONS = PlaybackControlsPermissionsEnum.enum.EVERYONE;

/** Fewer probes required before playback in P2P (Trystero RTT is noisier than a dedicated server). */
export const P2P_NTP_MEASUREMENTS_REQUIRED = 6;

export function isP2PEqualPeerMode(): boolean {
  return IS_P2P_MODE;
}

export function coerceP2PPlaybackPermissions(
  permissions: PlaybackControlsPermissionsType
): PlaybackControlsPermissionsType {
  if (!IS_P2P_MODE) return permissions;
  return P2P_DEFAULT_PLAYBACK_PERMISSIONS;
}

/** No admin hierarchy in P2P — every peer in the roster can control the room. */
export function normalizeP2PClient(client: ClientDataType): ClientDataType {
  if (!IS_P2P_MODE) return client;
  return { ...client, isAdmin: true };
}

export function normalizeP2PClientRoster(clients: ClientDataType[]): ClientDataType[] {
  if (!IS_P2P_MODE) return clients;
  return clients.map(normalizeP2PClient);
}

export function getNtpMeasurementsRequired(): number {
  return IS_P2P_MODE ? P2P_NTP_MEASUREMENTS_REQUIRED : NTP_CONSTANTS.MAX_MEASUREMENTS;
}
