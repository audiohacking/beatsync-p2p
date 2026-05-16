# CLAUDE.md

## Project Overview

Beatsync P2P fork: synchronized multi-device audio in the browser using **Trystero** (WebRTC). No central server; audio stays in-browser and is shared P2P.

- **`apps/client`**: Next.js 15+ (App Router), Zustand, Trystero
- **`packages/shared`**: Zod schemas (`WSRequest`, `WSBroadcast`, `p2p` envelopes)

## Commands

```bash
bun install
bun dev                  # Client on :3000 (P2P default)
bun run build
bun run --filter client test
bun run --filter client typecheck
```

## P2P Architecture

- **Room id**: `beatsyncp2p-v1-{roomCode}` via `toTrysteroRoomId()` in `apps/client/src/p2p/constants.ts`
- **Transport**: `useP2PConnectionStore` + `TrysteroManager` — `makeAction("envelope")` carries host/peer messages
- **Peer coordinator**: `P2PRoomCoordinator` in `apps/client/src/p2p/host/` — room logic on every peer; initiator fans out mutations
- **Room cache**: `apps/client/src/p2p/roomCache.ts` — localStorage snapshots; rejoining peer’s richer cache wins on merge
- **Audio**: `p2p://` URLs, IndexedDB (`localTracks.ts`), blob transfer (`transfer.ts`)
- **Client requests**: `sendWSRequest()` → `useP2PConnectionStore.sendRequest()` when `IS_P2P_MODE`

## Key Files

| Path | Role |
|------|------|
| `apps/client/src/p2p/host/P2PRoomCoordinator.ts` | Peer room state: play/pause, queue, chat, spatial, NTP |
| `apps/client/src/p2p/roomCache.ts` | localStorage room snapshots + merge (local precedence) |
| `apps/client/src/store/p2pConnection.ts` | Trystero join/leave, envelope routing |
| `apps/client/src/lib/roomMessages.ts` | Dispatch incoming WS-shaped responses to UI |
| `packages/shared/types/p2p.ts` | P2P envelope Zod types |

## Notes

- Music search / R2 / WebSocket server removed in this fork
- Host handoff when host leaves is not fully implemented — late joiners use `SYNC` snapshot from current host
