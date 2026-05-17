import { normalizeAudioMimeType } from "@/lib/audioFormats";
import { parseP2PTrackId, isP2PTrackUrl } from "@/p2p/audio/urls";
import { getLocalTrack, saveLocalTrack, type LocalTrackRecord } from "@/p2p/audio/localTracks";
import { nanoid } from "nanoid";
import { joinRoom } from "trystero";

type TrysteroRoom = ReturnType<typeof joinRoom>;

const TRACK_REQUEST_TIMEOUT_MS = 120_000;

let initializedRoom: TrysteroRoom | null = null;
let sendTrack: ((data: ArrayBuffer, peerId: string | null, metadata: TrackTransferMeta) => Promise<void>) | null = null;
let sendTrackRequest: ((data: TrackRequestPayload, peerId: string | null) => Promise<void>) | null = null;

const inFlightTrackFetches = new Map<string, Promise<LocalTrackRecord>>();

export interface TrackTransferMeta {
  trackId: string;
  fileName: string;
  mimeType: string;
}

type TrackRequestPayload = {
  trackId: string;
  requestId: string;
  [key: string]: string;
};

export function resetP2PAudioTransfer(): void {
  initializedRoom = null;
  sendTrack = null;
  sendTrackRequest = null;
  inFlightTrackFetches.clear();
}

export function initP2PAudioTransfer(room: TrysteroRoom): void {
  if (initializedRoom === room) return;
  initializedRoom = room;

  const [send, get] = room.makeAction<ArrayBuffer>("audio-track");
  const [sendRequest, getRequest] = room.makeAction<TrackRequestPayload>("track-request");

  sendTrack = async (data, peerId, metadata) => {
    await send(data, peerId, { ...metadata });
  };

  sendTrackRequest = async (payload, peerId) => {
    await sendRequest(payload, peerId);
  };

  get(async (data, _peerId, metadata) => {
    const meta = metadata as TrackTransferMeta | undefined;
    if (!meta?.trackId) return;
    await persistIncomingTrack(data, meta);
  });

  getRequest(async (payload, fromPeerId) => {
    if (!payload?.trackId || !fromPeerId || !sendTrack) return;
    const record = await getLocalTrack(payload.trackId);
    if (!record) return;

    const buffer = await record.blob.arrayBuffer();
    const meta: TrackTransferMeta = {
      trackId: record.trackId,
      fileName: record.fileName,
      mimeType: normalizeAudioMimeType(record.mimeType, record.fileName),
    };
    await sendTrack(buffer, fromPeerId, meta);
  });
}

async function persistIncomingTrack(data: ArrayBuffer, meta: TrackTransferMeta): Promise<void> {
  const mimeType = normalizeAudioMimeType(meta.mimeType ?? "", meta.fileName ?? "");
  const record: LocalTrackRecord = {
    trackId: meta.trackId,
    fileName: meta.fileName ?? "track",
    mimeType,
    blob: new Blob([data], { type: mimeType }),
    createdAt: Date.now(),
  };
  await saveLocalTrack(record);
  window.dispatchEvent(new CustomEvent("p2p-track-received", { detail: { trackId: meta.trackId } }));
}

export async function broadcastLocalTrackToRoom(room: TrysteroRoom, record: LocalTrackRecord): Promise<void> {
  initP2PAudioTransfer(room);
  if (!sendTrack) return;

  const buffer = await record.blob.arrayBuffer();
  const meta: TrackTransferMeta = {
    trackId: record.trackId,
    fileName: record.fileName,
    mimeType: normalizeAudioMimeType(record.mimeType, record.fileName),
  };
  await sendTrack(buffer, null, meta);
}

/** Push every locally cached P2P track referenced in the playlist to a single peer (e.g. on join). */
export async function pushLocalTracksToPeer(peerId: string, playlistUrls: string[]): Promise<void> {
  if (!sendTrack) return;

  const seen = new Set<string>();
  const urls = playlistUrls;

  for (const url of urls) {
    if (!isP2PTrackUrl(url)) continue;
    const trackId = parseP2PTrackId(url);
    if (!trackId || seen.has(trackId)) continue;
    seen.add(trackId);

    const record = await getLocalTrack(trackId);
    if (!record) continue;

    const buffer = await record.blob.arrayBuffer();
    const meta: TrackTransferMeta = {
      trackId: record.trackId,
      fileName: record.fileName,
      mimeType: normalizeAudioMimeType(record.mimeType, record.fileName),
    };
    await sendTrack(buffer, peerId, meta);
  }
}

async function requestTrackFromPeers(trackId: string): Promise<LocalTrackRecord> {
  if (!sendTrackRequest) {
    throw new Error("P2P audio transfer is not initialized");
  }

  const existing = await getLocalTrack(trackId);
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for track ${trackId} from peers`));
    }, TRACK_REQUEST_TIMEOUT_MS);

    const onReceived = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId: string }>).detail;
      if (detail?.trackId !== trackId) return;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("p2p-track-received", onReceived);
    };

    window.addEventListener("p2p-track-received", onReceived);

    void sendTrackRequest!({ trackId, requestId: nanoid() }, null).catch((err) => {
      cleanup();
      reject(err);
    });
  });

  const record = await getLocalTrack(trackId);
  if (!record) {
    throw new Error(`Track not found locally: ${trackId}`);
  }
  return record;
}

export async function ensureP2PTrackLocal(trackId: string): Promise<LocalTrackRecord> {
  const existing = await getLocalTrack(trackId);
  if (existing) return existing;

  let inflight = inFlightTrackFetches.get(trackId);
  if (!inflight) {
    inflight = requestTrackFromPeers(trackId).finally(() => {
      inFlightTrackFetches.delete(trackId);
    });
    inFlightTrackFetches.set(trackId, inflight);
  }
  return inflight;
}

export async function loadP2PTrackArrayBuffer(url: string): Promise<ArrayBuffer> {
  const trackId = parseP2PTrackId(url);
  if (!trackId) {
    throw new Error(`Invalid P2P track URL: ${url}`);
  }
  const record = await ensureP2PTrackLocal(trackId);
  return record.blob.arrayBuffer();
}
