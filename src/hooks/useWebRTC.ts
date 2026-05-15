import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  getDocs,
  query,
  DocumentReference
} from 'firebase/firestore';

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export interface WebRTCStats {
  jitter: string;
  packetLoss: string;
  latency: string;
  bitrate: string;
  resolution: string;
}

export function useWebRTC(roomId: string | undefined, userId: string | undefined, sessionId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [iceState, setIceState] = useState<RTCIceConnectionState>('new');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const isMounted = useRef(true);

  const cleanup = useCallback(async () => {
    console.log('[WebRTC] Cleaning up...');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsConnecting(false);
    setIceState('closed');
  }, [localStream]);

  const startSession = useCallback(async () => {
    if (!roomId || !userId || !sessionId) return;
    
    try {
      setError(null);
      setIsConnecting(true);
      console.log(`[WebRTC] Starting session ${sessionId} for room ${roomId}`);

      // 1. Media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!isMounted.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      setLocalStream(stream);

      // 2. PeerConnection
      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 3. Track handling
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMounted.current) return;
        setIceState(pc.iceConnectionState);
        console.log(`[WebRTC] ICE Connection State: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnecting(false);
        } else if (pc.iceConnectionState === 'failed') {
          setError("Connection failed. This often happens if both users are behind strict firewalls (Symmetric NAT).");
          setIsConnecting(false);
        }
      };

      // 4. Signaling setup
      const roomRef = doc(db, 'chatRooms', roomId);
      const roomSnap = await getDoc(roomRef);
      const roomData = roomSnap.data();
      if (!roomData) throw new Error("Room does not exist");

      const initiatorId = roomData.sessionInitiator || roomData.participants[0];
      const isCaller = initiatorId === userId;
      
      const sessionRef = doc(roomRef, 'sessions', sessionId);
      const signalingRef = collection(sessionRef, 'signaling');
      const callerCandidates = collection(sessionRef, 'callerCandidates');
      const calleeCandidates = collection(sessionRef, 'calleeCandidates');

      if (isCaller) {
        console.log("[WebRTC] I am the CALLER");
        pc.onicecandidate = (event) => {
          if (event.candidate && isMounted.current) {
            addDoc(callerCandidates, event.candidate.toJSON());
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(doc(signalingRef, 'offer'), {
          type: offer.type,
          sdp: offer.sdp,
          timestamp: Date.now()
        });

        // Listen for answer
        const unsubAnswer = onSnapshot(doc(signalingRef, 'answer'), async (snap) => {
          if (snap.exists() && isMounted.current && pc.signalingState !== 'stable') {
            const answer = snap.data();
            await pc.setRemoteDescription(new RTCSessionDescription(answer as RTCSessionDescriptionInit));
            processQueuedCandidates(pc);
          }
        });

        // Listen for callee candidates
        const unsubCandidates = onSnapshot(calleeCandidates, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === 'added' && isMounted.current) {
              const data = change.doc.data();
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data)).catch(console.warn);
              } else {
                iceCandidatesQueue.current.push(data as RTCIceCandidateInit);
              }
            }
          });
        });

        return { unsubAnswer, unsubCandidates };
      } else {
        console.log("[WebRTC] I am the CALLEE");
        pc.onicecandidate = (event) => {
          if (event.candidate && isMounted.current) {
            addDoc(calleeCandidates, event.candidate.toJSON());
          }
        };

        // Listen for offer
        const unsubOffer = onSnapshot(doc(signalingRef, 'offer'), async (snap) => {
          if (snap.exists() && isMounted.current && pc.signalingState === 'stable') {
            const offer = snap.data();
            await pc.setRemoteDescription(new RTCSessionDescription(offer as RTCSessionDescriptionInit));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await setDoc(doc(signalingRef, 'answer'), {
              type: answer.type,
              sdp: answer.sdp,
              timestamp: Date.now()
            });
            
            processQueuedCandidates(pc);
          }
        });

        // Listen for caller candidates
        const unsubCandidates = onSnapshot(callerCandidates, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === 'added' && isMounted.current) {
              const data = change.doc.data();
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data)).catch(console.warn);
              } else {
                iceCandidatesQueue.current.push(data as RTCIceCandidateInit);
              }
            }
          });
        });

        return { unsubOffer, unsubCandidates };
      }
    } catch (err: any) {
      console.error("[WebRTC] Fail:", err);
      setError(err.message || "Hardware or Signaling failure");
      setIsConnecting(false);
      return {};
    }
  }, [roomId, userId, sessionId]);

  const processQueuedCandidates = (pc: RTCPeerConnection) => {
    while (iceCandidatesQueue.current.length > 0) {
      const cand = iceCandidatesQueue.current.shift();
      if (cand) pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    let signUnsubs: { [key: string]: () => void } = {};

    startSession().then(unsubs => {
      if (unsubs) signUnsubs = unsubs;
    });

    return () => {
      isMounted.current = false;
      Object.values(signUnsubs).forEach(u => u());
      cleanup();
    };
  }, [sessionId, roomId, userId, startSession, cleanup]);

  // Stats Polling
  useEffect(() => {
    let lastBytes = 0;
    let lastTime = 0;
    
    const interval = setInterval(async () => {
      if (!pcRef.current || pcRef.current.connectionState !== 'connected') return;
      
      try {
        const statsReport = await pcRef.current.getStats();
        let s: Partial<WebRTCStats> = {};
        
        statsReport.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            s.jitter = ((report.jitter || 0) * 1000).toFixed(1) + 'ms';
            const lost = report.packetsLost || 0;
            const recv = report.packetsReceived || 0;
            s.packetLoss = (recv + lost) > 0 ? ((lost / (recv + lost)) * 100).toFixed(1) + '%' : '0%';
            
            if (lastTime > 0) {
              const bitrate = (report.bytesReceived - lastBytes) * 8 / (report.timestamp - lastTime);
              s.bitrate = bitrate > 1000 ? (bitrate / 1000).toFixed(1) + ' Mbps' : bitrate.toFixed(0) + ' kbps';
            }
            lastBytes = report.bytesReceived;
            lastTime = report.timestamp;
            s.resolution = report.frameWidth && report.frameHeight ? `${report.frameWidth}x${report.frameHeight}` : '---';
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            s.latency = ((report.currentRoundTripTime || 0) * 1000).toFixed(0) + 'ms';
          }
        });
        
        if (s.jitter) setStats(s as WebRTCStats);
      } catch (e) {
        console.warn("Stats error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [remoteStream]);

  return { localStream, remoteStream, isConnecting, error, stats, iceState, restart: startSession };
}
