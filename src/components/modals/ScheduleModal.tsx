import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Consultation');

  useEffect(() => {
    if (searchQuery.length > 2) {
      const searchPatients = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'patient'));
          const snap = await getDocs(q);
          const filtered = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((p: any) => p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.email?.toLowerCase().includes(searchQuery.toLowerCase()));
          setPatients(filtered);
        } catch (e) {
          console.error(e);
        }
      };
      searchPatients();
    }
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return alert("Please select a patient");
    if (!date || !time) return alert("Please select date and time");
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: selectedPatient.id,
        patientName: selectedPatient.displayName,
        doctorId: userProfile?.uid,
        doctorName: userProfile?.displayName,
        date,
        time,
        type,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });
      onClose();
      alert("Appointment scheduled successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to schedule appointment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] opacity-10 pointer-events-none">
             <Calendar size={150} />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Calendar size={20} />
            </div>
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Schedule Session</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-colors relative z-10">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Patient Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">01/ Target Patient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white shadow-md border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg uppercase">
                    {selectedPatient.displayName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 tracking-tight leading-none mb-1">{selectedPatient.displayName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedPatient.email}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 text-indigo-600 hover:bg-white rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Scan Patient Registry..." 
                  className="w-full pl-14 pr-4 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {patients.length > 0 && searchQuery.length > 2 && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-100 rounded-3xl shadow-2xl z-20 overflow-hidden ring-4 ring-slate-900/5">
                    {patients.map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full px-6 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-center justify-between group/item"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">
                             {p.displayName?.charAt(0)}
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none mb-1">{p.displayName}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.email}</p>
                           </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-200 group-hover/item:text-indigo-500 transform group-hover/item:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Temporal Selection */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">02/ Date Vector</label>
               <input 
                 type="date" 
                 required
                 className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
               />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">03/ Time Slot</label>
               <input 
                 type="time" 
                 required
                 className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800"
                 value={time}
                 onChange={(e) => setTime(e.target.value)}
               />
            </div>
          </div>

          {/* Consultation Type */}
          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">04/ Session Classification</label>
             <select 
               className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800 appearance-none"
               value={type}
               onChange={(e) => setType(e.target.value)}
             >
               <option value="Consultation">General Consultation</option>
               <option value="Follow-up">Clinical Follow-up</option>
               <option value="Emergency">Emergency Evaluation</option>
               <option value="Surgery-Review">Surgery Review</option>
             </select>
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex gap-4">
            <AlertCircle className="text-slate-400 shrink-0" size={24} />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              Confirming this slot will reserve the terminal and notify the patient via persistent alerts. Ensure protocol alignment before transmission.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 uppercase tracking-[0.25em] text-xs"
          >
            {loading ? 'Initializing...' : 'Transmit Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
}
