/** Metadata tag so music/track WebRTC streams are never mixed with voice chat. */
export const VOICE_CHAT_STREAM_METADATA = { kind: "voice-chat" as const };

export type VoiceChatStreamMetadata = typeof VOICE_CHAT_STREAM_METADATA;
