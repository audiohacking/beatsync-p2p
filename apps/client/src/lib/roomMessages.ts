import type { NTPResponseMessageType, WSResponseType } from "@beatsync/shared";
import { WSResponseSchema } from "@beatsync/shared";
import type { NTPMeasurement } from "@/utils/ntp";
import { validateProbePair } from "@/utils/ntp";
import { epochNow } from "@beatsync/shared";
import type { SetAudioSourcesType, LoadAudioSourceType } from "@beatsync/shared";
import type { PlaybackControlsPermissionsType } from "@beatsync/shared";
import type { ChatMessageType } from "@beatsync/shared";
import type {
  SpatialConfigType,
  GlobalVolumeConfigType,
  LowPassConfigType,
  MetronomeConfigType,
} from "@beatsync/shared";

export interface RoomMessageContext {
  onNTPResponse: (measurement: NTPMeasurement | null) => void;
  onNTPResponseReceived: () => void;
  setProbeStats: () => void;
  setConnectedClients: (clients: import("@beatsync/shared").ClientDataType[]) => void;
  handleSetAudioSources: (event: SetAudioSourcesType) => void;
  setPlaybackControlsPermissions: (permissions: PlaybackControlsPermissionsType) => void;
  setMessages: (messages: ChatMessageType[], isFullSync: boolean, newestId: number) => void;
  handleLoadAudioSource: (event: LoadAudioSourceType) => void;
  schedulePlay: (data: { trackTimeSeconds: number; targetServerTime: number; audioSource: string }) => void;
  schedulePause: (data: { targetServerTime: number }) => void;
  processSpatialConfig: (config: SpatialConfigType) => void;
  setIsSpatialAudioEnabled: (enabled: boolean) => void;
  isSpatialAudioEnabled: boolean;
  processStopSpatialAudio: () => void;
  processGlobalVolumeConfig: (config: GlobalVolumeConfigType) => void;
  processLowPassConfig: (config: LowPassConfigType) => void;
  processMetronomeConfig: (config: MetronomeConfigType) => void;
  onSearchResponse: (response: Extract<WSResponseType, { type: "SEARCH_RESPONSE" }>) => void;
  setActiveStreamJobs: (count: number) => void;
  setDemoUserCount: (count: number) => void;
  setDemoAudioReadyCount: (count: number) => void;
}

const parseNTPResponse = (response: NTPResponseMessageType): NTPMeasurement | null => {
  const t3 = epochNow();
  const { t0, t1, t2, probeGroupId, probeGroupIndex } = response;
  const clockOffset = (t1 - t0 + (t2 - t3)) / 2;
  const roundTripDelay = t3 - t0 - (t2 - t1);
  const measurement: NTPMeasurement = { t0, t1, t2, t3, roundTripDelay, clockOffset };
  return validateProbePair({ measurement, probeGroupId, probeGroupIndex });
};

export function dispatchRoomMessage(response: WSResponseType, ctx: RoomMessageContext): void {
  if (response.type === "NTP_RESPONSE") {
    const pairResult = parseNTPResponse(response);
    ctx.onNTPResponse(pairResult);
    ctx.setProbeStats();
    ctx.onNTPResponseReceived();
    return;
  }

  if (response.type === "ROOM_EVENT") {
    const { event } = response;
    if (event.type === "CLIENT_CHANGE") {
      ctx.setConnectedClients(event.clients);
    } else if (event.type === "SET_AUDIO_SOURCES") {
      ctx.handleSetAudioSources(event);
    } else if (event.type === "SET_PLAYBACK_CONTROLS") {
      ctx.setPlaybackControlsPermissions(event.permissions);
    } else if (event.type === "CHAT_UPDATE") {
      ctx.setMessages(event.messages, event.isFullSync, event.newestId);
    } else if (event.type === "LOAD_AUDIO_SOURCE") {
      ctx.handleLoadAudioSource(event);
    }
    return;
  }

  if (response.type === "SCHEDULED_ACTION") {
    const { scheduledAction, serverTimeToExecute } = response;
    if (scheduledAction.type === "PLAY") {
      ctx.schedulePlay({
        trackTimeSeconds: scheduledAction.trackTimeSeconds,
        targetServerTime: serverTimeToExecute,
        audioSource: scheduledAction.audioSource,
      });
    } else if (scheduledAction.type === "PAUSE") {
      ctx.schedulePause({ targetServerTime: serverTimeToExecute });
    } else if (scheduledAction.type === "SPATIAL_CONFIG") {
      ctx.processSpatialConfig(scheduledAction);
      if (!ctx.isSpatialAudioEnabled) {
        ctx.setIsSpatialAudioEnabled(true);
      }
    } else if (scheduledAction.type === "STOP_SPATIAL_AUDIO") {
      ctx.processStopSpatialAudio();
    } else if (scheduledAction.type === "GLOBAL_VOLUME_CONFIG") {
      ctx.processGlobalVolumeConfig(scheduledAction);
    } else if (scheduledAction.type === "LOW_PASS_CONFIG") {
      ctx.processLowPassConfig(scheduledAction);
    } else if (scheduledAction.type === "METRONOME_CONFIG") {
      ctx.processMetronomeConfig(scheduledAction);
    }
    return;
  }

  if (response.type === "SEARCH_RESPONSE") {
    ctx.onSearchResponse(response);
    return;
  }

  if (response.type === "STREAM_JOB_UPDATE") {
    ctx.setActiveStreamJobs(response.activeJobCount);
    return;
  }

  if (response.type === "DEMO_USER_COUNT") {
    ctx.setDemoUserCount(response.count);
    return;
  }

  if (response.type === "DEMO_AUDIO_READY_COUNT") {
    ctx.setDemoAudioReadyCount(response.count);
  }
}

export function parseAndDispatchRoomMessage(raw: unknown, ctx: RoomMessageContext): void {
  dispatchRoomMessage(WSResponseSchema.parse(raw), ctx);
}
