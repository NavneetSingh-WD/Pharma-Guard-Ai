import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, User, Plus, X, Search, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  type: string;
  status: string;
  createdAt: any;
}

interface Doctor {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

export default function Appointments() {
  const { currentUser, userProfile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('General Consultation');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Multi-role query: patient sees their IDs, doctor sees theirs
    const field = userProfile?.role === 'doctor' ? 'doctorId' : 'patientId';
    const q = query(
      collection(db, 'appointments'),
      where(field, '==', currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, userProfile?.role]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const fetchDoctors = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
          const snap = await getDocs(q);
          const filtered = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Doctor))
            .filter(d => d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || d.email?.toLowerCase().includes(searchQuery.toLowerCase()));
          setDoctors(filtered);
        } catch (e) {
          console.error("Error fetching doctors:", e);
        }
      };
      fetchDoctors();
    } else {
      setDoctors([]);
    }
  }, [searchQuery]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !date || !time) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: currentUser?.uid,
        patientName: userProfile?.displayName || 'Unknown Patient',
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.displayName,
        date,
        time,
        type,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });
      setIsBooking(false);
      setSelectedDoctor(null);
      setDate('');
      setTime('');
    } catch (e) {
      console.error("Booking error:", e);
      alert("Failed to book appointment. Please verify connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (e) {
      console.error("Error cancelling:", e);
    }
  };

  return (
    <Layout>
      <div className="w-full relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition-colors font-black uppercase text-[10px] tracking-widest">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Clinical Appointments</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 italic">Unified Professional Scheduling & History</p>
          </div>
          
          {!isBooking && (
            <button 
              onClick={() => setIsBooking(true)}
              className="flex items-center gap-2 px-8 py-5 bg-indigo-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 active:scale-95"
            >
              <Plus size={18} /> Request New Session
            </button>
          )}
        </div>

        {isBooking ? (
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="px-10 py-8 bg-slate-950 text-white flex justify-between items-center bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/50 to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">Schedule Request</h2>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Secure Transmission Node</p>
                </div>
              </div>
              <button onClick={() => setIsBooking(false)} className="p-2 hover:bg-white/10 rounded-2xl transition-colors">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleBook} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">01/ Select Medical Professional</label>
                {selectedDoctor ? (
                  <div className="flex items-center justify-between p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white shadow-xl border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl uppercase italic">
                        {selectedDoctor.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg tracking-tight leading-none mb-1">DR. {selectedDoctor.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedDoctor.email}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedDoctor(null)}
                      className="p-3 text-rose-500 hover:bg-white rounded-2xl transition-all shadow-sm"
                    >
                      <X size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={24} />
                    <input 
                      type="text" 
                      placeholder="Search DR. Name or Sector..." 
                      className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-3xl transition-all outline-none font-bold text-slate-800 text-lg shadow-inner"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {doctors.length > 0 && searchQuery.length > 1 && (
                      <div className="absolute top-full mt-3 left-0 w-full bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-20 overflow-hidden ring-4 ring-slate-900/5">
                        {doctors.map(d => (
                          <button 
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDoctor(d)}
                            className="w-full px-8 py-5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-center justify-between group/item transition-colors"
                          >
                            <div className="flex items-center gap-5">
                               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500 border border-slate-200">
                                 {d.displayName?.charAt(0)}
                               </div>
                               <div>
                                 <p className="text-base font-black text-slate-800 tracking-tight uppercase leading-none mb-1">DR. {d.displayName}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.email}</p>
                               </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-200 group-hover/item:text-indigo-500 transform group-hover/item:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">02/ Date Vector</label>
                   <input 
                     type="date" 
                     required
                     className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-3xl transition-all outline-none font-bold text-slate-800 shadow-inner"
                     value={date}
                     onChange={(e) => setDate(e.target.value)}
                   />
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">03/ Temporal Slot</label>
                   <input 
                     type="time" 
                     required
                     className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-3xl transition-all outline-none font-bold text-slate-800 shadow-inner"
                     value={time}
                     onChange={(e) => setTime(e.target.value)}
                   />
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">04/ Consultation Protocol</label>
                 <select 
                   className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-3xl transition-all outline-none font-bold text-slate-800 appearance-none shadow-inner"
                   value={type}
                   onChange={(e) => setType(e.target.value)}
                 >
                   <option value="General Consultation">General Consultation</option>
                   <option value="Specialist Follow-up">Specialist Follow-up</option>
                   <option value="Emergency Evaluation">Emergency Evaluation</option>
                   <option value="Pediatric Assessment">Pediatric Assessment</option>
                 </select>
              </div>

              <div className="bg-indigo-50/50 rounded-[2rem] p-8 border border-indigo-100/50 flex gap-5">
                <AlertCircle className="text-indigo-400 shrink-0" size={28} />
                <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed italic">
                  Transmission request will be evaluated by the clinical team. Notification will trigger upon validation. Ensure all medical documentation is finalized.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={submitting || !selectedDoctor}
                className="w-full bg-slate-950 text-white font-black py-6 rounded-3xl shadow-2xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-3"
              >
                {submitting ? 'Initializing Transmission...' : 'Transmit Request'}
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl">
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic mb-6">Status Terminal</h2>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Slots</span>
                       <span className="text-xl font-black text-indigo-600 italic tracking-tighter">{appointments.filter(a => a.status === 'scheduled').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
                       <span className="text-xl font-black text-slate-400 italic tracking-tighter">{appointments.filter(a => a.status === 'completed').length}</span>
                    </div>
                 </div>
              </div>
              
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute right-[-10%] bottom-[-10%] opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Calendar size={150} />
                 </div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 italic">Next Session In:</p>
                    {appointments.find(a => a.status === 'scheduled') ? (
                      <div>
                        <p className="text-3xl font-black italic tracking-tighter mb-2">{appointments.find(a => a.status === 'scheduled')?.time}</p>
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{appointments.find(a => a.status === 'scheduled')?.date}</p>
                      </div>
                    ) : (
                      <p className="text-xs font-black text-white/40 uppercase tracking-widest italic">Node Inactive</p>
                    )}
                 </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-pulse">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl border border-slate-200"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Syncing Temporal Matrix...</p>
                </div>
              ) : appointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {appointments.map((apt) => (
                    <div key={apt.id} className={`bg-white rounded-[2rem] border-2 p-8 shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden ${apt.status === 'scheduled' ? 'border-indigo-100' : 'border-slate-50 opacity-70'}`}>
                      {apt.status === 'scheduled' && (
                        <div className="absolute top-0 right-0 p-4">
                           <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                           <div className={`p-2.5 rounded-xl ${apt.status === 'scheduled' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              <Calendar size={20} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Session UID</p>
                              <p className="text-[10px] font-mono font-bold text-slate-800">#{apt.id.slice(0, 8)}</p>
                           </div>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${apt.status === 'scheduled' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {apt.status}
                        </span>
                      </div>

                      <div className="space-y-4 mb-8">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                               <User size={12} className="text-slate-300" /> Presiding Professional
                            </p>
                            <p className="text-xl font-black text-slate-800 tracking-tighter uppercase italic group-hover:text-indigo-600 transition-colors">DR. {apt.doctorName}</p>
                         </div>
                         <div className="flex items-center gap-10">
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                  <Clock size={12} className="text-slate-300" /> Slot
                               </p>
                               <p className="text-lg font-black text-slate-700 font-mono italic">{apt.time}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                  <Calendar size={12} className="text-slate-300" /> Date
                               </p>
                               <p className="text-lg font-black text-slate-700 italic">{apt.date}</p>
                            </div>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Protocol Type</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{apt.type}</p>
                         </div>
                      </div>

                      <div className="pt-6 border-t border-slate-50 flex items-center gap-3">
                         {apt.status === 'scheduled' && (
                           <>
                             <Link 
                               to="/telemedicine" 
                               className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all text-center shadow-lg shadow-indigo-100 active:scale-95"
                             >
                               Join Node
                             </Link>
                             <button 
                               onClick={() => cancelAppointment(apt.id)}
                               className="px-4 py-4 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm active:scale-90"
                               title="Cancel Protocol"
                             >
                               <X size={20} />
                             </button>
                           </>
                         )}
                         {apt.status === 'completed' && (
                           <div className="w-full flex items-center justify-center gap-2 text-green-600 bg-green-50/50 py-4 rounded-2xl border border-green-100">
                              <CheckCircle2 size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Protocol Finalized</span>
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-in fade-in zoom-in duration-700">
                   <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8">
                      <Calendar size={40} />
                   </div>
                   <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic mb-3">No Scheduled Events</h2>
                   <p className="text-slate-400 max-w-sm mx-auto text-xs font-bold uppercase tracking-widest italic mb-10 leading-loose">
                      Your clinical timeline is currently empty. Initialize a new session request to connect with a medical professional.
                   </p>
                   <button 
                    onClick={() => setIsBooking(true)}
                    className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-900/20"
                   >
                     <Plus size={18} /> Initialize Session Node
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
