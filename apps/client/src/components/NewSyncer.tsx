"use client";
import { generateName } from "@/lib/randomNames";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useRoomStore } from "@/store/room";
import { motion } from "motion/react";
import { useEffect } from "react";
import { IS_DEMO_MODE } from "@/lib/demo";
import { Dashboard } from "./dashboard/Dashboard";
import { DemoDashboard } from "./dashboard/DemoDashboard";
import { TrysteroManager } from "./room/TrysteroManager";

interface NewSyncerProps {
  roomId: string;
}

export const NewSyncer = ({ roomId }: NewSyncerProps) => {
  const setUsername = useRoomStore((state) => state.setUsername);
  const setRoomId = useRoomStore((state) => state.setRoomId);
  const username = useRoomStore((state) => state.username);

  useDocumentTitle();

  useEffect(() => {
    setRoomId(roomId);
    if (!username) {
      setUsername(generateName());
    }
  }, [setUsername, username, roomId, setRoomId]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <TrysteroManager roomId={roomId} username={username} />
      {IS_DEMO_MODE ? <DemoDashboard roomId={roomId} /> : <Dashboard roomId={roomId} />}
    </motion.div>
  );
};
