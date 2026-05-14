import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Paperclip, Loader2, FileText, Copy, CheckCircle2, Activity, SignalLow, Check, Smile, Clipboard, MessageSquare, Heart, ThumbsUp, Zap, Star, Eraser, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const configuration = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
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

  useEffect(() => {
    let isMounted = true;
    let localStreamRef: MediaStream | null = null;
    let unsubscribeRoom: () => void;
    let unsubscribeCandidates: () => void;

    const initWebRTC = async () => {
      if (!roomId) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (!isMounted) return;
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
        };

        const roomRef = doc(db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          console.error("Room does not exist");
          if (isMounted) navigate('/telemedicine');
          return;
        }

        const roomData = roomSnap.data();

        if (!roomData.participants?.includes(currentUser?.uid)) {
          await updateDoc(roomRef, {
            participants: arrayUnion(currentUser?.uid)
          });
        }

        if (!isMounted || (pc.signalingState as string) === 'closed') return;

        if (!roomData.offer) {
          // I am the caller
          const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
          const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

          pc.onicecandidate = event => {
            if (event.candidate && isMounted) {
              addDoc(callerCandidatesCollection, event.candidate.toJSON());
            }
          };

          const offer = await pc.createOffer();
          if (!isMounted || (pc.signalingState as string) === 'closed') return;
          await pc.setLocalDescription(offer);

          await updateDoc(roomRef, {
            offer: { type: offer.type, sdp: offer.sdp }
          });

          unsubscribeRoom = onSnapshot(roomRef, snapshot => {
            if (!isMounted) return;
            const data = snapshot.data();
            
            // Handle remote disconnection/end
            if (data?.status === 'ended') {
              hangUp();
              return;
            }

            if ((pc.signalingState as string) !== 'closed' && !pc.currentRemoteDescription && data?.answer) {
              const answer = new RTCSessionDescription(data.answer);
              pc.setRemoteDescription(answer);
            }
          });

          unsubscribeCandidates = onSnapshot(calleeCandidatesCollection, snapshot => {
            if (!isMounted) return;
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added' && (pc.signalingState as string) !== 'closed') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          });
        } else {
          // I am the callee
          const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
          const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

          pc.onicecandidate = event => {
            if (event.candidate && isMounted) {
              addDoc(calleeCandidatesCollection, event.candidate.toJSON());
            }
          };

          const offer = roomData.offer;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          if (!isMounted || (pc.signalingState as string) === 'closed') return;
          const answer = await pc.createAnswer();
          if (!isMounted || (pc.signalingState as string) === 'closed') return;
          await pc.setLocalDescription(answer);

          await updateDoc(roomRef, {
            answer: { type: answer.type, sdp: answer.sdp }
          });

          unsubscribeRoom = onSnapshot(roomRef, snapshot => {
            if (!isMounted) return;
            const data = snapshot.data();
            if (data?.status === 'ended') {
              hangUp();
              return;
            }
          });

          unsubscribeCandidates = onSnapshot(callerCandidatesCollection, snapshot => {
            if (!isMounted) return;
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added' && (pc.signalingState as string) !== 'closed') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error accessing media devices or setting up WebRTC.", error);
        }
      }
    };

    initWebRTC();

    return () => {
      isMounted = false;
      localStreamRef?.getTracks().forEach(track => track.stop());
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeCandidates) unsubscribeCandidates();
    };
  }, [roomId]);

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
      <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between items-start">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Live Consultation
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/70 text-sm font-mono bg-black/30 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                ID: {roomId}
              </span>
              <button onClick={copyRoomId} className="text-white/70 hover:text-white transition-colors p-1 bg-black/30 rounded-lg backdrop-blur-md border border-white/10">
                {copied ? <CheckCircle2 size={16} className="text-teal-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Quality Stats Overlay */}
          {stats && (
            <div className="flex gap-4 items-center bg-black/40 backdrop-blur-md px-5 py-2 rounded-[2rem] border border-white/10 shadow-2xl transition-all animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 pr-2 border-r border-white/5">
                 <div className={`w-1.5 h-1.5 rounded-full ${stats.latency !== '--' && parseFloat(stats.latency) < 150 ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)] animate-pulse' : 'bg-amber-400'}`}></div>
                 <Activity size={12} className="text-white/40" />
              </div>
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Ping</span>
                <span className="text-[10px] font-black text-teal-400 tabular-nums">{stats.latency}</span>
              </div>
              <div className="w-px h-6 bg-white/5"></div>
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Loss</span>
                <span className={`text-[10px] font-black tabular-nums ${parseFloat(stats.packetLoss) > 1 ? 'text-rose-400' : 'text-teal-400'}`}>{stats.packetLoss}</span>
              </div>
              <div className="w-px h-6 bg-white/5"></div>
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Data</span>
                <span className="text-[10px] font-black text-amber-400 tabular-nums">{stats.bitrate}</span>
              </div>
              <div className="w-px h-6 bg-white/5"></div>
              <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Res</span>
                <span className="text-[10px] font-black text-indigo-400 tabular-nums">{stats.resolution}</span>
              </div>
            </div>
          )}
        </div>

        {/* Remote Video (Main) */}
        <div className="w-full h-full relative">
          {isConnecting && !remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-0">
              <Loader2 size={48} className="animate-spin mb-4 text-teal-500" />
              <p className="font-medium">Waiting for others to join...</p>
            </div>
          )}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
          
          {/* Reaction Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ y: '100%', opacity: 0, scale: 0.5 }}
                  animate={{ y: '-20%', opacity: [0, 1, 1, 0], scale: [1, 1.5, 1.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, ease: "easeOut" }}
                  className="absolute text-4xl"
                  style={{ left: `${r.x}%` }}
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Reaction Bar */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 z-20 transition-all hover:scale-110 active:scale-95">
          {['❤️', '👍', '👏', '🔥', '⭐', '😮'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-64 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 backdrop-blur-sm shadow-xl z-10 transition-all">
          {isVideoOff && (
            <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center text-white/40">
              <VideoOff size={32} className="mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Video Off</span>
            </div>
          )}
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isMuted && (
            <div className="absolute top-3 left-3 z-20 bg-rose-500/80 p-1.5 rounded-lg backdrop-blur-sm">
              <MicOff size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Enhanced Controls Terminal */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 p-2 bg-slate-950/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-20 group/controls">
          <div className="flex items-center gap-2 px-4 py-2 border-r border-white/10">
            <button 
              onClick={toggleMute}
              className={`group relative w-16 h-16 rounded-[1.25rem] flex flex-col items-center justify-center transition-all duration-500 transform active:scale-90 ${
                isMuted 
                  ? 'bg-rose-500/30 text-rose-500 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/20' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-lg'
              }`}
            >
              <div className="relative">
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                {isMuted && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-rose-500 shadow-sm" />}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 transition-colors ${isMuted ? 'text-rose-500' : 'text-white/60'}`}>
                {isMuted ? 'Muted' : 'Audio ON'}
              </span>
              {isMuted && <span className="absolute inset-0 rounded-[1.25rem] bg-rose-500/5 animate-pulse"></span>}
            </button>

            <button 
              onClick={toggleVideo}
              className={`group relative w-16 h-16 rounded-[1.25rem] flex flex-col items-center justify-center transition-all duration-500 transform active:scale-90 ${
                isVideoOff 
                  ? 'bg-rose-500/30 text-rose-500 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/20' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-lg'
              }`}
            >
              <div className="relative">
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                {isVideoOff && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-rose-500 shadow-sm" />}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 transition-colors ${isVideoOff ? 'text-rose-500' : 'text-white/60'}`}>
                {isVideoOff ? 'Cam OFF' : 'Vision ON'}
              </span>
              {isVideoOff && <span className="absolute inset-0 rounded-[1.25rem] bg-rose-500/5 animate-pulse"></span>}
            </button>
          </div>

          <button 
            onClick={() => setShowEndCallConfirm(true)}
            className="group w-32 h-16 rounded-[1.25rem] flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-2xl shadow-rose-600/30 transition-all duration-300 relative overflow-hidden mr-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            <div className="relative flex flex-col items-center">
              <PhoneOff size={24} className="group-hover:-rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-1">End Call</span>
            </div>
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
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                        <span className="text-[9px] font-bold text-slate-300 tabular-nums">{time}</span>
                      </div>
                      
                      <div className={`relative group max-w-[85%] p-4 rounded-3xl shadow-sm transition-all hover:shadow-md ${
                        isMe 
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-slate-200/50'
                      }`}>
                        {msg.fileUrl ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group/file">
                            <div className={`p-2 rounded-xl ${isMe ? 'bg-white/10' : 'bg-slate-100'}`}>
                              <FileText size={18} className={isMe ? 'text-white' : 'text-indigo-600'} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black truncate max-w-[150px]">{msg.fileName || 'Document'}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-slate-400'}`}>External Link</span>
                            </div>
                          </a>
                        ) : (
                          <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                        )}

                        {isMe && (
                          <div className="absolute -bottom-5 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Protocol Transmitted</span>
                            <Check size={10} className="text-indigo-400" />
                          </div>
                        )}
                        
                        {isMe && !msg.fileUrl && (
                          <div className="absolute bottom-2 right-3">
                             <Check size={12} className="text-white/40" />
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
