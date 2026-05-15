import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Paperclip, Loader2, FileText, Copy, CheckCircle2, Activity, SignalLow, Check, Smile, Clipboard, MessageSquare, Heart, ThumbsUp, Zap, Star, Eraser, PenTool, CheckCheck, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWebRTC } from '../hooks/useWebRTC';
import ConsultationDiagnostics from '../components/telemedicine/ConsultationDiagnostics';

export default function ConsultationRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isRoomReady, setIsRoomReady] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'whiteboard'>('chat');
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // 1. WebRTC Hook implementation
  const { 
    localStream, 
    remoteStream, 
    isConnecting, 
    error: webrtcError, 
    stats, 
    iceState,
    restart 
  } = useWebRTC(roomId, currentUser?.uid, currentSessionId);

  // 2. Room Synchronization
  useEffect(() => {
    if (!roomId || !currentUser) return;
    const roomRef = doc(db, 'chatRooms', roomId);
    
    const syncRoom = async () => {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        const sid = Date.now().toString();
        await setDoc(roomRef, {
          participants: [currentUser.uid],
          createdAt: new Date().toISOString(),
          status: 'active',
          currentSessionId: sid,
          sessionInitiator: currentUser.uid
        });
      } else {
        const data = snap.data();
        if (data.status === 'ended') {
          const sid = Date.now().toString();
          await updateDoc(roomRef, {
            status: 'active',
            participants: [currentUser.uid],
            currentSessionId: sid,
            sessionInitiator: currentUser.uid
          });
        } else if (!data.participants?.includes(currentUser.uid)) {
          await updateDoc(roomRef, {
            participants: arrayUnion(currentUser.uid)
          });
        }
        
        // Ensure initiator is set if missing
        if (!snap.data()?.sessionInitiator) {
          await updateDoc(roomRef, {
            sessionInitiator: snap.data()?.participants?.[0] || currentUser.uid
          });
        }
      }
    };

    syncRoom();

    const unsub = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setParticipants(data.participants || []);
      
      if (data.currentSessionId && data.currentSessionId !== currentSessionId) {
        setCurrentSessionId(data.currentSessionId);
        setIsRoomReady(true);
      }
      if (data.status === 'ended') {
        navigate('/telemedicine');
      }
    });

    return () => unsub();
  }, [roomId, currentUser?.uid, currentSessionId]);

  // Bind streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Messages syncing
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'chatRooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [roomId]);

  // Reactions
  useEffect(() => {
    if (!roomId) return;
    const reactionsRef = collection(db, 'chatRooms', roomId, 'reactions');
    return onSnapshot(reactionsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const newReaction = {
            id: change.doc.id,
            emoji: data.emoji,
            x: Math.random() * 80 + 10,
            y: 70 + Math.random() * 10
          };
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);
        }
      });
    });
  }, [roomId]);

  const restartConnection = async () => {
    if (!roomId) return;
    const newSid = Date.now().toString();
    const roomRef = doc(db, 'chatRooms', roomId);
    await updateDoc(roomRef, { 
      currentSessionId: newSid,
      sessionInitiator: currentUser?.uid,
      status: 'active'
    });
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const hangUp = async () => {
    if (!roomId) return;
    await updateDoc(doc(db, 'chatRooms', roomId), { status: 'ended' });
    navigate('/telemedicine');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;
    const text = newMessage;
    setNewMessage('');
    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        text,
        senderId: currentUser?.uid,
        senderName: userProfile?.displayName || 'User',
        createdAt: new Date().toISOString(),
        delivered: true
      });
    } catch (err) {
      console.error(err);
    }
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
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#4f46e5');

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="consultation-terminal" className="flex flex-col lg:flex-row h-screen bg-slate-900 p-2 md:p-4 gap-4 overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Video Section */}
      <div id="video-feed-section" className="flex-1 bg-black rounded-[3rem] overflow-hidden relative shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col border border-white/5">
        {/* Header Overlay */}
        <div id="video-header" className="absolute top-0 left-0 w-full p-8 bg-gradient-to-b from-black/80 to-transparent z-30 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-white font-black text-xl flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
              PHARMA-GUARD <span className="text-teal-500 font-extrabold tracking-tighter">LIVE</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                 <ShieldCheck size={10} className="text-teal-400" />
                 <span className="text-[10px] text-slate-400 font-mono tracking-wider italic uppercase">Encrypted E2EE Bridge</span>
              </div>
              <button 
                onClick={copyRoomId}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all"
              >
                {copied ? <CheckCircle2 size={14} className="text-teal-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <AnimatePresence>
            {stats && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden md:flex gap-6 items-center bg-slate-900/60 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Res</span>
                  <span className="text-xs font-mono font-bold text-teal-400">{stats.resolution}</span>
                </div>
                <div className="w-px h-6 bg-white/5"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Bitrate</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{stats.bitrate}</span>
                </div>
                <div className="w-px h-6 bg-white/5"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Loss</span>
                  <span className={`text-xs font-mono font-bold ${parseFloat(stats.packetLoss) > 0 ? 'text-rose-400' : 'text-teal-400'}`}>{stats.packetLoss}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Video Area */}
        <div id="main-video-canvas" className="w-full h-full relative bg-slate-950">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />

          {/* Handshake Logic UI */}
          <AnimatePresence>
            {webrtcError ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 ring-1 ring-rose-500/20">
                  <AlertTriangle size={48} className="text-rose-500" />
                </div>
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Handshake Error</h3>
                <p className="text-slate-400 mb-10 max-w-sm leading-relaxed">{webrtcError}</p>
                <div className="flex gap-4">
                  <button onClick={restartConnection} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-3">
                    <Zap size={18} /> Signal Rotation
                  </button>
                  <button onClick={() => setShowDiagnostics(true)} className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10">
                    Diagnostics
                  </button>
                </div>
              </motion.div>
            ) : participants.length < 2 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-10">
                  <div className="w-32 h-32 rounded-full border-2 border-teal-500/10 border-t-teal-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity size={32} className="text-teal-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3">Encounter Pending</h3>
                <p className="text-slate-500 max-w-xs font-medium">Awaiting connection from clinical side. Encryption bridge initialized.</p>
                <div className="mt-12 flex gap-1 items-center">
                   {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500/40 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </motion.div>
            ) : isConnecting && !remoteStream ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center">
                <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
                <h3 className="text-xl font-black text-white uppercase italic tracking-widest mb-2">Syncing Terminal...</h3>
                <p className="text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-[0.3em]">Negotiation Wave • {iceState}</p>
                <button onClick={() => setShowDiagnostics(true)} className="mt-12 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Troubleshoot Feed</button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Reaction Overlay */}
          <div className="absolute inset-0 pointer-events-none z-40">
            <AnimatePresence>
              {reactions.map(r => (
                <motion.div key={r.id} initial={{ y: '100%', opacity: 0 }} animate={{ y: '-20%', opacity: [0,1,1,0] }} className="absolute text-5xl" style={{ left: `${r.x}%` }}>
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Console Controls */}
        <div id="controls-toolbar" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 py-3 px-3 bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl z-50">
          <div className="flex gap-3 pr-4 border-r border-white/10 pl-1">
            <button onClick={toggleMute} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              <span className="text-[7px] font-black uppercase mt-1 opacity-50">Audio</span>
            </button>
            <button onClick={toggleVideo} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              <span className="text-[7px] font-black uppercase mt-1 opacity-50">Video</span>
            </button>
          </div>
          <button onClick={() => setShowEndCallConfirm(true)} className="px-8 h-14 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-600/20 flex items-center gap-3">
            <PhoneOff size={20} /> End Call
          </button>
        </div>

        {/* PiP Video */}
        <div id="pip-local-video" className="absolute bottom-28 right-8 w-44 h-64 bg-slate-900 rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl z-40 group/pip origin-bottom-right transition-transform hover:scale-105">
          {isVideoOff && (
            <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center">
              <VideoOff size={24} className="text-slate-600 mb-2" />
              <span className="text-[8px] text-slate-500 font-black uppercase">Privacy Active</span>
            </div>
          )}
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {isMuted && <div className="p-1.5 bg-rose-500 rounded-lg shadow-lg"><MicOff size={12} className="text-white" /></div>}
            <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10"><span className="text-[8px] font-black text-white uppercase tracking-widest">Self Feed</span></div>
          </div>
        </div>

        {/* Reactions */}
        <div id="reaction-selection" className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 z-40 shadow-2xl">
          {['❤️', '👍', '👏', '🔥', '⭐'].map(e => (
            <button key={e} onClick={() => {
              addDoc(collection(db, 'chatRooms', roomId!, 'reactions'), { emoji: e, timestamp: Date.now() });
            }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all text-xl">{e}</button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div id="right-sidebar" className="w-full lg:w-96 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col h-[50vh] lg:h-auto overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-100 p-1">
          {['chat', 'notes', 'whiteboard'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((m, idx) => {
                  const isMe = m.senderId === currentUser?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4 animate-in fade-in`}>
                      <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isMe ? 'Doctor (Me)' : m.senderName}</span>
                        <span className="text-[9px] text-slate-300 tabular-nums">{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed shadow-sm transition-all ${
                        isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {m.fileUrl ? (
                          <a href={m.fileUrl} target="_blank" className="flex items-center gap-3">
                            <FileText size={18} />
                            <span className="truncate max-w-[140px]">{m.fileName}</span>
                          </a>
                        ) : m.text}
                      </div>
                      {isMe && <div className="mt-1 flex gap-0.5"><CheckCheck size={10} className="text-indigo-400" /></div>}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <label className="p-3 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"><input type="file" className="hidden" onChange={handleFileUpload} /><Paperclip size={20} /></label>
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type secure message..." className="flex-1 px-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none text-sm font-medium" />
                <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-3 rounded-xl disabled:bg-slate-300 transition-colors"><Send size={18} /></button>
              </form>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6 flex flex-col h-full animate-in slide-in-from-right-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Clinical Encounter Summary</h4>
              <textarea value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} className="flex-1 w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/10 resize-none shadow-inner" placeholder="Record observations..." />
              <button onClick={async () => {
                setIsSavingNotes(true);
                await updateDoc(doc(db, 'chatRooms', roomId!), { clinicalNotes });
                setIsSavingNotes(false);
              }} className="mt-4 w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95">
                {isSavingNotes ? <Loader2 className="animate-spin inline mr-2" /> : <ShieldCheck className="inline mr-2" />} Finalize Records
              </button>
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="p-6 flex flex-col h-full animate-in slide-in-from-right-4">
               <div className="flex items-center justify-between mb-4">
                 <span className="text-xs font-black uppercase tracking-widest text-slate-800">Visual Diagnosis</span>
                 <div className="flex gap-1">
                   {['#4f46e5', '#f43f5e', '#000000'].map(c => (
                     <button key={c} onClick={() => setDrawColor(c)} className={`w-4 h-4 rounded-full border border-white/20 ${drawColor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: c }} />
                   ))}
                 </div>
               </div>
               <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner relative">
                 <canvas ref={canvasRef} width={330} height={400} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} className="w-full h-full cursor-crosshair" />
               </div>
               <div className="grid grid-cols-2 gap-3 mt-4">
                 <button onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0,0,330,400)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Clear</button>
                 <button onClick={async () => {
                   const b = await new Promise<Blob>(r => canvasRef.current?.toBlob(b => r(b!)));
                   const refFile = ref(storage, `chat-files/${roomId}/sketch_${Date.now()}.png`);
                   await uploadBytes(refFile, b);
                   const u = await getDownloadURL(refFile);
                   await addDoc(collection(db, 'chatRooms', roomId!, 'messages'), { text: 'Shared a medical sketch', fileUrl: u, fileName: 'sketch.png', senderId: currentUser?.uid, senderName: userProfile?.displayName, createdAt: new Date().toISOString() });
                   setActiveTab('chat');
                 }} className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Cloud Upload</button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Modal */}
      <AnimatePresence>
        {showDiagnostics && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className="relative animate-in zoom-in duration-300">
              <ConsultationDiagnostics />
              <button id="close-diagnostics" onClick={() => setShowDiagnostics(false)} className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"><X size={20} /></button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* End Call Modal */}
      <AnimatePresence>
        {showEndCallConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
             <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><PhoneOff size={40} /></div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">Close Terminal?</h3>
                <p className="text-slate-500 mb-10 text-sm font-medium">This will finalize encounter state and disconnect the clinical feed.</p>
                <div className="flex flex-col gap-4">
                  <button onClick={hangUp} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-200 active:scale-95 transition-all">Submit & Close</button>
                  <button onClick={() => setShowEndCallConfirm(false)} className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all">Return to Feed</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
