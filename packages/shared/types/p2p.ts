import { z } from "zod";
import { WSBroadcastSchema } from "./WSBroadcast";
import { WSRequestSchema } from "./WSRequest";
import { WSUnicastSchema } from "./WSUnicast";

/** Serializable room state for cache sync between peers */
export const RoomCacheSnapshotSchema = z.object({
  version: z.number(),
  updatedAt: z.number(),
  audioSources: z.array(z.object({ url: z.string() })),
  playbackState: z.object({
    type: z.enum(["playing", "paused"]),
    audioSource: z.string(),
    serverTimeToExecute: z.number(),
    trackPositionSeconds: z.number(),
  }),
  playbackControlsPermissions: z.enum(["ADMIN_ONLY", "EVERYONE"]),
  globalVolume: z.number(),
  lowPassFreq: z.number(),
  isMetronomeEnabled: z.boolean(),
  chatMessages: z.array(
    z.object({
      id: z.number(),
      clientId: z.string(),
      username: z.string(),
      text: z.string(),
      timestamp: z.number(),
      countryCode: z.string().optional(),
      isCreator: z.boolean().optional(),
    })
  ),
  chatNextMessageId: z.number(),
});

/** Peer → peer (or room) full state offer */
export const P2PStateSnapshotEnvelopeSchema = z.object({
  kind: z.literal("state-snapshot"),
  fromPeerId: z.string(),
  richness: z.number(),
  snapshot: RoomCacheSnapshotSchema,
});
export type P2PStateSnapshotEnvelope = z.infer<typeof P2PStateSnapshotEnvelopeSchema>;

/** Client → all peers (initiator applies locally; others handle NTP/SYNC only) */
export const P2PRequestEnvelopeSchema = z.object({
  kind: z.literal("request"),
  fromPeerId: z.string(),
  clientId: z.string(),
  username: z.string(),
  payload: WSRequestSchema,
});
export type P2PRequestEnvelope = z.infer<typeof P2PRequestEnvelopeSchema>;

/** Any peer → all peers (UI-shaped payloads) */
export const P2PBroadcastEnvelopeSchema = z.object({
  kind: z.literal("broadcast"),
  payload: WSBroadcastSchema,
});
export type P2PBroadcastEnvelope = z.infer<typeof P2PBroadcastEnvelopeSchema>;

/** Peer → single peer (NTP, scheduled actions, search, etc.) */
export const P2PUnicastEnvelopeSchema = z.object({
  kind: z.literal("unicast"),
  toPeerId: z.string(),
  payload: WSUnicastSchema,
});
export type P2PUnicastEnvelope = z.infer<typeof P2PUnicastEnvelopeSchema>;

/** Peer → single peer (room events that are normally broadcast-shaped) */
export const P2PDirectEnvelopeSchema = z.object({
  kind: z.literal("direct"),
  toPeerId: z.string(),
  payload: WSBroadcastSchema,
});
export type P2PDirectEnvelope = z.infer<typeof P2PDirectEnvelopeSchema>;

export const P2PEnvelopeSchema = z.discriminatedUnion("kind", [
  P2PRequestEnvelopeSchema,
  P2PStateSnapshotEnvelopeSchema,
  P2PBroadcastEnvelopeSchema,
  P2PUnicastEnvelopeSchema,
  P2PDirectEnvelopeSchema,
]);
export type P2PEnvelope = z.infer<typeof P2PEnvelopeSchema>;
