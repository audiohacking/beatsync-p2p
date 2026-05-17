import { audioContextManager } from "@/lib/audioContextManager";
import { inferAudioMimeType, normalizeAudioMimeType } from "@/lib/audioFormats";

/**
 * Decode compressed audio (MP3, AAC, …) to an AudioBuffer for Web Audio playback.
 * Uses `decodeAudioData` first; falls back to OfflineAudioContext + HTML audio for edge cases.
 */
export async function decodeAudioArrayBuffer(
  arrayBuffer: ArrayBuffer,
  options: { mimeType?: string; fileName?: string } = {}
): Promise<AudioBuffer> {
  const mimeType = normalizeAudioMimeType(options.mimeType ?? "", options.fileName ?? "");
  const ctx = audioContextManager.getContext();
  const copy = arrayBuffer.slice(0);

  try {
    return await ctx.decodeAudioData(copy);
  } catch (firstError) {
    console.warn("[decodeAudio] decodeAudioData failed, trying media-element fallback:", firstError);
    return decodeViaMediaElement(arrayBuffer, mimeType, ctx.sampleRate);
  }
}

async function decodeViaMediaElement(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  sampleRate: number
): Promise<AudioBuffer> {
  const blob = new Blob([arrayBuffer], { type: mimeType || inferAudioMimeType("") });
  const url = URL.createObjectURL(blob);
  const audio = new Audio();

  try {
    audio.preload = "auto";
    audio.src = url;

    await new Promise<void>((resolve, reject) => {
      const onError = () => reject(new Error("Browser could not load this audio file"));
      audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });

    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      throw new Error("Invalid audio duration");
    }

    const channels = 2;
    const length = Math.ceil(audio.duration * sampleRate);
    const offline = new OfflineAudioContext(channels, length, sampleRate);
    // DOM typings omit this on OfflineAudioContext; browsers implement it on BaseAudioContext.
    const source = (
      offline as OfflineAudioContext & {
        createMediaElementSource: (el: HTMLMediaElement) => MediaElementAudioSourceNode;
      }
    ).createMediaElementSource(audio);
    source.connect(offline.destination);

    await audio.play();
    return await offline.startRendering();
  } finally {
    audio.pause();
    URL.revokeObjectURL(url);
  }
}
