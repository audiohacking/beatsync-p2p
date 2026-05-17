# Beatsync P2P

Ephemeral Synchronized multi-device audio playback in the browser — fully **peer-to-peer** via [Trystero](https://github.com/dmotz/trystero). 

> Create a room, upload tracks and play in sync. No backend, no cloud storage, no leaks.

## Live demo

**[https://audiohacking.github.io/beatsync-p2p](https://audiohacking.github.io/beatsync-p2p)**

Open the link, join or create a 6-digit room, and share the URL with others in the same session.

## Why P2P?

This fork is built around a **serverless** room model:

- **Your audio stays on your devices.** Uploads are stored in the browser (IndexedDB) and sent **directly to peers** over WebRTC. Unlike the original Beatsync, files are **never uploaded to a central server**, so there is no server-side copy that could be retained, scanned, or leaked.
- **No account or backend room host.** Peers coordinate playback, queue, chat, and clock sync among themselves. Signaling uses public WebRTC relays only to establish connections — not to host your music.
- **Same sync goals as the original.** Scheduled play/pause, NTP-style clock alignment, spatial audio, and queue controls — without tying playback to a single datacenter.

Trade-offs: you need at least one peer online who has a given track for others to fetch it.

## Quickstart (local dev)

```bash
bun install
bun dev    # http://localhost:3000
```

Upload audio from the queue panel. Files stay local and replicate to other peers in the room when they connect.

## How it works

| Piece | Role |
|-------|------|
| `apps/client` | Next.js app — UI, Trystero rooms, per-peer room state |
| `packages/shared` | Zod schemas for room messages and P2P envelopes |

- **Room id:** `beatsync-p2p-v1-{6-digit-code}` (Trystero)
- **Track ids:** `p2p://{trackId}` — blobs in IndexedDB, transferred via Trystero `audio-track` actions
- **Sync:** NTP-style probes between peers; play/pause scheduled against a shared clock

## Repository

Source and issues: [github.com/audiohacking/beatsync-p2p](https://github.com/audiohacking/beatsync-p2p)
