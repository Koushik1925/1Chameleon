import { useEffect, useRef } from 'react';
import { getStatsMonitor } from '../lib/statsMonitor';
import { perfBus } from '../lib/perfBus';
import { buildOverlayLines } from '../lib/overlayText';

/**
 * Lightweight performance overlay. Off by default (toggle in the toolbar, or open the page with ?perf=1).
 * While hidden it costs nothing: it does not poll, and tells the host to stop sending stats. While visible it
 * piggybacks on the shared once-per-second stats poll and writes straight to the DOM (no React state, no re-render).
 */
export default function PerformanceOverlay({ visible, peerConnection, videoRef, inputSender, sendInputEvent }) {
  const preRef = useRef(null);
  const framesRef = useRef({ count: 0, at: 0, fps: null });

  // Count frames actually presented by the <video> (requestVideoFrameCallback): the true on-screen frame rate.
  useEffect(() => {
    const video = videoRef && videoRef.current;
    if (!visible || !video || typeof video.requestVideoFrameCallback !== 'function') return undefined;
    let handle = 0;
    let stopped = false;
    const frames = framesRef.current;
    frames.count = 0;
    frames.at = performance.now();
    const onFrame = () => {
      if (stopped) return;
      frames.count += 1;
      handle = video.requestVideoFrameCallback(onFrame);
    };
    handle = video.requestVideoFrameCallback(onFrame);
    return () => {
      stopped = true;
      try { video.cancelVideoFrameCallback(handle); } catch { /* ignore */ }
    };
  }, [visible, videoRef, peerConnection]);

  useEffect(() => {
    if (!visible || !peerConnection) return undefined;
    sendInputEvent({ type: 'stats_subscribe', on: true });
    if (inputSender) inputSender.startProbing(2000);

    const unsubscribe = getStatsMonitor(peerConnection).subscribe((metrics) => {
      const frames = framesRef.current;
      const now = performance.now();
      const seconds = (now - frames.at) / 1000;
      if (seconds >= 0.5) {
        frames.fps = frames.count / seconds;
        frames.count = 0;
        frames.at = now;
      }
      if (preRef.current) {
        preRef.current.textContent = buildOverlayLines(metrics, perfBus.getHost(), perfBus.getInput(), frames.fps).join('\n');
      }
    });

    return () => {
      unsubscribe();
      if (inputSender) inputSender.stopProbing();
      sendInputEvent({ type: 'stats_subscribe', on: false });
    };
  }, [visible, peerConnection, inputSender, sendInputEvent]);

  if (!visible) return null;
  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-3 z-[60] m-0 max-w-[calc(100%-1.5rem)] overflow-hidden whitespace-pre rounded-lg border border-cyan-500/30 bg-[#0b0f14]/85 px-3 py-2 font-mono text-[11px] leading-[1.45] text-cyan-200 shadow-lg backdrop-blur-sm"
    >
      Collecting stats…
    </pre>
  );
}
