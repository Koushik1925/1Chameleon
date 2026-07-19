/**
 * frameWorker.js — Off-thread relay frame decoder
 *
 * WHY A WORKER?
 *   createImageBitmap() + canvas paint on the main thread competes with React
 *   reconciliation, DOM layout, and JS event handling, adding 5–15 ms of jank
 *   per frame. Moving decode here gives the main thread back those milliseconds
 *   and keeps cursor input snappy regardless of relay FPS.
 *
 * STALE FRAME DROPPING:
 *   If the decode queue grows above 2 pending frames we immediately discard
 *   incoming ones. Catching up on stale frames is the #1 cause of slideshow
 *   behaviour — we never want it. Newest frame always wins.
 *
 * ZERO-COPY TRANSFER:
 *   ArrayBuffers are transferred (not copied) into the worker via postMessage
 *   Transferable. On return the ImageBitmap is also transferred back.
 *   This keeps GC pressure minimal and avoids the Blob→ObjectURL pipeline.
 */

// ─── State ────────────────────────────────────────────────────────────────────
let pendingDecodes = 0;
const MAX_QUEUE_DEPTH = 2; // Any more than this = we're already behind, drop it

// ─── Message Handler ─────────────────────────────────────────────────────────
self.onmessage = async (event) => {
    const { id, buffer, timestamp } = event.data;

    // ── FRAME DEADLINE ENFORCEMENT ──────────────────────────────────────────
    // If this frame was queued more than 50 ms ago it is already stale.
    // Decoding it would only make the *next* frame arrive even later.
    if (performance.now() - timestamp > 50) {
        self.postMessage({ id, dropped: true, reason: 'deadline' });
        return;
    }

    // ── QUEUE DEPTH PROTECTION ───────────────────────────────────────────────
    // If we already have MAX_QUEUE_DEPTH frames in-flight, this one is stale
    // by definition — the display will have already moved on.
    if (pendingDecodes >= MAX_QUEUE_DEPTH) {
        self.postMessage({ id, dropped: true, reason: 'queue_full' });
        return;
    }

    pendingDecodes++;

    try {
        // createImageBitmap decodes the JPEG on the GPU-compositor side,
        // bypassing the JS heap entirely. It returns a GPU texture handle.
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        const bitmap = await createImageBitmap(blob, {
            // premultiplyAlpha is irrelevant for JPEG but explicit is faster
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none' // skip colour profile transforms
        });

        // Transfer the bitmap (zero-copy) back to the main thread.
        // After this postMessage call the worker no longer owns the bitmap.
        self.postMessage({ id, bitmap, dropped: false }, [bitmap]);
    } catch (err) {
        self.postMessage({ id, dropped: true, reason: 'decode_error' });
    } finally {
        pendingDecodes--;
    }
};
