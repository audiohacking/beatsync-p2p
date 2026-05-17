"use client";
import { SOCIAL_LINKS } from "@/constants";
import { useRoomDashboardReady } from "@/hooks/useRoomDashboardReady";
import { useP2PConnectionStore } from "@/store/p2pConnection";
import { audioContextManager } from "@/lib/audioContextManager";
import { IS_P2P_MODE } from "@/lib/p2p";
import { appPath } from "@/lib/paths";
import { getNtpMeasurementsRequired } from "@/p2p/permissions";
import { useGlobalStore } from "@/store/global";
import { Crown, Hash, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { SyncProgress } from "../ui/SyncProgress";

interface TopBarProps {
  roomId: string;
}

export const TopBar = ({ roomId }: TopBarProps) => {
  const isLoadingAudio = useGlobalStore((state) => state.isInitingSystem);
  const isSynced = useGlobalStore((state) => state.isSynced);
  const roundTripEstimate = useGlobalStore((state) => state.roundTripEstimate);
  const connectedClientCount = useGlobalStore((state) => state.connectedClients.length);
  const clockOffset = useGlobalStore((state) => state.offsetEstimate);
  const syncMeasurementCount = useGlobalStore((state) => state.syncMeasurements.length);
  const ntpTarget = getNtpMeasurementsRequired();
  const roomReady = useRoomDashboardReady();
  const p2pAttached = useP2PConnectionStore((state) => state.isReady);

  // Get current user from global store to check admin status
  const currentUser = useGlobalStore((state) => state.currentUser);
  const isAdmin = IS_P2P_MODE || currentUser?.isAdmin || false;

  // P2P: never render an empty top bar while Trystero is still attaching
  if (IS_P2P_MODE && !p2pAttached) {
    return (
      <AnimatePresence>
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <SyncProgress loadingMessage="Connecting to peers..." />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show minimal nav once the room UI is active (P2P: before NTP completes)
  if (roomReady) {
    return (
      <div className="h-8 bg-black/80 backdrop-blur-md z-50 flex items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center space-x-4 text-xs text-neutral-400 py-2 md:py-0">
          {isAdmin && (
            <div className="flex items-center">
              <Crown className="h-3 w-3 text-green-500" fill="currentColor" />
            </div>
          )}
          <Link href={appPath("/")} className="font-medium hover:text-white transition-colors">
            Beatsync
          </Link>

          {/* NTP Measurements Indicator */}
          <div className="items-center hidden md:flex">
            <motion.svg width="14" height="14" viewBox="0 0 14 14" className="mr-1">
              <circle
                cx="7"
                cy="7"
                r="5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-neutral-600"
              />
              <motion.circle
                cx="7"
                cy="7"
                r="5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-green-500"
                strokeDasharray={`${(syncMeasurementCount / ntpTarget) * 31.4} 31.4`}
                strokeLinecap="round"
                transform="rotate(-90 7 7)"
                initial={{ strokeDasharray: "0 31.4" }}
                animate={{
                  strokeDasharray: `${(syncMeasurementCount / ntpTarget) * 31.4} 31.4`,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
            </motion.svg>
            <span className="text-xs">
              {syncMeasurementCount}/{ntpTarget}
              {!isSynced && IS_P2P_MODE ? " · syncing" : ""}
            </span>
          </div>
          <div className="flex items-center">
            <Hash size={12} className="mr-1" />
            <span className="flex items-center">{roomId}</span>
          </div>
          <div className="flex items-center">
            <Users size={12} className="mr-1" />
            <span className="flex items-center">
              <span className="mr-1.5">
                {connectedClientCount} {connectedClientCount === 1 ? "user" : "users"}
              </span>
            </span>
          </div>
          {/* Hide separator on small screens */}
          <div className="hidden md:block">|</div>
          {/* Hide Offset/RTT on small screens */}
          <div className="hidden md:flex items-center space-x-2">
            <span>Offset: {clockOffset.toFixed(2)}ms</span>
            <span>RTT: {roundTripEstimate.toFixed(2)}ms</span>
            <span>OL: {((audioContextManager.getContext().outputLatency ?? 0) * 1000).toFixed(0)}ms</span>
          </div>
        </div>

        <motion.div className="flex items-center justify-center">
          <a
            href={SOCIAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="View source on GitHub"
          >
            <FaGithub className="size-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  // Use the existing SyncProgress component for loading/syncing states
  return (
    <AnimatePresence>
      {isLoadingAudio && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <SyncProgress />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
