'use strict';

const crypto = require('crypto');

/**
 * Single source of truth for the STUN/TURN servers handed to both WebRTC peers.
 *
 * TURN IS OPTIONAL AND FALLBACK-ONLY. The default (and the only thing used on a first attempt) is plain
 * STUN, exactly the TURN-free behaviour the app always had: peers connect directly whenever their
 * networks allow it. A relay is added ONLY when (a) a TURN server is configured below and (b) the viewer
 * has asked for it because a direct attempt already failed ({ relay: true }). With no TURN configured
 * nothing changes at all.
 *
 * Background: the lists that used to be hard-coded in the web client and the desktop agent contained
 * openrelay.metered.ca (a free public TURN service that has been shut down: its DNS now resolves to the
 * reserved addresses 192.0.2.1 / 100::1) and stun1/stun2.l.google.com:443 (Google runs STUN only on
 * :19302; those names are the same host as stun.l.google.com). They never blocked a direct connection,
 * but they delayed "ICE gathering complete" by ~40 s and offered no relay.
 *
 * Restrictive networks need more than UDP: a relay should be reachable over all three transports.
 *   turn:host:3478?transport=udp      fastest; blocked by some firewalls / mobile carriers
 *   turn:host:3478?transport=tcp      works where UDP is blocked
 *   turns:host:443?transport=tcp      TLS on 443: passes almost any firewall (looks like HTTPS)
 * Chrome gathers all of them and ICE nominates the best working pair, so there is nothing for users to choose.
 *
 * Managed relay (recommended, no server to run): Cloudflare Realtime TURN. The backend calls Cloudflare's
 * generate-ice-servers API with a TURN key and gets SHORT-LIVED credentials (UDP, TCP and TLS on 443), cached and
 * refreshed automatically. The API token stays in Render's environment; browsers only ever see the temporary
 * username/credential.
 *   CLOUDFLARE_TURN_KEY_ID, CLOUDFLARE_TURN_API_TOKEN   (both required)
 *   CLOUDFLARE_TURN_TTL_SECONDS                          credential lifetime (default 86400)
 * An explicit TURN_HOST / TURN_URLS configuration below takes precedence when both are present.
 *
 * Optional configuration (Render environment variables):
 *   TURN_HOST         easiest: just the hostname. Generates the udp + tcp (3478) + TLS (443) set above.
 *                     (TURN_PORT / TURNS_PORT override 3478 / 443.)
 *   TURN_URLS         or an explicit comma-separated list (takes precedence over TURN_HOST), e.g.
 *                     "turn:turn.example.com:3478,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:443?transport=tcp"
 *   TURN_USERNAME     \ static long-term credentials (provider dashboards: Metered, Xirsys, Twilio, ...)
 *   TURN_CREDENTIAL   /
 *   TURN_SECRET       OR a coturn `static-auth-secret`: short-lived credentials are derived per join
 *   TURN_TTL_SECONDS  lifetime of derived credentials (default 86400 = 24h). coturn re-checks the credential on every
 *                     allocation refresh, so a relayed session ENDS when its credential expires: keep this longer
 *                     than your longest expected session. (Renegotiations always receive fresh credentials.)
 */

// Verified with raw RFC 5389 binding requests. (stun1/stun2.l.google.com:443 and openrelay.metered.ca never answer.)
const DEFAULT_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
];

const isTurnUrl = (u) => /^turns?:\S+$/i.test(u);

