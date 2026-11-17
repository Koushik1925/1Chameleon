# Streaming & input performance

How Chameleon streams the host screen and carries remote mouse / keyboard input, what was measured, and how to
re-measure on your own machines. Numbers in the "Measurements" section are from one development machine; they show
*relative* effects, not what your users will see on their networks.

## Architecture (what runs where)

| Concern | Where | File |
|---|---|---|
| Capture size / fps, content hint, codec preference, `setParameters` | host | `agent/src/lib/hostStream.js` |
| Adaptive quality decisions (pure logic) | host | `agent/src/lib/qualityController.js` |
| Wiring into the hidden WebRTC page | host | `agent/src/webrtc.html` |
| Ordered, coalescing native input injection | host | `agent/src/platform/input/index.js` |
| Outbound input pipeline (moves vs. clicks/keys, stuck-key release) | viewer | `client/src/lib/inputSender.js` |
| One shared `getStats()` poll + metric maths | viewer | `client/src/lib/statsMonitor.js` |
| Minimal playout buffer | viewer | `client/src/lib/latencyTuner.js` |
| Overlay | viewer | `client/src/components/PerformanceOverlay.jsx`, `lib/overlayText.js` |

Quality adaptation runs **only on the host**: it is the only side that sees the bandwidth estimate, encode time and
`qualityLimitationReason`. (Previously the viewer ran a second controller that sent `update_resolution` messages and
fought the host's own loop over the same encoder; that controller is removed.)

### Presets

| Preset | Best rung the controller may use | Notes |
|---|---|---|
| Performance | 720p · 30 fps · ~1.5 Mbps | |
| Balanced (default) | 720p · 30 fps · ~2.5 Mbps | a session starts at ~2 Mbps and climbs while the link is healthy |
| Quality | 1080p · 30 fps · ~4 Mbps | the only preset that captures at 1080p |

These are starting targets, not guarantees: the controller steps down a ladder
(1080p30 → 720p30 → 720p30 @1.5M → 540p30 → 540p20 → 360p15) when loss, queueing delay (RTT above its own baseline),
a bandwidth estimate the encoder is actually pushing against, or an overloaded encoder (CPU-limited / slow encodes)
say it must. It steps down after 2 bad seconds, up after 10 good ones, never within a back-off window that doubles
after every retreat (15 s → 60 s), and one rung at a time. A high-but-stable RTT (a distant TURN relay) is *not*
treated as congestion, and a low bandwidth estimate on a static desktop (nothing being sent) is ignored.

### Data-channel protocol additions (all optional; older peers ignore them)

| Message | Direction | Meaning |
|---|---|---|
| `quality_preset {preset}` | viewer → host | `performance` / `balanced` / `quality` |
| `update_resolution {resolution}` | viewer → host | legacy label; the new host maps it to a preset ceiling |
| `stats_subscribe {on}` | viewer → host | host sends `host_stats` once a second only while the overlay is open |
| `host_stats {...}` | host → viewer | encode ms, limitation reason, preset, bitrate/fps actually sent, encoder |
| `input_probe {id}` / `input_probe_ack {id, hostMs}` | both | input latency through the host's input queue |
| `mouse_move {x,y,seq}` | viewer → host (unreliable channel) | `seq` lets the host drop a late, older move |
| `mouse_down/up {x,y,button}` | viewer → host (reliable channel) | carries its own position |

## Input path

* `mouse_move` → the unordered, `maxRetransmits: 0` **mouse** channel, newest position per animation frame (the
  first move after a pause is sent immediately), skipped if the channel's send buffer is backing up.
* Clicks, keys, wheel, clipboard → the **reliable ordered** channel, in exactly the order they happened. A pending
  move is flushed before them. They are never coalesced or dropped while the channel is open; they are deliberately
  *not* queued across a reconnect (replaying an old click onto a new screen is worse than losing it).
* The host executes events one at a time in arrival order. Only a `mouse_move` that is still waiting is replaced by a
  newer one (never across a click or key).
* **Root cause of the "slow input" report:** nut-js sleeps `autoDelayMs` *before* every key press/release (default
  300 ms) and every mouse button press/release/scroll (default 100 ms). Both are now 0.
* Stuck-input protection: the viewer releases every held key/button and all modifiers on window blur, tab hidden,
  mouse released outside the video, channel close and disconnect; the host releases whatever it pressed when the
  session ends or either input channel closes.
* Also fixed: sub-line trackpad wheel deltas used to round to 0 and vanish; they now accumulate.

## Performance overlay

Toolbar → activity icon (or open the page with `?perf=1`). Shows FPS (decoded and actually presented), resolution,
bitrate, RTT, packet loss, jitter, **DIRECT P2P vs RELAY (TURN/udp|tcp|tls)** with the candidate pair, codec and
HW/SW decoder, dropped frames and freezes; plus, from a current agent, host encode time, the host's limitation reason,
the active rung/preset and the measured input round trip. Off by default; while hidden it does not poll and the host
sends nothing. While visible it reuses the single shared once-per-second stats poll and writes straight to the DOM.

The agent logs `stream_route` (direct / relayed, relay protocol, RTT) and every encoder target change.

## Re-measuring

```
cd agent
npx electron perf/pipeline-bench.js --out=run.json --profiles=before-h264,after-balanced,after-quality --content=typical
node perf/summarize.js run.json
```

`before-*` profiles reproduce the old agent (1080p/60 capture, `contentHint=motion`, 4 Mbps); `after-<preset>` runs the
real `hostStream` code, including the live tuner. The harness captures the real desktop, encodes, decodes over a
loopback connection and reads `getStats()`, so it isolates capture + encode + decode from the network. It **cannot**
measure real networks, TURN or packet loss. It takes over the screen with a moving test pattern while it runs.

To compare direct and relayed sessions for real, connect twice (same networks, once with TURN forced by blocking UDP
or using mobile data) with the overlay open and compare RTT, loss, FPS and the Input round trip.

Host whose software H.264 encoder is the bottleneck? Set the environment variable `CHAMELEON_VIDEO_CODEC=VP8` for
the agent and re-run the benchmark with `after-balanced-vp8` to compare.

## Measurements (one dev machine: 13th-gen i7-13620H, Windows 11, Electron 28 / Chromium 120, 1920x1080)

**Method:** `agent/perf/pipeline-bench.js`, loopback WebRTC, real desktop capture, same on-screen test pattern for every
profile, 8 s ramp timeline + 6 s steady-state window. Typical content = one scrolling document window on a static
desktop (mean of 2 passes); stress = the whole screen scrolling (1 pass). Run-to-run noise is large (identical configs
varied by ~10-30% in some metrics), so only effects that repeated in every pass are claimed. Loopback has no network:
RTT is ~1 ms and nothing here says anything about Wi-Fi, mobile data, packet loss or TURN.

| Typical content | Sent resolution | Encoded fps | Bitrate | Encode ms/frame | Quality limiter |
|---|---|---|---|---|---|
| BEFORE (old agent, H.264) | 540p-720p, **270p-360p for the first 6-8 s** | 44 | 4.2 Mbps | 15.9 | bandwidth |
| AFTER Performance | 1280x720 from second 1 | 28.5 | 1.49 Mbps | 9.6 | none |
| AFTER Balanced (default) | 1280x720 from second 1 | 28.9 | 2.5 Mbps | 9.5 | none |
| AFTER Quality | 1920x1080 from second 1 | 29 | 3.5 Mbps | 16.1 | none |
| AFTER Balanced, VP8 | 1280x720 from second 1 | 28.4 | 2.5 Mbps | 6.6 | none |

Read this honestly: after sends **fewer frames per second on purpose** (30, not an unachievable 60) and at **a stable,
requested resolution** instead of a resolution that collapsed to 180-540p. Text is readable from the first second, the
encoder is no longer pinned at its limit, and bitrate is a quarter to two-thirds of before. Receive-side buffering and
render times were similar or lower for Performance/Balanced (jitter buffer ~3-4 ms vs ~42 ms for the old H.264
profile) but those are loopback numbers with noisy repeats: do not read them as a promised latency cut. Which encoder
Chromium used (hardware MediaFoundation vs software OpenH264) varied between runs on this machine.

**H.264 vs VP8:** no consistent winner at 720p30 (VP8 encodes and decodes faster on this machine; H.264 sometimes
buffers less). H.264 stays the default for hardware decode on phones; `CHAMELEON_VIDEO_CODEC=VP8` switches a host.

**Input (real nut-js, real controllers, this machine):**

| | Before | After |
|---|---|---|
| key_down -> executed (CapsLock, 4 / 50 samples) | 316 ms mean | 16 ms mean (p95 19 ms) |
| key_up -> executed | 313 ms mean | 15 ms mean (p95 16 ms) |
| 300 queued mouse moves fully processed | 137 ms | 0.9 ms (coalesced) |

The ~15 ms floor is Windows timer granularity inside nut-js. Mouse-button press/release goes through the same
`autoDelayMs` sleep (100 ms before, 0 after); that path was confirmed in the nut-js source but not separately timed,
because timing it means clicking on the desktop.

**Not measured:** phone on the same Wi-Fi, phone on mobile data, direct vs TURN-relayed sessions, low bandwidth,
packet loss / jitter, and the jitter-buffer-target effect under real jitter. The controller's reaction to loss, delay,
bandwidth and encoder overload is covered by unit tests with simulated stats (`agent/test/quality-controller.test.js`),
which is simulation, not a network measurement.
