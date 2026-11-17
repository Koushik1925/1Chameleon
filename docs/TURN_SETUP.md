# TURN relay setup (optional, fallback only)

Chameleon connects peers **directly** (STUN) whenever their networks allow it. A TURN relay is only used when a
direct attempt fails (symmetric / carrier-grade NAT, UDP blocked, corporate firewalls). Without TURN everything keeps
working on friendly networks; with TURN, restrictive network pairs connect too.

How it works: the viewer first tries a direct connection. If that fails and the server has a relay configured, the
viewer asks for it and the signaling server hands **short-lived** credentials to both peers. Permanent secrets never
leave Render.

## Option A (recommended): Cloudflare Realtime TURN — nothing to host

1. Cloudflare dashboard -> **Realtime** -> **TURN** -> create a TURN key. Note the **Key ID** and the **API token**.
2. Render -> your service -> **Environment**, add:
   | Variable | Value |
   |---|---|
   | `CLOUDFLARE_TURN_KEY_ID` | the key ID |
   | `CLOUDFLARE_TURN_API_TOKEN` | the API token (secret) |
   | `CLOUDFLARE_TURN_TTL_SECONDS` | optional, default `86400` (keep it longer than your longest session) |
3. Save (Render redeploys). Nothing to change on Vercel.
4. Verify: `https://<your-backend>/signaling-status` must show
   `"turnConfigured": true`, `"turnTransports": ["udp","tcp","tls"]` and `"turnProvider": {"state": "ok", ...}`.
   If `state` is `error`, `lastError` says why (for example `HTTP 401` = wrong key ID / token) and the Render log has a
   `relay fallback is DISABLED` warning. The backend never claims a relay exists when it does not.

Per Cloudflare's current documentation the service offers UDP 3478/443, TCP 3478/80 and TLS 5349/443, and billing
is per GB sent from Cloudflare with a monthly free allowance. Check the pricing page and your account before relying on
it; a payment method may be required.

## Option B: self-hosted coturn (needs a VPS with a public IPv4)

Render cannot run TURN (no UDP, no port range). Use a small VPS (any provider) with these ports open:
`3478/udp`, `3478/tcp`, `443/tcp` (TLS) and `49152-65535/udp` (relay ports).

`/etc/turnserver.conf`:

```
listening-port=3478
tls-listening-port=443          # needs the box to not run another HTTPS server on this IP
listening-ip=0.0.0.0
external-ip=<PUBLIC_IP>/<PRIVATE_IP>   # on clouds with 1:1 NAT (e.g. AWS/Oracle); just <PUBLIC_IP> otherwise
realm=turn.example.com
fingerprint
use-auth-secret
static-auth-secret=<LONG_RANDOM_SECRET>   # openssl rand -hex 32
cert=/etc/letsencrypt/live/turn.example.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.example.com/privkey.pem
min-port=49152
max-port=65535
no-multicast-peers
no-cli
total-quota=200
# never let relayed traffic reach private networks:
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
```

Get the certificate with `certbot certonly --standalone -d turn.example.com` (DNS A record -> the VPS), then
`systemctl enable --now coturn`.

Render environment variables:

| Variable | Value |
|---|---|
| `TURN_HOST` | `turn.example.com` (generates UDP 3478, TCP 3478 and TLS 443 URLs) |
| `TURN_SECRET` | the same value as `static-auth-secret` |
| `TURN_TTL_SECONDS` | optional, default `86400` |

The backend derives time-limited credentials (`<expiry>:chameleon` + HMAC-SHA1) per join; nothing static is shipped
to browsers. Verify with `/signaling-status` as above.

## Confirming a connection is really relayed

Open the browser console on the viewer (or the Render logs) and look for the `selected_pair` event:

- `route: "direct"`, `pairType` `host<->host`, `srflx<->srflx`, ... = peer-to-peer.
- `route: "relayed"`, `pairType` containing `relay`, and `relayProtocol` `udp` / `tcp` / `tls` = through TURN.

For a definitive check, `chrome://webrtc-internals` -> the active candidate pair -> local candidate type `relay`.

## Environment variable summary (Render)

| Variable | Needed |
|---|---|
| `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | Option A |
| `TURN_HOST` (or `TURN_URLS`) + `TURN_SECRET` (or `TURN_USERNAME`/`TURN_CREDENTIAL`) | Option B (takes precedence over A) |
| `CLOUDFLARE_TURN_TTL_SECONDS` / `TURN_TTL_SECONDS` | optional |

Vercel: no variables. The viewer receives ICE servers from the signaling server.
