/**
 * Native, NON-passive registration of the remote surface's touch / wheel listeners.
 *
 * React attaches onTouchStart / onTouchMove / onWheel at the root as PASSIVE listeners. A passive listener's
 * preventDefault() is ignored and the browser logs "Unable to preventDefault inside passive event listener
 * invocation". That is not only console noise: because the event is never cancelled the browser keeps its own
 * gesture behaviour on top of the remote desktop - horizontal wheel / trackpad swipes and touch edge-swipes
 * trigger history-back, a downward drag triggers pull-to-refresh, taps produce synthesized mouse events. A
 * history-back unmounts the viewer (ClientApp cleanup -> ConnectionManager.disconnect()), a refresh unloads it
 * (pagehide -> disconnect()); either closes the peer connection and with it both data channels.
 *
 * Listeners that must call preventDefault() have to be registered with { passive: false } on the element itself.
 */

/**
 * @param {EventTarget} element  the video / canvas the remote desktop is drawn on
 * @param {{ touchstart?: Function, touchmove?: Function, wheel?: Function }} handlers  called with the native event
 *        AFTER preventDefault(); read through `getHandlers()` so a re-render never needs to re-register
 * @returns {() => void} detach
 */
export function attachInputGuards(element, getHandlers) {
  if (!element || typeof element.addEventListener !== 'function') return () => {};
  const handlerFor = (type) => (event) => {
    event.preventDefault();
    const handlers = typeof getHandlers === 'function' ? getHandlers() : getHandlers;
    const fn = handlers && handlers[type];
    if (fn) fn(event);
  };
  const listeners = ['touchstart', 'touchmove', 'wheel'].map((type) => [type, handlerFor(type)]);
  for (const [type, fn] of listeners) element.addEventListener(type, fn, { passive: false });
  return () => {
    for (const [type, fn] of listeners) element.removeEventListener(type, fn, { passive: false });
  };
}
