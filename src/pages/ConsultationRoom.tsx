import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Paperclip, Loader2, FileText, Copy, CheckCircle2, Activity, SignalLow, Check, Smile, Clipboard, MessageSquare, Heart, ThumbsUp, Zap, Star, Eraser, PenTool, CheckCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const configuration = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export default function ConsultationRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isRoomReady, setIsRoomReady] = useState(false);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'whiteboard'>('chat');
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [stats, setStats] = useState<{
    jitter: string;
    packetLoss: string;
    latency: string;
    bitrate?: string;
    resolution?: string;
  } | null>(null);

  // Stats Polling Effect
  useEffect(() => {
    let lastBytesReceived = 0;
    let lastTimestamp = 0;

    const interval = setInterval(async () => {
      if (!peerConnection.current || peerConnection.current.connectionState !== 'connected') {
        if (peerConnection.current?.connectionState === 'disconnected' || peerConnection.current?.connectionState === 'failed') {
          setStats(null);
        }
        return;
      }

      try {
        const statsReport = await peerConnection.current.getStats();
        let jitter = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let latency = 0;
        let bytesReceived = 0;
        let timestamp = 0;
        let resolution = '---';

        statsReport.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            jitter = (report.jitter || 0) * 1000; // conversion to ms
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            bytesReceived = report.bytesReceived || 0;
            timestamp = report.timestamp;
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = (report.currentRoundTripTime || 0) * 1000; // conversion to ms
          }
        });

        const totalPackets = packetsReceived + packetsLost;
        const packetLossPercent = totalPackets > 0 
          ? ((packetsLost / totalPackets) * 100).toFixed(1) 
          : '0';

        // Bitrate calculation
        let bitRateStr = '0 kbps';
        if (lastTimestamp > 0 && timestamp > lastTimestamp) {
          const bitRate = (bytesReceived - lastBytesReceived) * 8 / (timestamp - lastTimestamp);
          bitRateStr = bitRate > 1000 ? (bitRate / 1000).toFixed(1) + ' Mbps' : bitRate.toFixed(0) + ' kbps';
        }
        lastBytesReceived = bytesReceived;
        lastTimestamp = timestamp;

        setStats({
          jitter: jitter.toFixed(1) + 'ms',
          packetLoss: packetLossPercent + '%',
          latency: latency > 0 ? latency.toFixed(0) + 'ms' : '--',
          bitrate: bitRateStr,
          resolution
        });
      } catch (e) {
        console.error("Stats error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [remoteStream]);

  // Handle Stream Binding Correctly
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Force play to handle some browser policies
      remoteVideoRef.current.play().catch(e => console.error("Auto-play failed:", e));
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Consolidated Room & Session Synchronization
  useEffect(() => {
    if (!roomId || !currentUser) return;
    let isMounted = true;

    const roomRef = doc(db, 'chatRooms', roomId);
    
    // Initial check and setup
    const setupRoom = async () => {
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        const sessionId = Date.now().toString();
        await setDoc(roomRef, {
          participants: [currentUser.uid],
          createdAt: new Date().toISOString(),
          status: 'active',
          offer: null,
          answer: null,
          currentSessionId: sessionId,
          sessionInitiator: currentUser.uid
        });
      } else {
        const data = roomSnap.data();
        if (data.status === 'ended') {
          const sessionId = Date.now().toString();
          await updateDoc(roomRef, {
            status: 'active',
            offer: null,
            answer: null,
            participants: [currentUser.uid],
            currentSessionId: sessionId,
            sessionInitiator: currentUser.uid
          });
        } else if (!data.participants?.includes(currentUser.uid)) {
          await updateDoc(roomRef, {
            participants: arrayUnion(currentUser.uid)
          });
        }
      }
    };

    setupRoom();

    // Real-time sync for participants and session updates
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!isMounted || !snapshot.exists()) return;
      const data = snapshot.data();
      
      setParticipants(data.participants || []);
      
      if (data.currentSessionId && data.currentSessionId !== currentSessionId) {
        setCurrentSessionId(data.currentSessionId);
        setIsConnecting(true);
        setRemoteStream(null);
        setIsError(null);
        setIsRoomReady(true);
      } else if (data.currentSessionId) {
        setIsRoomReady(true);
      }

      if (data.status === 'ended') {
        hangUp();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomId, currentUser?.uid, currentSessionId]);

  // Main WebRTC Effect
  useEffect(() => {
    if (!currentUser || !roomId || !currentSessionId || !isRoomReady) return;
    let isMounted = true;
    let unsubscribeCandidates: (() => void) | null = null;
    let unsubscribeRoom: (() => void) | null = null;

    const initWebRTC = async () => {
      try {
        console.log("Initializing WebRTC for session:", currentSessionId);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (!isMounted) return;
          console.log("Remote track received:", event.track.kind);
          
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          } else {
            setRemoteStream(prev => {
              const s = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
              if (!s.getTracks().find(t => t.id === event.track.id)) {
                s.addTrack(event.track);
              }
              return s;
            });
          }
          setIsConnecting(false);
        };
        
        pc.onconnectionstatechange = () => {
          if (!isMounted) return;
          console.log("PC Connection State:", pc.connectionState);
          if (pc.connectionState === 'connected') {
            setIsConnecting(false);
            setIsError(null);
          } else if (pc.connectionState === 'failed') {
            console.error("WebRTC Connection failed");
            setIsError("Secure connection failed. This may be due to restricted network environments.");
            setIsConnecting(false);
          }
        };

        const roomRef = doc(db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();
        if (!roomData || !isMounted) return;

        // Use initiator to determine role
        const isCaller = roomData.sessionInitiator === currentUser.uid;
        const sessionRef = doc(roomRef, 'sessions', currentSessionId);
        const callerCandidatesCollection = collection(sessionRef, 'callerCandidates');
        const calleeCandidatesCollection = collection(sessionRef, 'calleeCandidates');

        if (isCaller) {
          pc.onicecandidate = event => {
            if (event.candidate && isMounted) {
              addDoc(callerCandidatesCollection, event.candidate.toJSON());
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await updateDoc(roomRef, {
            offer: { 
              type: offer.type, 
              sdp: offer.sdp, 
              uid: currentUser.uid, 
              sessionId: currentSessionId,
              timestamp: Date.now() 
            },
            answer: null
          });

          unsubscribeRoom = onSnapshot(roomRef, async snapshot => {
            if (!isMounted) return;
            const data = snapshot.data();
            if (data?.currentSessionId !== currentSessionId) return; 
            
            if ((pc.signalingState as string) !== 'closed' && !pc.currentRemoteDescription && data?.answer) {
              if (data.answer.sessionId === currentSessionId) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                while (iceCandidatesQueue.current.length > 0) {
                  const candidate = iceCandidatesQueue.current.shift();
                  if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
                }
              }
            }
          });

          unsubscribeCandidates = onSnapshot(calleeCandidatesCollection, async snapshot => {
            if (!isMounted) return;
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added' && (pc.signalingState as string) !== 'closed') {
                const candidateData = change.doc.data();
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(console.warn);
                } else {
                  iceCandidatesQueue.current.push(candidateData);
                }
              }
            }
          });
        } else {
          pc.onicecandidate = event => {
            if (event.candidate && isMounted) {
              addDoc(calleeCandidatesCollection, event.candidate.toJSON());
            }
          };

          unsubscribeRoom = onSnapshot(roomRef, async snapshot => {
            if (!isMounted) return;
            const data = snapshot.data();
            if (data?.currentSessionId !== currentSessionId) return;

            if (data?.offer && !pc.currentRemoteDescription && (pc.signalingState as string) !== 'closed') {
              if (data.offer.sessionId === currentSessionId) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(roomRef, {
                  answer: { 
                    type: answer.type, 
                    sdp: answer.sdp, 
                    uid: currentUser.uid, 
                    sessionId: currentSessionId,
                    timestamp: Date.now() 
                  }
                });

                while (iceCandidatesQueue.current.length > 0) {
                  const candidate = iceCandidatesQueue.current.shift();
                  if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
                }
              }
            }
          });

          unsubscribeCandidates = onSnapshot(callerCandidatesCollection, async snapshot => {
            if (!isMounted) return;
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added' && (pc.signalingState as string) !== 'closed') {
                const candidateData = change.doc.data();
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(console.warn);
                } else {
                  iceCandidatesQueue.current.push(candidateData);
                }
              }
            }
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error("WebRTC Error:", error);
          setIsError("Hardware Error: " + (error instanceof Error ? error.message : "Access denied"));
        }
      }
    };

    initWebRTC();

    return () => {
      isMounted = false;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeCandidates) unsubscribeCandidates();
    };
  }, [roomId, currentUser?.uid, currentSessionId, isRoomReady, reconnectKey]);

  const restartCall = async () => {
    if (!roomId) return;
    setIsError(null);
    setIsConnecting(true);
    setRemoteStream(null);
    
    // Rotate session ID and set initiator to local user to take charge
    const newSessionId = Date.now().toString();
    const roomRef = doc(db, 'chatRooms', roomId);
    await updateDoc(roomRef, { 
      currentSessionId: newSessionId,
      sessionInitiator: currentUser.uid,
      offer: null,
      answer: null 
    });
    // The listener on currentSessionId will trigger the effect
  };

  useEffect(() => {
    if (!roomId) return;
    const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return unsubscribe;
  }, [roomId]);

  // Reactions Listener
  useEffect(() => {
    if (!roomId) return;
    const reactionsRef = collection(db, 'chatRooms', roomId, 'reactions');
    const unsubscribe = onSnapshot(reactionsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const newReaction = {
            id: change.doc.id,
            emoji: data.emoji,
            x: Math.random() * 80 + 10,
            y: 70 + Math.random() * 20
          };
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
          }, 3000);
        }
      });
    });
    return unsubscribe;
  }, [roomId]);

  const sendReaction = async (emoji: string) => {
    if (!roomId) return;
    await addDoc(collection(db, 'chatRooms', roomId, 'reactions'), {
      emoji,
      senderId: currentUser?.uid,
      createdAt: new Date().toISOString()
    });
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4f46e5');

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveClinicalNotes = async () => {
    if (!roomId || !clinicalNotes.trim()) return;
    setIsSavingNotes(true);
    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      await updateDoc(roomRef, {
        clinicalNotes: clinicalNotes,
        notesLastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const shareCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomId) return;
    
    setIsUploading(true);
    try {
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
      const fileRef = ref(storage, `chat-files/${roomId}/sketch_${Date.now()}.png`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        text: 'Shared a medical sketch',
        fileUrl: url,
        fileName: 'medical_sketch.png',
        senderId: currentUser?.uid,
        senderName: userProfile?.displayName || 'User',
        createdAt: new Date().toISOString()
      });
      setActiveTab('chat');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const hangUp = async () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    if (roomId) {
      const roomRef = doc(db, 'chatRooms', roomId);
      await updateDoc(roomRef, { status: 'ended' });
    }
    navigate('/telemedicine');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      text: newMessage,
      senderId: currentUser?.uid,
      senderName: userProfile?.displayName || 'User',
      createdAt: new Date().toISOString()
    });
    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    setIsUploading(true);
    try {
      const fileRef = ref(storage, `chat-files/${roomId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        text: `Shared a file: ${file.name}`,
        fileUrl: url,
        fileName: file.name,
        senderId: currentUser?.uid,
        senderName: userProfile?.displayName || 'User',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-100 p-2 md:p-4 gap-4 overflow-hidden">
      
      {/* Video Section */}
      <div className="flex-1 bg-slate-950 rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col border border-white/5">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 w-full p-8 bg-gradient-to-b from-slate-950 to-transparent z-30 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-white font-black text-xl flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
              PHARMA-GUARD <span className="text-teal-500 font-extrabold">LIVE</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                 <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                 <span className="text-[10px] text-slate-400 font-mono tracking-wider">SECURE-ID: {roomId?.substring(0, 8)}...</span>
              </div>
              <button 
                onClick={copyRoomId} 
                className="text-white/40 hover:text-white transition-all p-1.5 bg-white/5 hover:bg-white/10 rounded-lg backdrop-blur-md border border-white/10 group"
              >
                {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} className="group-hover:scale-110 transition-transform" />}
              </button>
            </div>
          </div>

          {/* Quality Stats Overlay - Clinical Style */}
          {stats && (
            <div className="hidden md:flex gap-6 items-center bg-slate-900/80 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Latency</span>
                <span className="text-xs font-mono font-bold text-teal-400">{stats.latency}</span>
              </div>
              <div className="w-px h-8 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Jitter</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{stats.jitter}</span>
              </div>
              <div className="w-px h-8 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Loss</span>
                <span className={`text-xs font-mono font-bold ${parseFloat(stats.packetLoss) > 1 ? 'text-rose-400' : 'text-teal-400'}`}>{stats.packetLoss}</span>
              </div>
              <div className="w-px h-8 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Uplink</span>
                <span className="text-xs font-mono font-bold text-amber-400">{stats.bitrate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Remote Video (Main) */}
        <div className="w-full h-full relative group/video bg-slate-900">
          {isError ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950 z-40 p-12 text-center animate-in fade-in">
               <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-rose-500/50">
                 <AlertTriangle size={40} className="text-rose-500" />
               </div>
               <h3 className="text-2xl font-black uppercase mb-3 tracking-tighter">Diagnostic Failure</h3>
               <p className="text-sm text-slate-400 mb-8 max-w-sm font-medium leading-relaxed">{isError}</p>
               <button 
                 onClick={restartCall}
                 className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
               >
                 <Zap size={18} /> Restore Connection
               </button>
             </div>
          ) : participants.length < 2 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 text-center p-12 overflow-hidden bg-slate-950">
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full border-2 border-teal-500/10 border-t-teal-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity size={32} className="text-teal-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">Encounter Pending</h3>
              <p className="text-slate-500 text-sm max-w-xs font-medium leading-relaxed">
                Awaiting connection from patient side. Encryption bridge is ready and secure.
              </p>
              <div className="mt-12 flex gap-3">
                 {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full bg-teal-500/40 animate-bounce`} style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          ) : isConnecting && !remoteStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 text-center p-12 bg-slate-950/40 backdrop-blur-xl">
              <div className="relative mb-8 p-1">
                <Loader2 size={64} className="animate-spin text-indigo-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Synchronizing Stream</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Negotiating ICE Protocals • Peer Handshake</p>
              
              <button 
                onClick={restartCall}
                className="mt-12 text-[10px] font-black uppercase tracking-widest text-white px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
              >
                Reset Handshake
              </button>
            </div>
          ) : null}

          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
          
          {/* Reaction Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ y: '100%', opacity: 0, scale: 0.5 }}
                  animate={{ y: '-20%', opacity: [0, 1, 1, 0], scale: [1, 2, 1.5, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  className="absolute text-5xl drop-shadow-2xl"
                  style={{ left: `${r.x}%` }}
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Reaction Bar - Floating Glass */}
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 z-40 transition-all hover:scale-110 shadow-2xl">
          {['❤️', '👍', '👏', '🔥', '⭐', '😮'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white/20 active:scale-90 transition-all text-2xl"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Local Video (PiP) - High End Style */}
        <div className="absolute bottom-28 right-8 w-40 h-56 md:w-56 md:h-72 bg-slate-800 rounded-3xl overflow-hidden border border-white/20 backdrop-blur-sm shadow-2xl z-30 transition-all group/pip">
          {isVideoOff && (
            <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center text-white/40">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2">
                <VideoOff size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Lens Covered</span>
            </div>
          )}
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {isMuted && (
              <div className="bg-rose-500 p-2 rounded-xl shadow-lg animate-in zoom-in">
                <MicOff size={14} className="text-white" />
              </div>
            )}
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-[8px] font-bold text-white uppercase tracking-widest">Self View</span>
            </div>
          </div>
        </div>

        {/* Controls Console */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 py-3 px-3 bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-2xl z-40 group/console">
          <div className="flex items-center gap-3 pr-4 border-r border-white/10 pl-2">
            <button 
              onClick={toggleMute}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform active:scale-90 ${
                isMuted 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              <span className="text-[7px] font-black uppercase tracking-widest mt-1.5 opacity-50">Mute</span>
            </button>

            <button 
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform active:scale-90 ${
                isVideoOff 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              <span className="text-[7px] font-black uppercase tracking-widest mt-1.5 opacity-50">Video</span>
            </button>
          </div>

          <button 
            onClick={() => setShowEndCallConfirm(true)}
            className="w-32 h-14 rounded-2xl flex flex-col items-center justify-center bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xl shadow-rose-600/20 active:scale-95 group/hangup pr-2"
          >
            <PhoneOff size={22} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest mt-1">End Meeting</span>
          </button>
        </div>
      </div>

      {/* Chat & Document Section */}
      <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden h-[50vh] lg:h-auto">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'chat' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare size={16} /> Chat
          </button>
          {userProfile?.role === 'doctor' && (
            <>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'notes' ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Clipboard size={16} /> Notes
              </button>
              <button 
                onClick={() => setActiveTab('whiteboard')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'whiteboard' ? 'bg-white text-rose-600 border-b-2 border-rose-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <PenTool size={16} /> Canvas
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' && (
            <>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end ml-12' : 'items-start mr-12'} animate-in fade-in slide-in-from-bottom-2 mb-4`}>
                      <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{isMe ? 'You' : msg.senderName}</span>
                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">{time}</span>
                      </div>
                      
                      <div className={`relative group p-4 rounded-2xl shadow-sm transition-all hover:shadow-md ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-slate-100'
                      }`}>
                        {msg.fileUrl ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group/file">
                            <div className={`p-2.5 rounded-xl ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                               <FileText size={18} className={isMe ? 'text-white' : 'text-indigo-600'} />
                            </div>
                            <div className="flex flex-col">
                               <span className="text-xs font-black truncate max-w-[150px]">{msg.fileName || 'Document'}</span>
                               <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-slate-400'}`}>Cloud Encrypted</span>
                            </div>
                          </a>
                        ) : (
                          <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                        )}
                        
                        {isMe && (
                          <div className="absolute -bottom-1 -right-6 flex items-center gap-0.5">
                            <div className="bg-white rounded-full p-0.5 shadow-sm border border-slate-50">
                              <CheckCheck size={10} className="text-indigo-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <label className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl cursor-pointer transition-colors shrink-0">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                  </label>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl outline-none transition-all text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-colors shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                 <div>
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Encounter Notes</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live synchronization with patient file</p>
                 </div>
                 <CheckCircle2 size={20} className="text-teal-500" />
              </div>
              
              <textarea 
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Record clinical observations, vitals, or diagnostic summaries here..."
                className="flex-1 w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-teal-500/10 transition-all text-sm leading-relaxed font-medium resize-none shadow-inner"
              />
              
              <button 
                onClick={saveClinicalNotes}
                disabled={isSavingNotes || !clinicalNotes.trim()}
                className="mt-4 w-full py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
              >
                {isSavingNotes ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Commit to Registry
              </button>
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Interactive Whiteboard</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Draw to explain symptoms/anatomy</p>
                </div>
                <div className="flex gap-1">
                  {['#4f46e5', '#10b981', '#f43f5e', '#000000'].map(c => (
                    <button 
                      key={c} 
                      onClick={() => setColor(c)}
                      className={`w-4 h-4 rounded-full border border-white/20 ${color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden relative touch-none shadow-inner">
                <canvas 
                  ref={canvasRef}
                  width={336} 
                  height={400}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={clearCanvas}
                  className="py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <Eraser size={16} /> Clear
                </button>
                <button 
                  onClick={shareCanvas}
                  disabled={isUploading}
                  className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Share to Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Call Confirmation Modal */}
      <AnimatePresence>
        {showEndCallConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <PhoneOff size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic mb-2">End Consultation?</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">This will disconnect the secure session and close the clinical terminal.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={hangUp}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95"
                >
                  Terminate Session
                </button>
                <button 
                  onClick={() => setShowEndCallConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Return to Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
