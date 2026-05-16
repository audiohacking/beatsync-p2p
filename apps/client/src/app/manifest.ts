import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beatsync",
    short_name: "Beatsync",
    description:
      "Turn every device into a synchronized speaker. Beatsync is an open-source music player for multi-device audio playback. Host a listening party today!",
    start_url: basePath ? `${basePath}/` : "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
