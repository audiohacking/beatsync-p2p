"use client";

import { IS_P2P_MODE } from "@/lib/p2p";
import { joinRoom } from "trystero";

type TrysteroRoom = ReturnType<typeof joinRoom>;
import { prepareRoomCacheSnapshot } from "@/p2p/audio/availableSources";
import { initP2PAudioTransfer, pushLocalTracksToPeer, resetP2PAudioTransfer } from "@/p2p/audio/transfer";
import { P2PRoomCoordinator } from "@/p2p/host/P2PRoomCoordinator";
import { applyCoordinatorFromRoomPayload } from "@/p2p/roomEvents";
import { parseP2PEnvelope } from "@/p2p/protocol";
import { toTrysteroRoomId } from "@/p2p/constants";
import {
  beginRoomSyncGeneration,
  isCurrentRoomSyncGeneration,
  scheduleRoomSyncRetries,
  scheduleTrackPushRetries,
} from "@/p2p/roomSync";
import {
  computeCacheRichness,
  loadRoomCache,
  mergeRoomCaches,
  type RoomCacheSnapshot,
  saveRoomCache,
} from "@/p2p/roomCache";
import type { P2PEnvelope, P2PRequestEnvelope, WSRequestType, WSResponseType } from "@beatsync/shared";
import { selfId } from "trystero";
import { useGlobalStore } from "@/store/global";
import { create } from "zustand";

interface P2PSession {
  clientId: string;
  username: string;
}

/** NTP uses a stable clock anchor (smallest peer id), not a room-state host. */
function getNtpAnchorPeerId(peerIds: string[]): string | null {
  if (peerIds.length === 0) return null;
  return [...peerIds].sort()[0] ?? null;
}

const REMOTE_REQUEST_TYPES = new Set<WSRequestType["type"]>(["NTP_REQUEST", "SYNC"]);
const FANOUT_REQUEST_TYPES = new Set<WSRequestType["type"]>(["AUDIO_SOURCE_LOADED"]);

const REPLICATED_REQUEST_TYPES = new Set<WSRequestType["type"]>([
  "SEND_IP",
  "SEND_CHAT_MESSAGE",
  "REGISTER_AUDIO_SOURCE",
  "DELETE_AUDIO_SOURCES",
  "REORDER_AUDIO_SOURCES",
  "SET_GLOBAL_VOLUME",
  "SET_LOW_PASS_FREQ",
  "SET_METRONOME",
  "SET_PLAYBACK_CONTROLS",
  "SET_ADMIN",
  "START_SPATIAL_AUDIO",
  "STOP_SPATIAL_AUDIO",
  "MOVE_CLIENT",
  "SET_LISTENING_SOURCE",
  "REORDER_CLIENT",
]);

const INITIATOR_ONLY_REQUEST_TYPES = new Set<WSRequestType["type"]>([
  "SEARCH_MUSIC",
  "STREAM_MUSIC",
  "LOAD_DEFAULT_TRACKS",
]);

const PLAYBACK_REQUEST_TYPES = new Set<WSRequestType["type"]>(["PLAY", "PAUSE"]);

interface AttachSessionParams {
  room: TrysteroRoom;
  roomCode: string;
  clientId: string;
  username: string;
}

interface P2PConnectionState {
  room: TrysteroRoom | null;
  trysteroRoomId: string | null;
  roomCode: string | null;
  session: P2PSession | null;
  connectedPeerIds: string[];
  coordinator: P2PRoomCoordinator | null;
  isReady: boolean;
  onServerMessage: ((message: WSResponseType) => void) | null;

  attachSession: (params: AttachSessionParams) => void;
  detachSession: () => void;
  sendRequest: (request: WSRequestType) => void;
  runRoomSync: () => void;
  requestRoomSync: () => void;
  pushPlaylistToAllPeers: () => void;
  handleIncomingEnvelope: (envelope: P2PEnvelope) => void;
  setOnServerMessage: (handler: (message: WSResponseType) => void) => void;
}

let sendEnvelopeImpl: ((envelope: P2PEnvelope, targetPeerId?: string | null) => void) | null = null;
let attachedRoom: TrysteroRoom | null = null;
let roomSyncGeneration = 0;

function deliverRoomPayload(
  coordinator: P2PRoomCoordinator,
  onServerMessage: ((message: WSResponseType) => void) | null,
  payload: WSResponseType
): void {
  applyCoordinatorFromRoomPayload(coordinator, payload);
  onServerMessage?.(payload);
}

