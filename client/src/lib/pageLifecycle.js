/**
 * Page-lifecycle wiring for the viewer, kept out of React so it can be tested with a fake window.
 *
 *  - A real unload (tab close, refresh, navigation: pagehide with persisted=false) ends the session explicitly.
 *  - A page that is only being frozen into the back/forward cache (persisted=true) must NOT be ended: nothing is
 *    gone, the page may come back, and tearing the peer down would also leave the UI claiming "connected".
 *  - Coming back (pageshow, tab visible again, network back online) is the moment to nudge recovery along:
 *    mobile browsers throttle timers in the background, so waiting for the grace timers is slow.
 *
 * Every disconnect carries a reason so the console line `disconnected_by_viewer` says WHO ended the session.
 */

/**
 * @param {object} opts
 * @param {EventTarget} opts.win   window
 * @param {EventTarget} [opts.doc] document (for visibilitychange)
 * @param {() => ({disconnect: Function, resume: Function}|null)} opts.getManager  always the CURRENT manager
 * @param {Function} [opts.onUnload]  extra work on a real unload (e.g. release held keys), runs before disconnect
 * @returns {() => void} unbind
 */
export function bindPageLifecycle({ win, doc, getManager, onUnload }) {
  const manager = () => (typeof getManager === 'function' ? getManager() : null);

  const onPageHide = (event) => {
    if (event && event.persisted) return; // frozen into bfcache, not leaving
    if (onUnload) onUnload();
    const m = manager();
    if (m) m.disconnect('pagehide');
  };
  const onPageShow = (event) => {
    if (event && event.persisted) { const m = manager(); if (m) m.resume('pageshow'); }
  };
  const onOnline = () => { const m = manager(); if (m) m.resume('online'); };
  const onVisibility = () => {
    if (doc && doc.visibilityState === 'visible') { const m = manager(); if (m) m.resume('visible'); }
  };

  win.addEventListener('pagehide', onPageHide);
  win.addEventListener('pageshow', onPageShow);
  win.addEventListener('online', onOnline);
  if (doc) doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    win.removeEventListener('pagehide', onPageHide);
    win.removeEventListener('pageshow', onPageShow);
    win.removeEventListener('online', onOnline);
    if (doc) doc.removeEventListener('visibilitychange', onVisibility);
  };
}
