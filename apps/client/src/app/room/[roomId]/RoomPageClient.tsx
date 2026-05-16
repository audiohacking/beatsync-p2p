"use client";

import { NewSyncer } from "@/components/NewSyncer";
import { DEMO_ROOM_ID, IS_DEMO_MODE } from "@/lib/demo";
import { roomEntryPath } from "@/lib/paths";
import { validateFullRoomId } from "@/lib/room";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoomPageClientProps {
  roomId: string;
}

/** Legacy `/room/[id]` — redirects arbitrary codes to `/?room=` for static hosting. */
export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (!roomId || roomId === "000000") return;
    if (validateFullRoomId(roomId)) {
      router.replace(roomEntryPath(roomId));
    }
  }, [roomId, router]);

  useEffect(() => {
    if (IS_DEMO_MODE && roomId && roomId !== DEMO_ROOM_ID) {
      router.replace("/");
    }
  }, [roomId, router]);

  if (!validateFullRoomId(roomId)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p>
          Invalid room ID: <span className="font-bold">{roomId}</span>.
        </p>
        <p className="text-sm text-gray-500">Please enter a valid 6-digit numeric code.</p>
      </div>
    );
  }

  return <NewSyncer roomId={roomId} />;
}
