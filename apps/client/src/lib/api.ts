import { IS_P2P_MODE } from "@/lib/p2p";
import { broadcastLocalTrackToRoom } from "@/p2p/audio/transfer";
import { saveLocalTrack } from "@/p2p/audio/localTracks";
import { toP2PTrackUrl } from "@/p2p/audio/urls";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import type { DiscoverRoomsType, GetActiveRoomsType, GetDefaultAudioType } from "@beatsync/shared";
import { ClientActionEnum } from "@beatsync/shared";
import { nanoid } from "nanoid";
import { getLocalTrack } from "@/p2p/audio/localTracks";
import { isP2PTrackUrl, parseP2PTrackId } from "@/p2p/audio/urls";

export const uploadAudioFile = async (data: { file: File; roomId: string }) => {
  if (!IS_P2P_MODE) {
    throw new Error("Server upload is disabled in this fork. Use P2P mode.");
  }

  const trackId = nanoid();
  const url = toP2PTrackUrl(trackId);
  const record = {
    trackId,
    fileName: data.file.name,
    mimeType: data.file.type || "audio/mpeg",
    blob: data.file,
    createdAt: Date.now(),
  };

  await saveLocalTrack(record);

  const p2p = useP2PConnectionStore.getState();
  if (!p2p.isReady) {
    throw new Error("Room connection is still starting — try again in a moment");
  }

  p2p.sendRequest({
    type: ClientActionEnum.enum.REGISTER_AUDIO_SOURCE,
    source: { url },
  });

  const room = p2p.room;
  if (room) {
    void broadcastLocalTrackToRoom(room, record);
  }

  return { success: true, publicUrl: url };
};

export const fetchAudio = async (url: string) => {
  if (isP2PTrackUrl(url)) {
    const trackId = parseP2PTrackId(url);
    if (!trackId) throw new Error("Invalid P2P track URL");
    const record = await getLocalTrack(trackId);
    if (!record) throw new Error(`Track not available: ${trackId}`);
    return record.blob;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }
  return await response.blob();
};

export async function fetchDefaultAudioSources(): Promise<GetDefaultAudioType> {
  return [];
}

export async function fetchActiveRooms(): Promise<GetActiveRoomsType> {
  return 0;
}

export async function fetchDiscoverRooms(): Promise<DiscoverRoomsType> {
  return [];
}
