"use client";

import { useClientId } from "@/hooks/useClientId";
import { useNtpHeartbeat } from "@/hooks/useNtpHeartbeat";
import { IS_DEMO_MODE } from "@/lib/demo";
import { getUserLocation } from "@/lib/ip";
import { dispatchRoomMessage } from "@/lib/roomMessages";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { useChatStore } from "@/store/chat";
import { useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { toP2PTrackUrl } from "@/p2p/audio/urls";
import { getProbeStats, type NTPMeasurement } from "@/utils/ntp";
import { ClientActionEnum, WSResponseType } from "@beatsync/shared";
import { useCallback, useEffect, useMemo } from "react";

interface TrysteroManagerProps {
  roomId: string;
  username: string;
}

export const TrysteroManager = ({ roomId, username }: TrysteroManagerProps) => {
  const { clientId } = useClientId();
  const isLoadingRoom = useRoomStore((state) => state.isLoadingRoom);

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

  const connect = useP2PConnectionStore((state) => state.connect);
  const disconnect = useP2PConnectionStore((state) => state.disconnect);
  const setOnServerMessage = useP2PConnectionStore((state) => state.setOnServerMessage);
  const sendRequest = useP2PConnectionStore((state) => state.sendRequest);
  const isConnected = useP2PConnectionStore((state) => state.isConnected);
  const trysteroRoomId = useP2PConnectionStore((state) => state.trysteroRoomId);

  const { startHeartbeat, stopHeartbeat, markNTPResponseReceived } = useNtpHeartbeat({
    onConnectionStale: () => {
      console.warn("[P2P] NTP stale — rejoining room");
      disconnect();
    },
  });

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

  useEffect(() => {
    if (isLoadingRoom || !roomId || !username || !clientId) return;
    if (isConnected) return;

    connect({ roomCode: roomId, clientId, username });
    startHeartbeat();

    if (!IS_DEMO_MODE) {
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
    }

    return () => {
      stopHeartbeat();
      useGlobalStore.getState().onConnectionReset();
      disconnect();
    };
  }, [
    isLoadingRoom,
    roomId,
    username,
    clientId,
    isConnected,
    connect,
    disconnect,
    startHeartbeat,
    stopHeartbeat,
    sendRequest,
  ]);

  useEffect(() => {
    if (trysteroRoomId) {
      console.log(`[P2P] Joined Trystero room ${trysteroRoomId}`);
    }
  }, [trysteroRoomId]);

  useEffect(() => {
    const onTrackReceived = (event: Event) => {
      const trackId = (event as CustomEvent<{ trackId: string }>).detail?.trackId;
      if (!trackId) return;
      const url = toP2PTrackUrl(trackId);
      const state = useGlobalStore.getState();
      const inQueue = state.audioSources.some((s) => s.source.url === url);
      if (inQueue) {
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
