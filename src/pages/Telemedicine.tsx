import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Video, Users, ArrowRight, Stethoscope, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Telemedicine() {
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const roomRef = doc(collection(db, 'chatRooms'));
      await setDoc(roomRef, {
        participants: [currentUser?.uid],
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      navigate(`/consultation/${roomRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      navigate(`/consultation/${joinId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-300/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-600/20 mx-auto mb-6">
            <Video size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">Virtual Consultations</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Secure, HIPAA-compliant 1-on-1 video calling and document sharing for remote medical assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-8 flex flex-col items-center text-center hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
              <Stethoscope size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Start a New Consult</h2>
            <p className="text-slate-500 mb-8">
              Create a secure room and get a unique ID to share with your doctor or patient.
            </p>
            <button 
              onClick={createRoom}
              disabled={isCreating}
              className="mt-auto w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isCreating ? 'Creating Room...' : 'Create Room'} <ArrowRight size={20} />
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-8 flex flex-col items-center text-center hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Join a Consult</h2>
            <p className="text-slate-500 mb-8">
              Enter the unique Room ID provided by your healthcare professional to join the call.
            </p>
            <form onSubmit={joinRoom} className="w-full mt-auto flex flex-col gap-4">
              <input 
                type="text" 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Enter Room ID" 
                required
                className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-center font-mono text-lg"
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Join Room <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
