import { describe, expect, test } from "bun:test";
import { sanitizePlaybackStateForSources } from "../audio/availableSources";
import type { RoomPlaybackStateCache } from "../roomCache";

describe("sanitizePlaybackStateForSources", () => {
  const paused: RoomPlaybackStateCache = {
    type: "paused",
    audioSource: "p2p://gone",
    serverTimeToExecute: 0,
    trackPositionSeconds: 12,
  };

  test("clears current track when it is not in the playlist", () => {
    const result = sanitizePlaybackStateForSources(paused, []);
    expect(result.audioSource).toBe("");
    expect(result.trackPositionSeconds).toBe(0);
  });

  test("keeps playback state when the track is still listed", () => {
    const result = sanitizePlaybackStateForSources(paused, [{ url: "p2p://gone" }]);
    expect(result.audioSource).toBe("p2p://gone");
  });
});
