"use client";

import { Join } from "@/components/Join";
import { NewSyncer } from "@/components/NewSyncer";
import { DEMO_ROOM_ID, IS_DEMO_MODE } from "@/lib/demo";
import { validateFullRoomId } from "@/lib/room";
import { useChatStore } from "@/store/chat";
import { useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const roomFromQuery = searchParams.get("room") ?? "";
  const inRoom = validateFullRoomId(roomFromQuery);

  const resetGlobalStore = useGlobalStore((state) => state.resetStore);
  const resetRoomStore = useRoomStore((state) => state.reset);
  const resetChatStore = useChatStore((state) => state.reset);

  useEffect(() => {
    if (IS_DEMO_MODE || inRoom) return;
    resetGlobalStore();
    resetRoomStore();
    resetChatStore();
  }, [inRoom, resetGlobalStore, resetRoomStore, resetChatStore]);

  if (IS_DEMO_MODE) {
    return <NewSyncer roomId={DEMO_ROOM_ID} />;
  }

  if (inRoom) {
    return <NewSyncer roomId={roomFromQuery} />;
  }

  return <Join />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
