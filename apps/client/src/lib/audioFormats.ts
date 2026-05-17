/** Primary format for room uploads and P2P transfer. */
export const PREFERRED_AUDIO_EXTENSION = ".mp3";

export const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".mpeg", ".wav", ".m4a", ".aac", ".ogg", ".webm", ".flac"] as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".mpga": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
};

const MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
};

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot).toLowerCase();
}

/** Normalize browser/OS MIME quirks (MP3 is usually reported as audio/mpeg). */
export function normalizeAudioMimeType(mimeType: string, fileName = ""): string {
  const trimmed = mimeType.trim().toLowerCase();
  if (trimmed && MIME_ALIASES[trimmed]) {
    return MIME_ALIASES[trimmed];
  }
  if (trimmed.startsWith("audio/")) {
    return trimmed;
  }
  return inferAudioMimeType(fileName);
}

export function inferAudioMimeType(fileName: string): string {
  const ext = getExtension(fileName);
  return EXTENSION_TO_MIME[ext] ?? "audio/mpeg";
}

export function isSupportedAudioFile(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime.startsWith("audio/")) {
    return true;
  }
  const ext = getExtension(file.name);
  return SUPPORTED_AUDIO_EXTENSIONS.includes(ext as (typeof SUPPORTED_AUDIO_EXTENSIONS)[number]);
}

/** File picker `accept` — MP3 first, other common formats as secondary. */
export const AUDIO_FILE_INPUT_ACCEPT =
  ".mp3,audio/mpeg,audio/mp3,.mpeg,.mpga,audio/wav,.wav,audio/mp4,.m4a,audio/aac,.aac,audio/ogg,.ogg,audio/webm,.webm,audio/flac,.flac";
