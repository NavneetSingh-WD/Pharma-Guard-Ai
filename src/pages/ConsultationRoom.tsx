import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Paperclip, Loader2, FileText, Copy, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    let unsubscribeRoom: () => void;
    let unsubscribeCandidates: () => void;

    const initWebRTC = async () => {
      if (!roomId) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
        };

        const roomRef = doc(db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          console.error("Room does not exist");
          navigate('/telemedicine');
          return;
        }

        const roomData = roomSnap.data();

        // Add user to participants if not already
        if (!roomData.participants?.includes(currentUser?.uid)) {
          await updateDoc(roomRef, {
            participants: arrayUnion(currentUser?.uid)
          });
        }

        if (!roomData.offer) {
          // I am the caller
          const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
          const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

          pc.onicecandidate = event => {
            if (event.candidate) {
              addDoc(callerCandidatesCollection, event.candidate.toJSON());
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await updateDoc(roomRef, {
            offer: { type: offer.type, sdp: offer.sdp }
          });

          unsubscribeRoom = onSnapshot(roomRef, snapshot => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
              const answer = new RTCSessionDescription(data.answer);
              pc.setRemoteDescription(answer);
            }
          });

          unsubscribeCandidates = onSnapshot(calleeCandidatesCollection, snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
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
            if (event.candidate) {
              addDoc(calleeCandidatesCollection, event.candidate.toJSON());
            }
          };

          const offer = roomData.offer;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await updateDoc(roomRef, {
            answer: { type: answer.type, sdp: answer.sdp }
          });

          unsubscribeCandidates = onSnapshot(callerCandidatesCollection, snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          });
        }
      } catch (error) {
        console.error("Error accessing media devices or setting up WebRTC.", error);
      }
    };

    initWebRTC();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
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
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-64 bg-black/50 rounded-2xl overflow-hidden border-2 border-white/20 backdrop-blur-sm shadow-xl z-10">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-white/10 backdrop-blur-xl px-6 py-4 rounded-full border border-white/20 shadow-2xl z-20">
          <button 
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button 
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button 
            onClick={hangUp}
            className="w-16 h-12 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Chat & Document Section */}
      <div className="w-full lg:w-96 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl flex flex-col overflow-hidden h-[50vh] lg:h-auto">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-white/50 backdrop-blur-md">
          <h3 className="font-bold text-slate-800">Chat & Documents</h3>
          <p className="text-xs text-slate-500">Secure end-to-end encrypted channel</p>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-400 mb-1 px-1">{msg.senderName}</span>
                <div className={`max-w-[85%] p-3 rounded-2xl ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                  {msg.fileUrl ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                      <FileText size={16} />
                      <span className="text-sm font-medium truncate">{msg.fileName || 'View Document'}</span>
                    </a>
                  ) : (
                    <p className="text-sm">{msg.text}</p>
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
              className="flex-1 px-4 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-xl outline-none transition-all text-sm"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
