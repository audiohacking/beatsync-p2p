import { describe, expect, test } from "bun:test";
import { computeCacheRichness, createEmptyRoomCache, mergeRoomCaches } from "../roomCache";

describe("mergeRoomCaches", () => {
  test("local cache wins when richer than remote", () => {
    const local = {
      ...createEmptyRoomCache(),
      audioSources: [{ url: "p2p://a" }, { url: "p2p://b" }],
      updatedAt: 100,
    };
    const remote = {
      ...createEmptyRoomCache(),
      audioSources: [{ url: "p2p://c" }],
      updatedAt: 200,
    };

    const { merged, acceptedRemote } = mergeRoomCaches(local, remote);
    expect(acceptedRemote).toBe(false);
    expect(merged.audioSources).toHaveLength(2);
    expect(computeCacheRichness(merged)).toBe(computeCacheRichness(local));
  });

  test("accepts remote when strictly richer", () => {
    const local = createEmptyRoomCache();
    const remote = {
      ...createEmptyRoomCache(),
      audioSources: [{ url: "p2p://x" }],
      updatedAt: 50,
    };

    const { merged, acceptedRemote } = mergeRoomCaches(local, remote);
    expect(acceptedRemote).toBe(true);
    expect(merged.audioSources).toHaveLength(1);
  });
});
