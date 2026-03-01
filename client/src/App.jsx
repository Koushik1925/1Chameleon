import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import QRScanner from './components/QRScanner';
import RemoteView from './components/RemoteView';

// Use environment variable for production, fallback to local
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3000';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('scan'); // scan -> connecting -> connected -> error
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);

  useEffect(() => {
    // If we have a sessionId parsed from URL or manual entry (Phase 1 manual input)
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('sess');
    if (sid && status === 'scan') {
      handleJoinSession(sid);
    }
  }, []);

  const handleJoinSession = (sid) => {
    setSessionId(sid);
    setStatus('connecting');
    setErrorMsg('');

    // 1. Connect to signaling server
    const socket = io(SIGNALING_URL);
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
      setErrorMsg(err.message || 'Unknown error');
      socket.disconnect();
    });

    socket.on('session:ended', (data) => {
      setStatus('scan');
      setSessionId(null);
      setRemoteStream(null);

      // Calculate Duration
      let durationStr = '';
      if (sessionStartTime) {
        const diffMs = Date.now() - sessionStartTime;
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        durationStr = ` (Duration: ${mins}m ${secs}s)`;
      }

      setErrorMsg(`Session ended: ${data.reason}${durationStr}`);
      cleanupWebRTC();
      setSessionStartTime(null);
    });

    // 2. WebRTC Signaling
    socket.on('signal:sdp', async (data) => {
      try {
        if (!peerRef.current) {
          initWebRTC(socket, sid);
        }

        const peer = peerRef.current;
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));

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
        if (peerRef.current && data.candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
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
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerRef.current = peer;

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice', {
          sessionId: sid,
          candidate: event.candidate,
          to: 'agent'
        });
      }
    };

    peer.ontrack = (event) => {
      console.log('Received remote track', event.streams[0]);
      setRemoteStream(event.streams[0]);
      setStatus('connected');
      setSessionStartTime(Date.now());
    };

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onopen = () => console.log('Data channel opened');
      channel.onclose = () => console.log('Data channel closed');
    };

    peer.onconnectionstatechange = () => {
      console.log('Connection state:', peer.connectionState);
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
        setStatus('error');

        // Calculate Duration
        let durationStr = '';
        if (sessionStartTime) {
          const diffMs = Date.now() - sessionStartTime;
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          durationStr = `after ${mins}m ${secs}s`;
        }

        setErrorMsg(`Peer connection lost ${durationStr}`.trim());
        cleanupWebRTC();
        setSessionStartTime(null);
      }
    };
  };

  const cleanupWebRTC = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    cleanupWebRTC();
    setStatus('scan');
    setSessionId(null);
  };

  const sendInputEvent = (eventData) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(eventData));
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

  return (
    <div className="w-full h-full bg-slate-900 text-white font-sans">
      {status === 'scan' && (
        <div className="flex flex-col items-center justify-center h-full">
          <QRScanner onScanSuccess={handleScanSuccess} />

          {/* Polished OTP Entry Section */}
          <div className="mt-8 flex flex-col items-center">
            <p className="text-sm text-slate-400 mb-3 uppercase tracking-wider font-semibold">Or enter 6-digit code</p>
            <div className="flex gap-2">
              <input
                id="manual-session"
                type="text"
                maxLength={6}
                placeholder="000000"
                className="px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 text-2xl tracking-widest text-center focus:outline-none focus:border-blue-500 w-48 text-white font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = document.getElementById('manual-session').value.trim();
                    if (val && val.length === 6) handleJoinSession(val);
                  }
                }}
              />
              <button
                onClick={() => {
                  const val = document.getElementById('manual-session').value.trim();
                  if (val && val.length === 6) handleJoinSession(val);
                }}
                className="px-6 py-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
              >
                Connect
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center backdrop-blur shadow-xl">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {status === 'connecting' && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-medium animate-pulse">Connecting to Agent...</h2>
          <p className="text-slate-400 mt-2 text-sm">{sessionId}</p>
          <button
            onClick={handleDisconnect}
            className="mt-8 px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm border border-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-6 border-2 border-red-500 text-red-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
          <p className="text-red-300 max-w-md">{errorMsg}</p>
          <button
            onClick={() => {
              setStatus('scan');
              setErrorMsg('');
            }}
            className="mt-8 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-medium shadow-lg shadow-blue-900/20"
          >
            Try Again
          </button>
        </div>
      )}

      {status === 'connected' && (
        <RemoteView
          stream={remoteStream}
          onDisconnect={handleDisconnect}
          sendInputEvent={sendInputEvent}
        />
      )}
    </div>
  );
}

export default App;
