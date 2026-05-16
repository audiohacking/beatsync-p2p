# Beatsync P2P

Multi-device synchronized audio playback in the browser — **peer-to-peer** via [Trystero](https://github.com/dmotz/trystero). No Beatsync server, no cloud audio storage. Tracks live in the browser (IndexedDB) and are shared with peers in the same room.

## Quickstart

```bash
bun install
bun dev          # http://localhost:3000 — P2P mode (default)
```

Join or create a 6-digit room. Upload audio from the queue panel; files are stored locally and synced to other peers over WebRTC.

## Architecture

| Package | Purpose |
|---------|---------|
| `apps/client` | Next.js app — Trystero rooms, host peer state, UI |
| `packages/shared` | Zod schemas for room messages and P2P envelopes |

- **Trystero room id**: `beatsyncp2p-v1-{6-digit-code}`
- **Host peer**: lowest `selfId` in the room runs scheduling (play/pause, queue, chat, NTP)
- **Audio URLs**: `p2p://{trackId}` — blobs in IndexedDB, transferred via Trystero `audio-track` action

## Environment

`apps/client/.env`:

```sh
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_P2P_MODE=1
```

Set `NEXT_PUBLIC_P2P_MODE=0` only if you are running a legacy server fork (not included in this repo).

## Scripts

```bash
bun dev              # Next dev (P2P)
bun run client:p2p     # Same, explicit
bun run build          # Production build
bun run --filter client typecheck
bun run --filter client test
```

See [P2P_PLAN.md](P2P_PLAN.md) for migration notes and future hardening (TURN, host handoff).
