# Beatsync P2P Fork — Migration Plan

Fork goal: **100% browser P2P** via [Trystero](https://github.com/dmotz/trystero). No Beatsync server, no R2/S3, no audio in the cloud.

## Status: v1 complete

| Phase | Status |
|-------|--------|
| 0 Scaffold | Done |
| 1 Room state on host | Done |
| 2 Audio local + P2P | Done |
| 3 Playback sync | Done |
| 4 Spatial + handlers | Done |
| 5 Server/R2 removal | Done |
| 6 Hardening | Partial (see below) |

## Naming

| Concept | Value |
|--------|--------|
| Trystero `appId` | `beatsyncp2p` |
| Trystero `roomId` | `beatsyncp2p-v1-{roomCode}` |
| Audio URL | `p2p://{trackId}` |

## Dev

```bash
bun install
bun dev    # P2P client only, :3000
```

`NEXT_PUBLIC_P2P_MODE=1` in `apps/client/.env` (default on).

## Remaining hardening (optional)

- Host handoff when elected host disconnects (state snapshot to new host)
- `joinRoom({ password })` for room secrets beyond 6-digit code
- TURN (`turnConfig`) for restrictive NATs
- On-demand audio fetch when peer joins mid-room without full blob broadcast
