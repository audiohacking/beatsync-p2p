import { describe, expect, test } from "bun:test";
import { inferAudioMimeType, isSupportedAudioFile, normalizeAudioMimeType } from "@/lib/audioFormats";

describe("audioFormats", () => {
  test("infers MP3 mime from extension", () => {
    expect(inferAudioMimeType("track.mp3")).toBe("audio/mpeg");
    expect(inferAudioMimeType("TRACK.MP3")).toBe("audio/mpeg");
  });

  test("normalizes audio/mp3 alias", () => {
    expect(normalizeAudioMimeType("audio/mp3", "x.mp3")).toBe("audio/mpeg");
  });

  test("accepts MP3 by extension when MIME is empty", () => {
    const file = new File([new Uint8Array(0)], "song.mp3", { type: "" });
    expect(isSupportedAudioFile(file)).toBe(true);
  });
});
