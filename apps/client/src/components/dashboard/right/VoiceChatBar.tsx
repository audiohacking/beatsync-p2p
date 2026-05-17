"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceChatState, useVoiceChatStore } from "@/store/voiceChat";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { Headphones, Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import { motion } from "motion/react";

function shortPeerLabel(peerId: string): string {
  return peerId.length > 8 ? `${peerId.slice(0, 6)}…` : peerId;
}

export const VoiceChatBar = () => {
  const { isJoined, isMuted, isJoining, error, remoteParticipantIds } = useVoiceChatState();
  const joinVoice = useVoiceChatStore((s) => s.joinVoice);
  const leaveVoice = useVoiceChatStore((s) => s.leaveVoice);
  const toggleMute = useVoiceChatStore((s) => s.toggleMute);
  const isP2pReady = useP2PConnectionStore((s) => s.isReady);

  const participantCount = (isJoined ? 1 : 0) + remoteParticipantIds.length;

  return (
    <div className={cn("shrink-0 border-b border-neutral-800/60 bg-neutral-950/80 px-2 py-2", "backdrop-blur-sm")}>
      <motion.div
        className="flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 min-w-0">
          <Headphones className="size-3.5 shrink-0 text-primary-400" />
          <span className="truncate">Voice</span>
          {isJoined && (
            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] text-green-400">
              {participantCount} in call
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          {!isJoined ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs bg-neutral-800 hover:bg-neutral-700"
              disabled={!isP2pReady || isJoining}
              onClick={() => void joinVoice()}
            >
              {isJoining ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
              {isJoining ? "Joining…" : "Join voice"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={cn(
                  "h-7 text-xs",
                  isMuted ? "bg-red-950/50 text-red-300 hover:bg-red-950/70" : "bg-neutral-800 hover:bg-neutral-700"
                )}
                onClick={toggleMute}
                aria-pressed={isMuted}
              >
                {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs bg-neutral-800 hover:bg-neutral-700"
                onClick={leaveVoice}
              >
                <PhoneOff className="size-3.5" />
                Leave
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {isJoined && remoteParticipantIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="rounded-md bg-green-900/30 px-1.5 py-0.5 text-[10px] text-green-300">You</span>
          {remoteParticipantIds.map((peerId) => (
            <span
              key={peerId}
              className="rounded-md bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-400"
              title={peerId}
            >
              {shortPeerLabel(peerId)}
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-1.5 text-[10px] text-red-400/90">{error}</p>}

      {!isP2pReady && !isJoined && (
        <p className="mt-1 text-[10px] text-neutral-600">Connect to the room to use voice chat.</p>
      )}
    </div>
  );
};
