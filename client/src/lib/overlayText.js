/** Text for the performance overlay. Pure (no DOM / React) so it can be unit tested. */
export const fmt = (v, digits = 0, unit = '') => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}${unit}`);

/** Lines shown in the overlay. Pure (no DOM): exported so it can be unit tested. */
export function buildOverlayLines(m, host, input, renderFps) {
  const route = m.route === 'relayed'
    ? `RELAY (TURN${m.relayProtocol ? '/' + m.relayProtocol : ''})`
    : m.route === 'direct' ? `DIRECT P2P${m.transport ? ' ' + m.transport : ''}` : '—';
  const lines = [
    `FPS       ${fmt(m.fps, 0)}${renderFps !== null ? `  (shown ${fmt(renderFps, 0)})` : ''}   ${m.width && m.height ? `${m.width}×${m.height}` : '—'}`,
    `Bitrate   ${fmt(m.bitrateKbps === null || m.bitrateKbps === undefined ? null : m.bitrateKbps / 1000, 2, ' Mbps')}${host && host.targetKbps ? `  (cap ${fmt(host.targetKbps / 1000, 1)})` : ''}`,
    `RTT       ${fmt(m.rttMs, 0, ' ms')}    Loss ${fmt(m.lossPct, 1, '%')}    Jitter ${fmt(m.jitterMs, 0, ' ms')}`,
    `Route     ${route}${m.candidatePair ? `  [${m.candidatePair}]` : ''}`,
    `Codec     ${m.codec || '—'}${m.decoder ? `  ·  ${m.hardwareDecoder ? 'HW' : 'SW'} decode (${m.decoder.replace(/^ExternalDecoder\s*/, '')})` : ''}`,
    `Dropped   ${m.framesDroppedTotal} frames    Freezes ${m.freezeCount}`,
    `Viewer    decode ${fmt(m.decodeMs, 1, ' ms')}    jitter buffer ${fmt(m.jitterBufferMs, 0, ' ms')}`
  ];
  if (host && host.label) {
    lines.push(`Host      encode ${fmt(host.encodeMs, 1, ' ms')}    limit ${host.limit || '—'}    ${host.label} (${host.preset})`);
    lines.push(`Host rate ${fmt(host.sentKbps / 1000, 2, ' Mbps')} @ ${fmt(host.sentFps, 0, ' fps')}    BWE ${fmt(host.availKbps / 1000, 1, ' Mbps')}    ${host.hardwareEncoder ? 'HW' : 'SW'} ${host.encoder || ''}`);
  } else {
    lines.push('Host      (no host stats: agent too old, or still connecting)');
  }
  lines.push(input
    ? `Input     ${fmt(input.rttMs, 0, ' ms')} round trip  (host queue ${fmt(input.hostMs, 0, ' ms')})`
    : 'Input     measuring…');
  return lines;
}
