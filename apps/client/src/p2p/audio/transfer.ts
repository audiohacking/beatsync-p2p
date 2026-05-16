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
      mimeType: meta.mimeType ?? "audio/mpeg",
      blob: new Blob([data], { type: meta.mimeType ?? "audio/mpeg" }),
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
    mimeType: record.mimeType,
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
