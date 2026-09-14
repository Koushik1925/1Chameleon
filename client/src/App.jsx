import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import QRScanner from './components/QRScanner';
import RemoteView from './components/RemoteView';
import OTPInput from './components/OTPInput';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import DeviceApprove from './components/DeviceApprove';
import MyDevices from './components/MyDevices';
import { Power, ShieldCheck, ArrowLeft, Shield } from 'lucide-react';
import { AdaptiveController } from './lib/adaptiveController';

// Lazy-loaded SaaS pages
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccountPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const BillingPortalPage = lazy(() => import('./pages/BillingPortalPage'));
const BillingSuccessPage = lazy(() => import('./pages/BillingSuccessPage'));
const BillingFailedPage = lazy(() => import('./pages/BillingFailedPage'));

// Use environment variable for production, fallback to local
const SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL || 'https://onechameleon.onrender.com').replace(/\/$/, '');

function ClientApp() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('scan'); // scan -> connecting -> connected -> error
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isControlPaused, setIsControlPaused] = useState(false);

  const sessionStartTimeRef = useRef(null);
  const [sessionDuration, setSessionDuration] = useState('');
  const [lastSessionId, setLastSessionId] = useState(() => {
    const saved = localStorage.getItem('chameleon_last_session');
    if (saved) {
      const { id, timestamp } = JSON.parse(saved);
      // Valid for 2 hours
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) return id;
    }
    return null;
  });
  const [manualSessionId, setManualSessionId] = useState('');

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  // DUAL CHANNELS: mouse = unordered/unreliable, keyboard = ordered/reliable
  const mouseChannelRef = useRef(null);
  const keyboardChannelRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const isRemoteDescriptionSet = useRef(false);
  // GCC-inspired ABR controller (one instance per session)
  const abrControllerRef = useRef(null);
  const abrIntervalRef   = useRef(null);

  useEffect(() => {
    // If we have a sessionId parsed from URL or manual entry (Phase 1 manual input)
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('sess');
    if (sid && status === 'scan') {
      handleJoinSession(sid);
    }
  }, []);

  // 7-minute timer to auto-return to home
  useEffect(() => {
    let timeout;
    if (status === 'disconnected_prompt') {
      timeout = setTimeout(() => {
        setStatus('scan');
        setSessionId(null);
      }, 7 * 60 * 1000);
    }
    return () => clearTimeout(timeout);
  }, [status]);

  // Keep-alive for Render backend (Prevents 15m idle shutdown on free tiers)
  useEffect(() => {
    const pingInterval = setInterval(() => {
      fetch(`${SIGNALING_URL}/ping`).catch(() => { });
    }, 5 * 60 * 1000); // 5 minutes

    // Fire an immediate ping on load just to be safe
    fetch(`${SIGNALING_URL}/ping`).catch(() => { });

    return () => clearInterval(pingInterval);
  }, []);

  const handleJoinSession = (sid) => {
    setSessionId(sid);
    setStatus('connecting');
    setErrorMsg('');

    // Save session id to localStorage for fast reconnect
    localStorage.setItem('chameleon_last_session', JSON.stringify({
      id: sid,
      timestamp: Date.now()
    }));
    setLastSessionId(sid);

    // 1. Connect to signaling server with tight heartbeat
    // Default 25 s ping interval means dead connections linger for 25 s.
    // At 5 s we detect drops within one second of the keepalive window.
    const socket = io(SIGNALING_URL, {
      pingInterval: 5000,
      pingTimeout: 10000,
      reconnectionDelayMax: 5000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      socket.emit('client:join_session', { sessionId: sid });
      

    });

    socket.on('client:joined_success', () => {
      console.log('Successfully joined session');
      // Wait for Agent to send SDP Offer
    });

    socket.on('error', (err) => {
      setStatus('error');

      // Calculate Duration
      let durationStr = '';
      if (sessionStartTimeRef.current) {
        const diffMs = Date.now() - sessionStartTimeRef.current;
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        durationStr = ` (Duration: ${mins}m ${secs}s)`;
        setSessionDuration(`Session lasted ${mins}m ${secs}s`);
      }

      setErrorMsg((err.message || 'Unknown error') + durationStr);
      socket.disconnect();
      cleanupWebRTC();
      sessionStartTimeRef.current = null;
    });

    socket.on('session:ended', (data) => {
      if (data.reason === 'Agent disconnected') {
          console.warn('Agent dropped. Attempting aggressive auto-reconnect...');
          setStatus('reconnecting');
          setRemoteStream(null);
          cleanupWebRTC();
          
          let attempts = 0;
          const retryInterval = setInterval(() => {
              if (attempts > 15) { // 30 seconds max
                  clearInterval(retryInterval);
                  setStatus('error');
                  setErrorMsg('Connection lost permanently. Host is offline.');
                  socket.disconnect();
                  sessionStartTimeRef.current = null;
                  return;
              }
              attempts++;
              socket.emit('client:join_session', { sessionId: sid });
          }, 2000);
          
          socket.once('client:joined_success', () => {
              clearInterval(retryInterval);
          });
      } else {
          setStatus('error');
          setRemoteStream(null);
          setErrorMsg(`Connection closed: ${data.reason}`);
          cleanupWebRTC();
          sessionStartTimeRef.current = null;
      }
    });

    // Relay frames: NO React state update.
    // RemoteView handles relay:frame directly via the socket ref + frameWorker.
    // We only need to flip status to 'connected' on the first frame.
    socket.once('relay:frame', () => {
      if (status !== 'connected') setStatus('connected');
    });

    // 2. WebRTC Signaling
    socket.on('signal:sdp', async (data) => {
      try {
        if (!peerRef.current) {
          initWebRTC(socket, sid);
        }

        const peer = peerRef.current;
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        isRemoteDescriptionSet.current = true;

        // Process queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await peer.addIceCandidate(candidate).catch(e => console.error("Queued ICE error:", e));
        }

        if (data.sdp.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('signal:sdp', {
            sessionId: sid,
            sdp: peer.localDescription,
            to: 'agent'
          });
        }
      } catch (err) {
        console.error('WebRTC SDP Error:', err);
      }
    });

    socket.on('signal:ice', async (data) => {
      try {
        if (data.candidate) {
          const candidate = new RTCIceCandidate(data.candidate);
          if (peerRef.current && isRemoteDescriptionSet.current) {
            await peerRef.current.addIceCandidate(candidate);
          } else {
            console.log('Queueing ICE candidate...');
            iceCandidateQueue.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('WebRTC ICE Error:', err);
      }
    });

    return () => {
      socket.disconnect();
      cleanupWebRTC();
    };
  };

  const initWebRTC = (socket, sid) => {
    const ICE_SERVERS = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:443' },
      { urls: 'stun:stun2.l.google.com:443' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ];

    const peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 4,   // Pre-gather candidates before negotiation starts
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    peerRef.current = peer;

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice', { sessionId: sid, candidate: event.candidate, to: 'agent' });
      }
    };

    peer.ontrack = (event) => {
      console.log('[RTC] Received remote video track');
      setRemoteStream(event.streams[0]);
    };

    // ── RECEIVE DUAL DATA CHANNELS FROM AGENT ──
    peer.ondatachannel = (event) => {
      const ch = event.channel;
      console.log('[DC] Received channel:', ch.label);

      if (ch.label === 'mouse') {
        mouseChannelRef.current = ch;
        ch.onopen = () => console.log('[DC] Mouse channel open (client-side)');
        ch.onclose = () => console.log('[DC] Mouse channel closed');
        // Mouse channel receives nothing from agent — it's outbound only from client
      }

      if (ch.label === 'keyboard') {
        keyboardChannelRef.current = ch;
        ch.onopen = () => console.log('[DC] Keyboard channel open (client-side)');
        ch.onclose = () => console.log('[DC] Keyboard channel closed');

        ch.onmessage = async (msgEvent) => {
          try {
            const payload = JSON.parse(msgEvent.data);
            if (payload.type === 'ping') {
              if (ch.readyState === 'open') ch.send(JSON.stringify({ type: 'pong' }));
              return;
            }
            if (payload.type === 'clipboard_pull_response') {
              await navigator.clipboard.writeText(payload.text);
              console.log('[Clipboard] Pulled from host successfully.');
            }
            if (payload.type === 'pause_state') {
              setIsControlPaused(payload.paused);
              console.log('[DC] Control pause state:', payload.paused);
            }
          } catch (e) {
            console.error('[DC] Parse error:', e);
          }
        };
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      console.log('[RTC] Connection state:', state);
      if (state === 'connected') {
        setStatus('connected');
        sessionStartTimeRef.current = Date.now();
        // Initialise GCC-inspired ABR controller for this session
        abrControllerRef.current = new AdaptiveController();
        startAbrLoop(peer, socket);
      } else if (state === 'failed') {
        console.warn('[RTC] Connection failed — attempting ICE restart');
        peer.restartIce();
      } else if (state === 'disconnected') {
        const diffMs = sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0;
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        const dur = diffMs > 0 ? ` (${mins}m ${secs}s)` : '';
        setErrorMsg(`Peer connection lost${dur}`);
        cleanupWebRTC();
        sessionStartTimeRef.current = null;
      }
    };
  };

  // ── GCC-Inspired ABR Loop ────────────────────────────────────────────────
  // Reads WebRTC stats every second, feeds them to AdaptiveController,
  // and applies the resulting quality rung to the encoder via setParameters().
  const startAbrLoop = (peer, socket) => {
    if (abrIntervalRef.current) clearInterval(abrIntervalRef.current);

    abrIntervalRef.current = setInterval(async () => {
      if (!peer || peer.connectionState !== 'connected') return;
      const abr = abrControllerRef.current;
      if (!abr) return;

      try {
        const stats = await peer.getStats();
        let rttSeconds = 0, packetLossRate = 0, availableBitrate = 0;

        stats.forEach(r => {
          if (r.type === 'candidate-pair' && r.state === 'succeeded') {
            rttSeconds      = r.currentRoundTripTime || 0;
            availableBitrate = r.availableOutgoingBitrate || 0;
          }
          if (r.type === 'inbound-rtp' && r.kind === 'video') {
            // packetsLost / packetsReceived gives client-side loss rate
            const total = (r.packetsReceived || 0) + (r.packetsLost || 0);
            packetLossRate = total > 0 ? (r.packetsLost || 0) / total : 0;
          }
        });

        const result = abr.update({ rttSeconds, packetLossRate, availableBitrate });

        if (result.changed) {
          // Signal the agent to update its encoder constraints
          const ch = keyboardChannelRef.current;
          if (ch && ch.readyState === 'open') {
            ch.send(JSON.stringify({
              type: 'update_resolution',
              resolution: result.rung.label,
              maxBitrate: result.rung.maxBitrate
            }));
          }
        }
      } catch (e) { /* ignore stats errors during renegotiation */ }
    }, 1000);
  };

  const cleanupWebRTC = () => {
    if (abrIntervalRef.current) { clearInterval(abrIntervalRef.current); abrIntervalRef.current = null; }
    abrControllerRef.current = null;
    if (mouseChannelRef.current) {
      try { mouseChannelRef.current.close(); } catch(e) {}
      mouseChannelRef.current = null;
    }
    if (keyboardChannelRef.current) {
      try { keyboardChannelRef.current.close(); } catch(e) {}
      keyboardChannelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    isRemoteDescriptionSet.current = false;
    iceCandidateQueue.current = [];
    setRemoteStream(null);
    setIsControlPaused(false);
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    cleanupWebRTC();

    // Calculate Duration for the 7-min prompt screen
    if (sessionStartTimeRef.current) {
      const diffMs = Date.now() - sessionStartTimeRef.current;
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setSessionDuration(`Session lasted ${mins}m ${secs}s`);
    } else {
      setSessionDuration('');
    }

    sessionStartTimeRef.current = null;
    setStatus('disconnected_prompt');
  };

  const sendInputEvent = (eventData) => {
    const type = eventData.type;

    // ── CHANNEL ROUTING ─────────────────────────────────────────────────────
    // Mouse move / wheel → MOUSE channel (unordered, unreliable)
    //   A dropped mouse packet is harmless — the next one corrects position.
    //   This prevents a stale mouse queue from causing cursor lag.
    //
    // Everything else → KEYBOARD channel (ordered, reliable)
    //   Keystrokes, clicks, clipboard — must arrive in order, must not drop.
    // ────────────────────────────────────────────────────────────────────────
    const isMouseMotion = (type === 'mouse_move' || type === 'mouse_wheel');

    if (isMouseMotion) {
      const ch = mouseChannelRef.current;
      if (ch && ch.readyState === 'open') {
        ch.send(JSON.stringify(eventData));
      }
    } else {
      const ch = keyboardChannelRef.current;
      if (ch && ch.readyState === 'open') {
        ch.send(JSON.stringify(eventData));
      }
    }
  };

  const handleScanSuccess = (url) => {
    try {
      const parsedUrl = new URL(url);
      const sid = parsedUrl.searchParams.get('sess');
      if (sid) {
        handleJoinSession(sid);
      } else {
        // Fallback for Phase 1 MVP where we might scan raw session IDs
        handleJoinSession(url);
      }
    } catch (e) {
      // If not a URL, might be raw session ID
      handleJoinSession(url);
    }
  };

  const handleDigitInput = (index, value) => {
    const newManualSessionId = (manualSessionId.substring(0, index) + value + manualSessionId.substring(index + 1)).slice(0, 6);
    setManualSessionId(newManualSessionId);

    if (value && index < 5) {
      document.getElementById(`digit-${index + 1}`).focus();
    } else if (!value && index > 0) {
      document.getElementById(`digit-${index - 1}`).focus();
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#0b0f14] text-[#e5e7eb] font-sans flex flex-col items-center justify-center overflow-hidden">

      {/* Background Grid Layer - Always present unless in remote view */}
      {status !== 'connected' && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen bg-grid-pattern"></div>
      )}

      {/* Cyberpunk Secure Badge */}
      {status !== 'connected' && (
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide backdrop-blur-md">
          <ShieldCheck size={14} /> Secure Connection
        </div>
      )}

      {status === 'scan' && (
        <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
          {/* Subtle top glow line to make the glass pop */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

          <QRScanner onScanSuccess={handleScanSuccess} />

          {/* Manual Connection Option */}
          <div className="mt-8 border-t border-slate-800 pt-8 w-full max-w-xs mx-auto">
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-4 text-center">Or manually connect</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (manualSessionId.trim().length === 6) {
                handleJoinSession(manualSessionId.trim());
              }
            }} className="flex flex-col gap-4">
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <input
                    key={i}
                    id={`digit-${i}`}
                    type="text"
                    maxLength={1}
                    value={manualSessionId[i] || ''}
                    onChange={(e) => handleDigitInput(i, e.target.value)}
                    className="w-10 h-10 md:w-12 md:h-12 text-center bg-[#0B1120] border border-slate-700/50 rounded-lg text-white font-mono text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-800"
                    placeholder="-"
                  />
                ))}
              </div>

              {(manualSessionId.length === 6) && (
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#0b0f14] rounded-xl font-bold tracking-wide shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] transition-all duration-200 transform hover:-translate-y-[1px]"
                >
                  Connect
                </button>
              )}
            </form>
          </div>

          <div className="mt-8 text-center text-[11px] text-cyan-400/50 uppercase tracking-[0.2em] animate-pulse font-mono flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            Waiting for host link...
          </div>

          {errorMsg && (
            <div className="absolute -bottom-16 left-0 right-0 max-w-sm mx-auto bg-red-950/80 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm font-medium text-center backdrop-blur shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-in fade-in slide-in-from-bottom-2">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {status === 'connecting' && (
        <div className="z-10 w-full max-w-md p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-md w-full relative z-10 flex flex-col items-center">

            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className="self-start mb-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Home</span>
            </button>

            {/* Branding Header Area */}
            <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
              {/* Double spinner cyber effect */}
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full border-t-cyan-400 animate-spin" style={{ animationDuration: '1s' }}></div>
              <div className="absolute inset-2 border-2 border-slate-800 rounded-full border-b-cyan-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
              <ShieldCheck className="text-cyan-400" size={24} />
            </div>

            <h2 className="text-2xl font-bold tracking-wide text-white mb-2">Establishing Link...</h2>
            <p className="text-cyan-400 font-mono tracking-widest bg-cyan-950/30 px-4 py-1.5 rounded border border-cyan-500/20">{sessionId}</p>

            <button
              onClick={handleDisconnect}
              className="mt-10 px-8 py-3 bg-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-semibold tracking-wide border border-transparent hover:border-white/10 transition-all duration-200"
            >
              Abort Connection
            </button>
          </div>
        </div>
      )}

      {status === 'disconnected_prompt' && (
        <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center mb-6 border border-slate-700 text-slate-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
            <Power size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-wide mb-2 text-white">Session Terminated</h2>
          <p className="text-slate-400 max-w-sm mb-2 text-sm leading-relaxed">The remote link has been closed. Your session key remains valid for a limited time.</p>
          {sessionDuration && <p className="text-cyan-400 font-mono tracking-widest text-sm mb-8 bg-cyan-950/20 px-3 py-1 rounded inline-block">{sessionDuration}</p>}

          <div className="flex flex-col w-full gap-3">
            {lastSessionId && (
              <button
                onClick={() => handleJoinSession(lastSessionId)}
                className="w-full px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-[#0b0f14] rounded-xl font-bold tracking-wide shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] transition-all duration-200 transform hover:-translate-y-[1px]"
              >
                Reconnect to {lastSessionId}
              </button>
            )}
            <button
              onClick={() => {
                setStatus('scan');
                setSessionId(null);
              }}
              className="w-full px-6 py-4 bg-[#111827] hover:bg-slate-800 text-white rounded-xl font-medium tracking-wide border border-slate-700 transition-all duration-200"
            >
              Start New Session
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-red-950/40 flex items-center justify-center mb-6 border border-red-500/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
            <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
          <h2 className="text-2xl font-bold tracking-wide mb-3 text-white">Connection Failed</h2>
          <p className="text-slate-400 text-sm mb-4 max-w-sm leading-relaxed">{errorMsg}</p>
          {sessionDuration && <p className="text-cyan-400 font-mono tracking-widest text-sm mb-8 bg-cyan-950/20 px-3 py-1 rounded border border-cyan-500/20 inline-block">{sessionDuration}</p>}

          <div className="flex flex-col w-full gap-3">
            {lastSessionId && (
              <button
                onClick={() => handleJoinSession(lastSessionId)}
                className="w-full px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-[#0b0f14] rounded-xl font-bold tracking-wide shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] transition-all duration-200 transform hover:-translate-y-[1px]"
              >
                Retry Link
              </button>
            )}

            <button
              onClick={() => {
                setStatus('scan');
                setErrorMsg('');
              }}
              className="w-full px-6 py-4 bg-[#111827] hover:bg-slate-800 text-white rounded-xl font-medium tracking-wide border border-slate-700 transition-all duration-200"
            >
              System Reset
            </button>
          </div>
        </div>
      )}

      {status === 'reconnecting' && (
        <div className="z-10 bg-[#0B1120]/80 backdrop-blur-md p-10 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
            <Shield className="absolute inset-0 m-auto text-slate-400 animate-pulse" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connection Dropped</h2>
          <p className="text-slate-400 mb-6">The remote host temporarily went offline. Auto-reconnecting in background...</p>
          <button onClick={handleDisconnect} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium">
            Cancel
          </button>
        </div>
      )}

      {status === 'connected' && (
        <div className="z-20 w-full h-full">
          <RemoteView
            stream={remoteStream}
            peerConnection={peerRef.current}
            sendInputEvent={sendInputEvent}
            isControlPaused={isControlPaused}
            socket={socketRef.current}
            sessionId={sessionStartTimeRef.current ? lastSessionId : null}
            onDisconnect={() => {
              if (socketRef.current) socketRef.current.disconnect();
              handleDisconnect();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/connect" element={<ClientApp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/device" element={<DeviceApprove />} />
        <Route path="/my-devices" element={<MyDevices />} />

        {/* New SaaS Routes */}
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/billing" element={<BillingPortalPage />} />
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/billing/failed" element={<BillingFailedPage />} />
      </Routes>
    </Suspense>
  );
}
