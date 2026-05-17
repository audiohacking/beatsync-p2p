"use client";

import { p2pVoiceChat } from "@/p2p/voiceChat/manager";
import { useSyncExternalStore } from "react";
import { create } from "zustand";

interface VoiceChatStore {
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
}

export const useVoiceChatStore = create<VoiceChatStore>(() => ({
  joinVoice: () => p2pVoiceChat.join(),
  leaveVoice: () => p2pVoiceChat.leave(),
  toggleMute: () => p2pVoiceChat.toggleMute(),
}));

export function useVoiceChatState() {
  return useSyncExternalStore(p2pVoiceChat.subscribe, p2pVoiceChat.getSnapshot, p2pVoiceChat.getSnapshot);
}
