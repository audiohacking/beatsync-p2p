"use client";

import { getTrysteroConfig } from "@/p2p/config";
import { toTrysteroRoomId } from "@/p2p/constants";
import { initP2PAudioTransfer } from "@/p2p/audio/transfer";
import { P2PRoomCoordinator } from "@/p2p/host/P2PRoomCoordinator";
import { parseP2PEnvelope } from "@/p2p/protocol";
import {
  computeCacheRichness,
  loadRoomCache,
  mergeRoomCaches,
  type RoomCacheSnapshot,
  saveRoomCache,
} from "@/p2p/roomCache";
import type { P2PEnvelope, P2PRequestEnvelope, WSRequestType, WSResponseType } from "@beatsync/shared";
import { joinRoom, selfId } from "trystero";
import { create } from "zustand";

type TrysteroRoom = ReturnType<typeof joinRoom>;

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

interface P2PConnectionState {
  room: TrysteroRoom | null;
  trysteroRoomId: string | null;
  roomCode: string | null;
  session: P2PSession | null;
  connectedPeerIds: string[];
  coordinator: P2PRoomCoordinator | null;
  isConnected: boolean;
  onServerMessage: ((message: WSResponseType) => void) | null;

  connect: (session: P2PSession & { roomCode: string }) => void;
  disconnect: () => void;
  sendRequest: (request: WSRequestType) => void;
  handleIncomingEnvelope: (envelope: P2PEnvelope) => void;
  setOnServerMessage: (handler: (message: WSResponseType) => void) => void;
}

let sendEnvelopeImpl: ((envelope: P2PEnvelope, targetPeerId?: string | null) => void) | null = null;

export const useP2PConnectionStore = create<P2PConnectionState>()((set, get) => ({
  room: null,
  trysteroRoomId: null,
  roomCode: null,
  session: null,
  connectedPeerIds: [],
  coordinator: null,
  isConnected: false,
  onServerMessage: null,

  setOnServerMessage: (handler) => set({ onServerMessage: handler }),

  connect: ({ roomCode, clientId, username }) => {
    get().disconnect();

    const trysteroRoomId = toTrysteroRoomId(roomCode);
    const room = joinRoom(getTrysteroConfig(), trysteroRoomId);
    initP2PAudioTransfer(room);

    const [sendEnvelopeAction, getEnvelopeAction] = room.makeAction<P2PEnvelope>("envelope");

    const peerIds = new Set<string>([selfId]);
    const session = { clientId, username };

    const broadcastEnvelope = (envelope: P2PEnvelope) => {
      void sendEnvelopeAction(envelope, null);
    };

    const coordinator = new P2PRoomCoordinator(roomCode, {
      getSelfPeerId: () => selfId,
      getConnectedPeerIds: () => [...peerIds],
      broadcast: (e) => broadcastEnvelope(e),
      unicast: (e) => void sendEnvelopeAction(e, e.toPeerId),
      direct: (e) => void sendEnvelopeAction(e, e.toPeerId),
      stateSnapshot: (targetPeerId, envelope) => {
        void sendEnvelopeAction(envelope, targetPeerId);
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

    const cached = loadRoomCache(roomCode);
    if (cached) {
      coordinator.applySnapshot(cached);
      const { onServerMessage } = get();
      if (onServerMessage) {
        coordinator.hydrateLocalConsumer(onServerMessage);
      }
    }

    const updatePeers = () => {
      set({ connectedPeerIds: [...peerIds] });
    };

    getEnvelopeAction((data) => {
      try {
        get().handleIncomingEnvelope(parseP2PEnvelope(data));
      } catch (e) {
        console.error("[P2P] Invalid envelope", e);
      }
    });

    room.onPeerJoin((peerId) => {
      peerIds.add(peerId);
      updatePeers();
      coordinator.onPeerJoined(peerId);
    });

    room.onPeerLeave((peerId) => {
      peerIds.delete(peerId);
      coordinator.removePeer(peerId);
      updatePeers();
    });

    updatePeers();

    set({
      room,
      trysteroRoomId,
      roomCode,
      session,
      coordinator,
      isConnected: true,
      connectedPeerIds: [...peerIds],
    });

    queueMicrotask(() => {
      if (coordinator.getSnapshotRichness() > 0) {
        coordinator.broadcastStateSnapshot();
      }
      get().sendRequest({ type: "SYNC" });
    });
  },

  disconnect: () => {
    const { coordinator, room } = get();
    coordinator?.destroy();
    room?.leave();
    sendEnvelopeImpl = null;
    set({
      room: null,
      trysteroRoomId: null,
      roomCode: null,
      session: null,
      connectedPeerIds: [],
      coordinator: null,
      isConnected: false,
    });
  },

  sendRequest: (request) => {
    const { session, coordinator, isConnected, connectedPeerIds } = get();
    if (!isConnected || !session || !coordinator || !sendEnvelopeImpl) return;

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

    void coordinator.handleInitiatorRequest(envelope);
  },

  handleIncomingEnvelope: (envelope) => {
    const { coordinator, onServerMessage, roomCode } = get();
    if (!coordinator) return;

    if (envelope.kind === "state-snapshot") {
      if (roomCode) {
        const local = loadRoomCache(roomCode);
        const { merged, acceptedRemote } = mergeRoomCaches(local, envelope.snapshot as RoomCacheSnapshot);
        saveRoomCache(roomCode, merged);

        if (!acceptedRemote) {
          if (computeCacheRichness(merged) > envelope.richness && sendEnvelopeImpl) {
            sendEnvelopeImpl(coordinator.buildStateSnapshotEnvelope(selfId), envelope.fromPeerId);
          }
          return;
        }

        coordinator.applySnapshot(merged);
        if (onServerMessage) {
          coordinator.hydrateLocalConsumer(onServerMessage);
        }
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
          coordinator.handleRemoteSync(envelope.fromPeerId);
          return;
        case "AUDIO_SOURCE_LOADED":
          coordinator.handleRemoteAudioLoaded(envelope.clientId);
          return;
        default:
          return;
      }
    }

    if (!onServerMessage) return;

    if (envelope.kind === "broadcast") {
      onServerMessage(envelope.payload);
      return;
    }

    if (envelope.toPeerId !== selfId) return;
    onServerMessage(envelope.payload);
  },
}));
