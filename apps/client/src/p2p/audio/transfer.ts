import { normalizeAudioMimeType } from "@/lib/audioFormats";
import { parseP2PTrackId } from "@/p2p/audio/urls";
import { getLocalTrack, saveLocalTrack, type LocalTrackRecord } from "@/p2p/audio/localTracks";
import { joinRoom } from "trystero";

type TrysteroRoom = ReturnType<typeof joinRoom>;

let sendTrack: ((data: ArrayBuffer, peerId: string | null, metadata: TrackTransferMeta) => Promise<void>) | null = null;

export interface TrackTransferMeta {
  trackId: string;
  fileName: string;
  mimeType: string;
}

export function initP2PAudioTransfer(room: TrysteroRoom): void {
  const [send, get] = room.makeAction<ArrayBuffer>("audio-track");

  sendTrack = async (data, peerId, metadata) => {
    // Trystero metadata must be JSON-serializable plain objects
    await send(data, peerId, { ...metadata });
  };

  get(async (data, _peerId, metadata) => {
    const meta = metadata as TrackTransferMeta | undefined;
    if (!meta?.trackId) return;
    const record: LocalTrackRecord = {
      trackId: meta.trackId,
      fileName: meta.fileName ?? "track",
      mimeType: normalizeAudioMimeType(meta.mimeType ?? "", meta.fileName ?? ""),
      blob: new Blob([data], {
        type: normalizeAudioMimeType(meta.mimeType ?? "", meta.fileName ?? ""),
      }),
      createdAt: Date.now(),
    };
    await saveLocalTrack(record);
    window.dispatchEvent(new CustomEvent("p2p-track-received", { detail: { trackId: meta.trackId } }));
  });
}

export async function broadcastLocalTrackToRoom(room: TrysteroRoom, record: LocalTrackRecord): Promise<void> {
  if (!sendTrack) {
    initP2PAudioTransfer(room);
  }
  if (!sendTrack) return;

  const buffer = await record.blob.arrayBuffer();
  const meta: TrackTransferMeta = {
    trackId: record.trackId,
    fileName: record.fileName,
    mimeType: normalizeAudioMimeType(record.mimeType, record.fileName),
  };
  await sendTrack(buffer, null, meta);
}

export async function loadP2PTrackArrayBuffer(url: string): Promise<ArrayBuffer> {
  const trackId = parseP2PTrackId(url);
  if (!trackId) {
    throw new Error(`Invalid P2P track URL: ${url}`);
  }
  const record = await getLocalTrack(trackId);
  if (!record) {
    throw new Error(`Track not found locally: ${trackId}`);
  }
  return record.blob.arrayBuffer();
}