function envPort(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

function rawTurnEntries(env) {
  const explicit = String(env.TURN_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (explicit.length) return explicit;
  const host = String(env.TURN_HOST || '').trim();
  if (!host) return [];
  const port = envPort(env.TURN_PORT, 3478);
  const tlsPort = envPort(env.TURNS_PORT, 443);
  return [`turn:${host}:${port}?transport=udp`, `turn:${host}:${port}?transport=tcp`, `turns:${host}:${tlsPort}?transport=tcp`];
}

// Anything that is not a turn:/turns: URL is dropped (a typo must never hand a broken entry to the browsers).
function parseTurnUrls(env) {
  return rawTurnEntries(env).filter(isTurnUrl);
}

function transportsOf(urls) {
  const transports = new Set();
  for (const u of urls) {
    if (/^turns:/i.test(u)) transports.add('tls');
    else if (/transport=tcp/i.test(u)) transports.add('tcp');
    else transports.add('udp');
  }
  return ['udp', 'tcp', 'tls'].filter((t) => transports.has(t));
}

/** Which transports the configured relay set offers, plus operator warnings. Never includes credentials. */
function describeTurnConfig(env = process.env, provider = null) {
  if (!isStaticTurnConfigured(env) && !rawTurnEntries(env).length && provider && provider.isEnabled()) {
    const servers = provider.getRelayServers();
    const st = provider.status();
    const warnings = [];
    if (!servers.length) warnings.push(`Managed TURN is configured but no credentials are available (${st.lastError || 'not fetched yet'}): the relay is disabled`);
    return { configured: servers.length > 0, transports: transportsOf(servers.flatMap((s) => s.urls)), warnings };
  }
  const raw = rawTurnEntries(env);
  const urls = raw.filter(isTurnUrl);
  const transports = new Set(transportsOf(urls));
  const warnings = [];
  if (raw.length > urls.length) warnings.push(`${raw.length - urls.length} TURN entr${raw.length - urls.length === 1 ? 'y was' : 'ies were'} ignored (must start with turn: or turns:)`);
  if (urls.length && !isStaticTurnConfigured(env)) warnings.push('TURN URLs are set but credentials are missing (TURN_USERNAME + TURN_CREDENTIAL, or TURN_SECRET): the relay is disabled');
  if (urls.length && !transports.has('tcp') && !transports.has('tls')) warnings.push('No TCP or TLS relay URL: networks that block UDP cannot use the relay');
  if (urls.length && !transports.has('tls')) warnings.push('No TLS (turns:) URL, ideally on port 443: restrictive firewalls usually only allow 443');
  return { configured: isStaticTurnConfigured(env), transports: ['udp', 'tcp', 'tls'].filter((t) => transports.has(t)), warnings };
}

function isStaticTurnConfigured(env) {
  const urls = parseTurnUrls(env);
  if (urls.length === 0) return false;
  return !!(env.TURN_SECRET || (env.TURN_USERNAME && env.TURN_CREDENTIAL));
}

/** True when a relay can actually be handed out right now (static/secret config, or live provider credentials). */
function isTurnConfigured(env = process.env, provider = null) {
  if (isStaticTurnConfigured(env)) return true;
  return !!(provider && provider.getRelayServers().length > 0);
}

/**
 * @param {object} [env]
 * @param {number} [nowMs]
 * @param {{relay?: boolean, provider?: object}} [options]  relay: include the TURN server (only ever true after a
 *        direct attempt failed); provider: managed-TURN credential cache (see createTurnProvider)
 */
function buildIceServers(env = process.env, nowMs = Date.now(), { relay = false, provider = null } = {}) {
  const servers = DEFAULT_STUN_URLS.map((urls) => ({ urls }));
  if (!relay) return servers;
  if (!isStaticTurnConfigured(env)) {
    return provider ? [...servers, ...provider.getRelayServers()] : servers;
  }

  const urls = parseTurnUrls(env);
  if (env.TURN_SECRET) {
    const ttl = parseInt(env.TURN_TTL_SECONDS, 10) > 0 ? parseInt(env.TURN_TTL_SECONDS, 10) : 86400;
    const username = `${Math.floor(nowMs / 1000) + ttl}:chameleon`;
    const credential = crypto.createHmac('sha1', env.TURN_SECRET).update(username).digest('base64');
    servers.push({ urls, username, credential });
  } else {
    servers.push({ urls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  }
  return servers;
}

/**
 * Managed TURN credentials from Cloudflare Realtime TURN (POST /v1/turn/keys/{id}/credentials/generate-ice-servers).
 * Credentials are fetched by the backend, cached, refreshed well before they expire, and served only while valid.
 * Neither the API token nor the issued credentials are ever logged or exposed in status output.
 */
function createTurnProvider(env = process.env, { fetchImpl, logger, now = () => Date.now(), retryMs = 60000 } = {}) {
  const keyId = String(env.CLOUDFLARE_TURN_KEY_ID || '').trim();
  const token = String(env.CLOUDFLARE_TURN_API_TOKEN || '').trim();
  const enabled = !!(keyId && token);
  const ttlSeconds = parseInt(env.CLOUDFLARE_TURN_TTL_SECONDS, 10) > 0 ? parseInt(env.CLOUDFLARE_TURN_TTL_SECONDS, 10) : 86400;
  const base = String(env.CLOUDFLARE_TURN_API_BASE || 'https://rtc.live.cloudflare.com').replace(/\/+$/, '');
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const state = { servers: [], expiresAt: 0, lastError: null, refreshedAt: 0 };
  let timer = null;
  let stopped = false;
  const log = (level, event, fields) => { if (logger && logger[level]) logger[level](event, fields); };

  // Port 53 entries are blocked by browsers and only add timeouts.
  const usable = (u) => isTurnUrl(u) && !/:53(\?|$)/.test(u);

  async function refresh() {
    if (!enabled) return false;
    if (!doFetch) { state.lastError = 'fetch unavailable'; return false; }
    try {
      const res = await doFetch(`${base}/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: ttlSeconds }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const servers = [];
      for (const entry of (body && body.iceServers) || []) {
        const urls = [].concat(entry && entry.urls ? entry.urls : []).filter(usable);
        if (urls.length && entry.username && entry.credential) servers.push({ urls, username: entry.username, credential: entry.credential });
      }
      if (!servers.length) throw new Error('response contained no TURN entries');
      state.servers = servers;
      state.expiresAt = now() + ttlSeconds * 1000;
      state.refreshedAt = now();
      state.lastError = null;
      log('info', 'turn.provider_refreshed', { provider: 'cloudflare', ttlSeconds, entries: servers.length });
      return true;
    } catch (err) {
      // Message only: never the token, the issued credentials or the response body.
      state.lastError = /^HTTP \d+$/.test(err.message) || /no TURN entries/.test(err.message) ? err.message : 'request failed';
      log('warn', 'turn.provider_error', { provider: 'cloudflare', error: state.lastError });
      return false;
    }
  }

  function schedule(ok) {
    if (stopped) return;
    const delay = ok ? Math.max(retryMs, Math.floor((ttlSeconds * 1000) / 4)) : retryMs;
    timer = setTimeout(async () => { schedule(await refresh()); }, delay);
    if (timer.unref) timer.unref();
  }

  return {
    isEnabled: () => enabled,
    async start() { if (!enabled) return false; const ok = await refresh(); schedule(ok); return ok; },
    refresh,
    stop() { stopped = true; if (timer) clearTimeout(timer); },
    /** Valid credentials only: expired or nearly expired ones are never handed out. */
    getRelayServers() {
      if (!enabled || !state.servers.length) return [];
      if (now() > state.expiresAt - (ttlSeconds * 1000) / 10) return [];
      return state.servers.map((s) => ({ ...s, urls: [...s.urls] }));
    },
    status() {
      const valid = this.getRelayServers().length > 0;
      return {
        provider: enabled ? 'cloudflare' : 'none',
        state: !enabled ? 'disabled' : valid ? 'ok' : state.lastError ? 'error' : 'starting',
        lastError: state.lastError,
        credentialsValidForSec: valid ? Math.max(0, Math.round((state.expiresAt - now()) / 1000)) : 0,
      };
    },
  };
}

module.exports = { buildIceServers, isTurnConfigured, describeTurnConfig, createTurnProvider, DEFAULT_STUN_URLS };
