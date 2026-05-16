import { RoomPageClient } from "./RoomPageClient";

/** Placeholder for static export; real room codes use `/?room=`. */
export function generateStaticParams() {
  return [{ roomId: "000000" }];
}

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomPageClient roomId={roomId} />;
}
