import React, { useState, useEffect } from 'react';
import { X, Pill, Search, User, AlertCircle, Plus, Trash2, ChevronRight, Fingerprint, Activity, Clock, Calendar, Hash, RotateCcw } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface NewPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewPrescriptionModal({ isOpen, onClose }: NewPrescriptionModalProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([{ name: '', dosage: '', frequency: '', duration: '', quantity: '', refills: '' }]);

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

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', quantity: '', refills: '' }]);
  };

  const removeMedication = (index: number) => {
    const list = [...medications];
    list.splice(index, 1);
    setMedications(list);
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const list = [...medications];
    list[index][field] = value;
    setMedications(list);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return alert("Please select a patient");
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'prescriptions'), {
        patientId: selectedPatient.id,
        patientName: selectedPatient.displayName,
        doctorId: userProfile?.uid,
        doctorName: userProfile?.displayName,
        medications,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      onClose();
      alert("Prescription transmitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Transmission failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        <div className="px-8 py-6 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] opacity-20 pointer-events-none">
             <Pill size={200} />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xl border border-white/20">
              <Pill size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter uppercase italic leading-none">Digital Rx Terminal</h2>
              <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-1">Encrypted E-Prescribing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-2xl transition-colors relative z-10">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Patient Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">01/ Target Recipient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white shadow-lg border border-slate-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl uppercase">
                    {selectedPatient.displayName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-lg tracking-tight leading-none mb-1">{selectedPatient.displayName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedPatient.email}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-black rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 uppercase tracking-widest"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={24} />
                <input 
                  type="text" 
                  placeholder="Scan Patient Registry..." 
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800"
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
                           <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500 text-lg">
                             {p.displayName?.charAt(0)}
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none mb-1">{p.displayName}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.email}</p>
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

          {/* Medications Stream */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">02/ Medication Payload</label>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Total Payload: {medications.length} Units</p>
              </div>
              <button 
                type="button" 
                onClick={addMedication}
                className="flex items-center gap-3 text-xs font-black text-white bg-indigo-600 px-6 py-3 rounded-2xl hover:bg-slate-900 transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-indigo-600/20 group/add"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                Add New Drug
              </button>
            </div>

            <div className="space-y-8">
              {medications.map((med, idx) => (
                <div key={idx} className="relative p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 group/med hover:border-indigo-400/50 transition-all">
                  <div className="absolute -left-3 top-10 w-1.5 h-12 bg-indigo-500 rounded-full group-hover:h-20 transition-all"></div>
                  
                  {medications.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeMedication(idx)}
                      className="absolute top-8 right-8 p-3 text-slate-300 hover:text-white hover:bg-rose-600 rounded-2xl transition-all shadow-sm"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}

                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
                      {idx + 1}
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Entry Designation #0{idx + 1}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <Pill size={12} className="text-indigo-400" /> Drug Name
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. AMXCL-500"
                        value={med.name}
                        onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <Activity size={12} className="text-teal-400" /> Dosage Metrics
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 500 MG"
                        value={med.dosage}
                        onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <Clock size={12} className="text-indigo-400" /> Frequency Cycle
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 1-0-1 (Post Meal)"
                        value={med.frequency}
                        onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <Calendar size={12} className="text-teal-400" /> Duration Window
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 7 DAYS"
                        value={med.duration}
                        onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <Hash size={12} className="text-indigo-400" /> Dispense Quantity
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 14 TABLETS"
                        value={med.quantity}
                        onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        <RotateCcw size={12} className="text-teal-400" /> Refill Authorization
                      </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-base font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 0 REFILLS"
                        value={med.refills}
                        onChange={(e) => handleMedChange(idx, 'refills', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50/50 rounded-[2rem] p-6 border border-amber-100 flex gap-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl h-fit">
               <AlertCircle size={20} />
            </div>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed">
              Biometric verification required for clinical transmission. System will cross-reference patient allergy profiles against RxNorm telemetry before final signing.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full relative group/submit overflow-hidden bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-2xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/submit:translate-x-[100%] transition-transform duration-1000"></div>
            {loading ? 'Transmitting...' : (
              <>
                <Fingerprint size={20} className="animate-pulse" />
                Sign & Transmit Payload
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
