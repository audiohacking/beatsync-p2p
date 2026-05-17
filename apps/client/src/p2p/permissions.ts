import { IS_P2P_MODE } from "@/lib/p2p";
import type { PlaybackControlsPermissionsType } from "@beatsync/shared";
import { PlaybackControlsPermissionsEnum } from "@beatsync/shared";

/** In P2P mode every connected peer may play, upload, and control the room. */
export const P2P_DEFAULT_PLAYBACK_PERMISSIONS = PlaybackControlsPermissionsEnum.enum.EVERYONE;

export function isP2PEqualPeerMode(): boolean {
  return IS_P2P_MODE;
}

export function coerceP2PPlaybackPermissions(
  permissions: PlaybackControlsPermissionsType
): PlaybackControlsPermissionsType {
  if (!IS_P2P_MODE) return permissions;
  return P2P_DEFAULT_PLAYBACK_PERMISSIONS;
}
