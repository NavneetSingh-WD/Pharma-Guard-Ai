import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, query, where, getDocs, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Video, Users, ArrowRight, Stethoscope, ArrowLeft, Calendar, Clock, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Telemedicine() {
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Fetch appointments for today or upcoming where the user is a participant
    const q = query(
      collection(db, 'appointments'),
      where(userProfile?.role === 'doctor' ? 'doctorId' : 'patientId', '==', currentUser.uid),
      orderBy('date', 'asc'),
      orderBy('time', 'asc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingApts(false);
    }, (error) => {
      console.error("Error fetching appointments for telemedicine:", error);
      setLoadingApts(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, userProfile?.role]);

  const [activeSOS, setActiveSOS] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'emergency_calls'),
      where('patientId', '==', currentUser.uid),
      where('status', '==', 'active'),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSOS({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveSOS(null);
      }
    });
  }, [currentUser?.uid]);

  const cancelSOS = async () => {
    if (!activeSOS) return;
    try {
      await updateDoc(doc(db, 'emergency_calls', activeSOS.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error cancelling SOS:", error);
    }
  };

  const triggerSOS = async () => {
    if (!currentUser || activeSOS) return;
    setIsSOSLoading(true);
    try {
      const sosId = `emergency-${currentUser.uid}-${Date.now()}`;
      
      // Create emergency call record
      await addDoc(collection(db, 'emergency_calls'), {
        patientId: currentUser.uid,
        patientName: userProfile?.displayName || 'Patient',
        status: 'active',
        roomId: sosId,
        createdAt: serverTimestamp(),
      });

      // Create room
      const roomRef = doc(db, 'chatRooms', sosId);
      await setDoc(roomRef, {
        participants: [currentUser.uid],
        createdAt: new Date().toISOString(),
        status: 'emergency',
        type: 'SOS'
      });

      // navigate(`/consultation/${sosId}`); // Wait for doctor to join or just go in
    } catch (error) {
      console.error("SOS Trigger Error:", error);
    } finally {
      setIsSOSLoading(false);
    }
  };

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

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <Layout>
      <div className="w-full relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* SOS Banner */}
        <div className={`mb-12 rounded-[2.5rem] p-8 text-white shadow-2xl transition-all duration-500 relative overflow-hidden group ${activeSOS ? 'bg-slate-900 border-4 border-rose-600 shadow-rose-600/20' : 'bg-rose-600 shadow-rose-500/20'}`}>
          <div className="absolute right-[-5%] top-[-50%] opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
             <AlertTriangle size={300} strokeWidth={1} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Zap size={12} fill="white" className={activeSOS ? 'animate-pulse' : ''} /> 
                {activeSOS ? 'Signal Transmitting...' : 'Priority Access'}
              </div>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
                {activeSOS ? 'Broadcasting Identity' : 'Emergency SOS Console'}
              </h2>
              <p className="text-rose-100 text-lg font-medium max-w-xl">
                {activeSOS 
                  ? 'Your identity and GPS coordinates are being broadcasted to all available specialists. Please remain in the terminal.' 
                  : 'Require immediate clinical intervention? Trigger an SOS signal to alert all available specialists on the network.'}
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto">
              {activeSOS ? (
                <>
                  <button 
                    onClick={() => navigate(`/consultation/${activeSOS.roomId}`)}
                    className="bg-rose-600 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Video size={24} fill="white" /> Enter Emergency Room
                  </button>
                  <button 
                    onClick={cancelSOS}
                    className="bg-white/10 hover:bg-white/20 text-white px-12 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/20 transition-all"
                  >
                    Withdraw SOS Signal
                  </button>
                </>
              ) : (
                <button 
                  onClick={triggerSOS}
                  disabled={isSOSLoading}
                  className="bg-white text-rose-600 px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shrink-0"
                >
                  {isSOSLoading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <><AlertTriangle size={24} fill="currentColor" /> INITIATE SOS CALL</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-600/20 mx-auto mb-6">
            <Video size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">Telemedicine Terminal</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Secure, HIPAA-compliant 1-on-1 video calling and document sharing for remote medical assistance.
          </p>
        </div>

        {/* Active/Upcoming Sessions Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 italic">
              <Calendar className="text-indigo-600" size={24} /> 
              Your Scheduled Sessions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingApts ? (
              <div className="col-span-full flex justify-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="animate-spin h-8 w-8 border-t-2 border-indigo-600 rounded-full"></div>
              </div>
            ) : appointments.length > 0 ? (
              appointments.map((apt) => {
                const today = isToday(apt.date);
                return (
                  <div key={apt.id} className={`p-6 bg-white border rounded-[2rem] shadow-lg transition-all group hover:scale-[1.02] ${today ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-100 opacity-80'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${today ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {today ? 'Active Slot Today' : apt.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={today ? 'text-indigo-500' : 'text-slate-400'} />
                          <span className="text-xl font-black text-slate-800 font-mono tracking-tighter">{apt.time}</span>
                        </div>
                      </div>
                      <div className={`p-2 rounded-xl ${today ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                        <Video size={20} />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {userProfile?.role === 'doctor' ? 'Patient Identity' : 'Clinical Specialist'}
                      </p>
                      <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter truncate">
                        {userProfile?.role === 'doctor' ? apt.patientName : `Dr. ${apt.doctorName}`}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{apt.type}</p>
                    </div>

                    <button 
                      onClick={() => navigate(`/consultation/${apt.id}`)}
                      className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        today ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {today ? 'Join Consultation' : 'Pre-Enter Room'} <ArrowRight size={16} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active sequences in schedule</p>
                <Link to="/appointments" className="mt-4 inline-block text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Request New Session</Link>
              </div>
            )}
          </div>
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
    </Layout>
  );
}
