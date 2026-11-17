'use strict';

/**
 * Structured (one JSON object per line) logging for the signaling lifecycle.
 *
 * Privacy rules enforced here, not left to callers:
 *  - SDP bodies, ICE candidate strings (which contain IP addresses), tokens, passwords and
 *    credentials are NEVER emitted. Callers pass summaries (type / size / candidate type).
 *  - Session codes are the join credential for a remote desktop, so they are masked
 *    ("12****") unless LOG_FULL_SESSION_IDS=true is set explicitly for debugging.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Any field whose key matches is replaced, regardless of what the caller passed.
const SENSITIVE_KEY = /(sdp$|^sdp|candidate$|token|secret|password|credential|authorization|cookie|username)/i;

function threshold() {
  const configured = String(process.env.SIGNALING_LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[configured] || LEVELS.info;
}

function maskSessionId(id) {
  if (process.env.LOG_FULL_SESSION_IDS === 'true') return String(id);
  const s = String(id == null ? '' : id);
  if (s.length <= 2) return '**';
  return s.slice(0, 2) + '*'.repeat(Math.min(s.length - 2, 6));
}

function sanitizeValue(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value.length > 200 ? value.slice(0, 200) + '…' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return '[object]';
}

function sanitizeFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeValue(value);
  }
  return out;
}

function emit(level, event, fields) {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...sanitizeFields(fields) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {
  debug: (event, fields) => emit('debug', event, fields),
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
};

/** Summarise an ICE candidate without exposing its address: { candidateType, protocol } */
function describeCandidate(candidate) {
  const text = candidate && (typeof candidate === 'string' ? candidate : candidate.candidate);
  if (!text) return { candidateType: 'end-of-candidates' };
  const parts = String(text).trim().split(/\s+/);
  const typIndex = parts.indexOf('typ');
  return {
    candidateType: typIndex >= 0 ? parts[typIndex + 1] : 'unknown',
    protocol: parts[2] ? parts[2].toLowerCase() : 'unknown',
  };
}

/** Summarise an SDP session description without exposing its body: { descriptionType, descriptionBytes } */
function describeSdp(description) {
  return {
    descriptionType: description && description.type ? String(description.type) : 'unknown',
    descriptionBytes: description && typeof description.sdp === 'string' ? description.sdp.length : 0,
  };
}

module.exports = { logger, maskSessionId, describeCandidate, describeSdp, sanitizeFields };