export const useP2PConnectionStore = create<P2PConnectionState>()((set, get) => ({
  room: null,
  trysteroRoomId: null,
  roomCode: null,
  session: null,
  connectedPeerIds: [],
  coordinator: null,
  isReady: false,
  onServerMessage: null,

  setOnServerMessage: (handler) => set({ onServerMessage: handler }),

  attachSession: ({ room, roomCode, clientId, username }) => {
    if (attachedRoom === room && get().roomCode === roomCode && get().isReady) {
      return;
    }

    get().detachSession();
    roomSyncGeneration = beginRoomSyncGeneration();

    attachedRoom = room;
    const trysteroRoomId = toTrysteroRoomId(roomCode);
    const session = { clientId, username };

    initP2PAudioTransfer(room);

    const [sendEnvelopeAction, getEnvelopeAction] = room.makeAction<P2PEnvelope>("envelope");
    const peerIds = new Set<string>([selfId]);

    const broadcastEnvelope = (envelope: P2PEnvelope) => {
      void sendEnvelopeAction(envelope, null);
      // Trystero does not echo broadcasts to the initiator — apply room events locally.
      if (envelope.kind !== "broadcast") return;
      const payload = envelope.payload;
      if (payload.type === "ROOM_EVENT" && payload.event.type === "CLIENT_CHANGE") {
        return;
      }
      deliverLocalRoomMessage(payload);
    };

    const deliverLocalRoomMessage = (message: WSResponseType) => {
      const { onServerMessage } = get();
      deliverRoomPayload(coordinator, onServerMessage, message);
    };

    const deliverEnvelope = (envelope: P2PEnvelope, targetPeerId: string | null) => {
      if (targetPeerId === selfId) {
        if (envelope.kind === "unicast" || envelope.kind === "direct") {
          deliverLocalRoomMessage(envelope.payload);
        }
        return;
      }
      void sendEnvelopeAction(envelope, targetPeerId);
    };

    const coordinator = new P2PRoomCoordinator(roomCode, {
      getSelfPeerId: () => selfId,
      getConnectedPeerIds: () => [...peerIds],
      onLocalClientListChange: (clients) => {
        deliverLocalRoomMessage({
          type: "ROOM_EVENT",
          event: { type: "CLIENT_CHANGE", clients },
        });
      },
      broadcast: (e) => broadcastEnvelope(e),
      unicast: (e) => deliverEnvelope(e, e.toPeerId),
      direct: (e) => deliverEnvelope(e, e.toPeerId),
      stateSnapshot: (targetPeerId, envelope) => {
        deliverEnvelope(envelope, targetPeerId);
      },
    });

    sendEnvelopeImpl = (envelope, targetPeerId = null) => {
      void sendEnvelopeAction(envelope, targetPeerId);
    };

    coordinator.registerSelf({
      peerId: selfId,
      clientId,
      username,
      isAdmin: true,
    });

    getEnvelopeAction((data) => {
      try {
        get().handleIncomingEnvelope(parseP2PEnvelope(data));
      } catch (e) {
        console.error("[P2P] Invalid envelope", e);
      }
    });

    room.onPeerJoin((peerId) => {
      peerIds.add(peerId);
      set({ connectedPeerIds: [...peerIds] });
      coordinator.onPeerJoined(peerId);
      get().runRoomSync();
      const playlistUrls = useGlobalStore.getState().audioSources.map((as) => as.source.url);
      scheduleTrackPushRetries(() => {
        if (attachedRoom !== room) return;
        void pushLocalTracksToPeer(peerId, playlistUrls);
      });
    });

    room.onPeerLeave((peerId) => {
      peerIds.delete(peerId);
      coordinator.removePeer(peerId);
      set({ connectedPeerIds: [...peerIds] });
    });

    set({
      room,
      trysteroRoomId,
      roomCode,
      session,
      coordinator,
      connectedPeerIds: [...peerIds],
      isReady: false,
    });

    const finishAttach = async () => {
      if (attachedRoom !== room) return;

      const cached = loadRoomCache(roomCode);
      if (cached) {
        const prepared = await prepareRoomCacheSnapshot(cached, "local-session");
        coordinator.applySnapshot(prepared);
        if (prepared.audioSources.length !== cached.audioSources.length) {
          saveRoomCache(roomCode, prepared);
        }
      }

      set({ isReady: true });

      const { onServerMessage } = get();
      if (onServerMessage) {
        coordinator.hydrateLocalConsumer((message) => {
          deliverRoomPayload(coordinator, onServerMessage, message);
        });
      }

      get().requestRoomSync();

      if (IS_P2P_MODE && attachedRoom === room) {
        // Sync state update only — avoid async setIsInitingSystem() racing across detach/reattach.
        useGlobalStore.setState({ isInitingSystem: false, hasUserStartedSystem: true });
      }
    };

    void finishAttach();
  },

  detachSession: () => {
    roomSyncGeneration = beginRoomSyncGeneration();
    const { coordinator } = get();
    coordinator?.destroy();
    resetP2PAudioTransfer();
    sendEnvelopeImpl = null;
    attachedRoom = null;
    set({
      room: null,
      trysteroRoomId: null,
      roomCode: null,
      session: null,
      connectedPeerIds: [],
      coordinator: null,
      isReady: false,
    });
  },

  runRoomSync: () => {
    const { coordinator, isReady } = get();
    if (!isReady || !coordinator || !sendEnvelopeImpl) return;
    if (coordinator.getSnapshotRichness() > 0) {
      coordinator.broadcastStateSnapshot();
    }
    get().sendRequest({ type: "SYNC" });
  },

  requestRoomSync: () => {
    const generation = roomSyncGeneration;
    get().runRoomSync();
    scheduleRoomSyncRetries(() => {
      if (!isCurrentRoomSyncGeneration(generation)) return;
      get().runRoomSync();
    }, generation);
  },

  pushPlaylistToAllPeers: () => {
    const { room, connectedPeerIds } = get();
    if (!room) return;
    const playlistUrls = useGlobalStore.getState().audioSources.map((as) => as.source.url);
    const remotePeers = connectedPeerIds.filter((id) => id !== selfId);
    if (remotePeers.length === 0) return;

    scheduleTrackPushRetries(() => {
      for (const peerId of remotePeers) {
        void pushLocalTracksToPeer(peerId, playlistUrls);
      }
    });
  },

  sendRequest: (request) => {
    const { session, coordinator, isReady, connectedPeerIds } = get();
    if (!session || !coordinator || !sendEnvelopeImpl) return;
    if (!isReady && !IS_P2P_MODE) return;

    const envelope: P2PRequestEnvelope = {
      kind: "request",
      fromPeerId: selfId,
      clientId: session.clientId,
      username: session.username,
      payload: request,
    };

    if (REMOTE_REQUEST_TYPES.has(request.type)) {
      if (request.type === "NTP_REQUEST") {
        const anchor = getNtpAnchorPeerId(connectedPeerIds);
        if (anchor === selfId) {
          coordinator.handleRemoteNtp(envelope);
        } else if (anchor) {
          sendEnvelopeImpl(envelope, anchor);
        }
      } else {
        sendEnvelopeImpl(envelope, null);
      }
      return;
    }

    if (FANOUT_REQUEST_TYPES.has(request.type)) {
      void coordinator.handleInitiatorRequest(envelope);
      sendEnvelopeImpl(envelope, null);
      return;
    }

    if (REPLICATED_REQUEST_TYPES.has(request.type) || PLAYBACK_REQUEST_TYPES.has(request.type)) {
      void coordinator.handleInitiatorRequest(envelope);
      sendEnvelopeImpl(envelope, null);
      return;
    }

    if (INITIATOR_ONLY_REQUEST_TYPES.has(request.type)) {
      void coordinator.handleInitiatorRequest(envelope);
      return;
    }

    void coordinator.handleInitiatorRequest(envelope);
  },

  handleIncomingEnvelope: (envelope) => {
    const { coordinator, onServerMessage, roomCode } = get();
    if (!coordinator) return;

    if (envelope.kind === "state-snapshot") {
      if (roomCode) {
        const local = loadRoomCache(roomCode);
        const { merged, acceptedRemote } = mergeRoomCaches(local, envelope.snapshot as RoomCacheSnapshot);

        if (!acceptedRemote) {
          saveRoomCache(roomCode, merged);
          if (computeCacheRichness(merged) > envelope.richness && sendEnvelopeImpl) {
            sendEnvelopeImpl(coordinator.buildStateSnapshotEnvelope(selfId), envelope.fromPeerId);
          }
          return;
        }

        void prepareRoomCacheSnapshot(merged, "room").then((prepared) => {
          coordinator.applySnapshot(prepared);
          if (roomCode) saveRoomCache(roomCode, prepared);
          if (onServerMessage) {
            coordinator.hydrateLocalConsumer((message) => {
              deliverRoomPayload(coordinator, onServerMessage, message);
            });
          }
          get().pushPlaylistToAllPeers();
        });
        return;
      }
      return;
    }

    if (envelope.kind === "request") {
      if (envelope.fromPeerId === selfId) return;

      switch (envelope.payload.type) {
        case "NTP_REQUEST":
          coordinator.handleRemoteNtp(envelope);
          return;
        case "SYNC":
          coordinator.handleRemoteSync(envelope);
          return;
        case "AUDIO_SOURCE_LOADED":
          coordinator.handleRemoteAudioLoaded(envelope.clientId);
          return;
        default:
          if (
            REPLICATED_REQUEST_TYPES.has(envelope.payload.type) ||
            PLAYBACK_REQUEST_TYPES.has(envelope.payload.type)
          ) {
            void coordinator.handleInitiatorRequest(envelope);
          }
          return;
      }
    }

    if (!onServerMessage) return;

    if (envelope.kind === "broadcast") {
      const payload = envelope.payload;
      if (payload.type === "ROOM_EVENT" && payload.event.type === "CLIENT_CHANGE") {
        return;
      }
      deliverRoomPayload(coordinator, onServerMessage, payload);
      return;
    }

    if (envelope.toPeerId !== selfId) return;
    deliverRoomPayload(coordinator, onServerMessage, envelope.payload);
  },
}));
