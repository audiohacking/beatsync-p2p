"use client";

import { useClientId } from "@/hooks/useClientId";
import { useNtpHeartbeat } from "@/hooks/useNtpHeartbeat";
import { IS_DEMO_MODE } from "@/lib/demo";
import { getUserLocation } from "@/lib/ip";
import { dispatchRoomMessage } from "@/lib/roomMessages";
import { getTrysteroConfig } from "@/p2p/config";
import { toTrysteroRoomId } from "@/p2p/constants";
import { joinRoom } from "trystero";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { useChatStore } from "@/store/chat";
import { useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { toP2PTrackUrl } from "@/p2p/audio/urls";
import { getProbeStats, type NTPMeasurement } from "@/utils/ntp";
import { ClientActionEnum, WSResponseType } from "@beatsync/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface TrysteroManagerProps {
  roomId: string;
  username: string;
}

export const TrysteroManager = ({ roomId, username }: TrysteroManagerProps) => {
  const { clientId } = useClientId();
  const isLoadingRoom = useRoomStore((state) => state.isLoadingRoom);

  const trysteroRoomId = toTrysteroRoomId(roomId);

  const addProbePairResult = useGlobalStore((state) => state.addProbePairResult);
  const setConnectedClients = useGlobalStore((state) => state.setConnectedClients);
  const schedulePlay = useGlobalStore((state) => state.schedulePlay);
  const schedulePause = useGlobalStore((state) => state.schedulePause);
  const processSpatialConfig = useGlobalStore((state) => state.processSpatialConfig);
  const setIsSpatialAudioEnabled = useGlobalStore((state) => state.setIsSpatialAudioEnabled);
  const processStopSpatialAudio = useGlobalStore((state) => state.processStopSpatialAudio);
  const processGlobalVolumeConfig = useGlobalStore((state) => state.processGlobalVolumeConfig);
  const processLowPassConfig = useGlobalStore((state) => state.processLowPassConfig);
  const processMetronomeConfig = useGlobalStore((state) => state.processMetronomeConfig);
  const handleSetAudioSources = useGlobalStore((state) => state.handleSetAudioSources);
  const setPlaybackControlsPermissions = useGlobalStore((state) => state.setPlaybackControlsPermissions);
  const setActiveStreamJobs = useGlobalStore((state) => state.setActiveStreamJobs);
  const setMessages = useChatStore((state) => state.setMessages);
  const handleLoadAudioSource = useGlobalStore((state) => state.handleLoadAudioSource);

  const attachSession = useP2PConnectionStore((state) => state.attachSession);
  const detachSession = useP2PConnectionStore((state) => state.detachSession);
  const setOnServerMessage = useP2PConnectionStore((state) => state.setOnServerMessage);
  const sendRequest = useP2PConnectionStore((state) => state.sendRequest);
  const isReady = useP2PConnectionStore((state) => state.isReady);

  const startHeartbeatRef = useRef<() => void>(() => {});
  const stopHeartbeatRef = useRef<() => void>(() => {});

  const { startHeartbeat, stopHeartbeat, markNTPResponseReceived } = useNtpHeartbeat({
    onConnectionStale: () => {
      console.warn("[P2P] NTP stale — resetting sync (staying in room)");
      useGlobalStore.getState().resetNTPConfig();
      startHeartbeatRef.current();
    },
  });

  startHeartbeatRef.current = startHeartbeat;
  stopHeartbeatRef.current = stopHeartbeat;

  const messageContext = useMemo(
    () => ({
      onNTPResponse: (pairResult: NTPMeasurement | null) => {
        if (pairResult) addProbePairResult(pairResult);
      },
      onNTPResponseReceived: markNTPResponseReceived,
      setProbeStats: () => useGlobalStore.setState({ probeStats: getProbeStats() }),
      setConnectedClients,
      handleSetAudioSources,
      setPlaybackControlsPermissions,
      setMessages,
      handleLoadAudioSource,
      schedulePlay,
      schedulePause,
      processSpatialConfig,
      setIsSpatialAudioEnabled,
      get isSpatialAudioEnabled() {
        return useGlobalStore.getState().isSpatialAudioEnabled;
      },
      processStopSpatialAudio,
      processGlobalVolumeConfig,
      processLowPassConfig,
      processMetronomeConfig,
      onSearchResponse: (response: Extract<WSResponseType, { type: "SEARCH_RESPONSE" }>) => {
        const { setSearchResults, setIsSearching, setIsLoadingMoreResults, setHasMoreResults, isLoadingMoreResults } =
          useGlobalStore.getState();
        setSearchResults(response.response, isLoadingMoreResults);
        setIsSearching(false);
        setIsLoadingMoreResults(false);
        if (response.response.type === "success") {
          const { total, items, offset } = response.response.response.data.tracks;
          setHasMoreResults(offset + items.length < total);
        } else {
          setHasMoreResults(false);
        }
      },
      setActiveStreamJobs,
      setDemoUserCount: (count: number) => useGlobalStore.setState({ demoUserCount: count }),
      setDemoAudioReadyCount: (count: number) => useGlobalStore.setState({ demoAudioReadyCount: count }),
    }),
    [
      addProbePairResult,
      markNTPResponseReceived,
      setConnectedClients,
      handleSetAudioSources,
      setPlaybackControlsPermissions,
      setMessages,
      handleLoadAudioSource,
      schedulePlay,
      schedulePause,
      processSpatialConfig,
      setIsSpatialAudioEnabled,
      processStopSpatialAudio,
      processGlobalVolumeConfig,
      processLowPassConfig,
      processMetronomeConfig,
      setActiveStreamJobs,
    ]
  );

  const onServerMessage = useCallback(
    (message: WSResponseType) => {
      useGlobalStore.setState({ lastMessageReceivedTime: Date.now() });
      dispatchRoomMessage(message, messageContext);
    },
    [messageContext]
  );

  useEffect(() => {
    setOnServerMessage(onServerMessage);
  }, [onServerMessage, setOnServerMessage]);

  const loggedRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (loggedRoomRef.current === trysteroRoomId) return;
    loggedRoomRef.current = trysteroRoomId;
    console.log(`[P2P] Joined Trystero room ${trysteroRoomId}`);
  }, [trysteroRoomId]);

  useEffect(() => {
    return () => {
      joinRoom(getTrysteroConfig(), trysteroRoomId).leave();
    };
  }, [trysteroRoomId]);

  useEffect(() => {
    if (isLoadingRoom || !roomId || !username || !clientId) return;

    const activeRoom = joinRoom(getTrysteroConfig(), trysteroRoomId);
    attachSession({ room: activeRoom, roomCode: roomId, clientId, username });
    startHeartbeatRef.current();

    return () => {
      stopHeartbeatRef.current();
      useGlobalStore.getState().onConnectionReset();
      detachSession();
    };
  }, [isLoadingRoom, roomId, username, clientId, trysteroRoomId, attachSession, detachSession]);

  const geoSentRef = useRef(false);
  useEffect(() => {
    if (IS_DEMO_MODE || !isReady || geoSentRef.current) return;
    geoSentRef.current = true;

    void getUserLocation()
      .then((location) => {
        sendRequest({
          type: ClientActionEnum.enum.SEND_IP,
          location,
        });
      })
      .catch(() => {
        console.warn("[P2P] Geolocation unavailable; continuing without location");
      });
  }, [isReady, sendRequest]);

  useEffect(() => {
    geoSentRef.current = false;
  }, [roomId]);

  useEffect(() => {
    const onTrackReceived = (event: Event) => {
      const trackId = (event as CustomEvent<{ trackId: string }>).detail?.trackId;
      if (!trackId) return;
      const url = toP2PTrackUrl(trackId);
      const state = useGlobalStore.getState();
      const entry = state.audioSources.find((s) => s.source.url === url);
      if (entry && (entry.status === "idle" || entry.status === "error" || entry.status === "loading")) {
        state.handleLoadAudioSource({
          type: "LOAD_AUDIO_SOURCE",
          audioSourceToPlay: { url },
        });
      }
    };
    window.addEventListener("p2p-track-received", onTrackReceived);
    return () => window.removeEventListener("p2p-track-received", onTrackReceived);
  }, []);

  return null;
};
