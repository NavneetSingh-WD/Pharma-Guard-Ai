import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User, Activity, AlertTriangle, Pill, ClipboardList, Clock, Heart, Shield, CheckCircle2, ChevronRight, FileText, X, Database, Search, ShieldCheck, Plus, Loader2, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PatientRecord() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEHR, setShowEHR] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteHistoryModalOpen, setIsNoteHistoryModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ category: 'Subjective', content: '' });
  const [newExam, setNewExam] = useState({ testName: '', datePerformed: new Date().toISOString().split('T')[0], resultValue: '', unit: '', status: 'Normal' });
  const [noteSort, setNoteSort] = useState({ field: 'createdAt', order: 'desc' as 'asc' | 'desc' });
  const [savingNote, setSavingNote] = useState(false);
  const [savingExam, setSavingExam] = useState(false);

  useEffect(() => {
    async function fetchPatient() {
      if (!patientId) return;
      try {
        const userRef = doc(db, 'users', patientId);
        const userSnap = await getDoc(userRef);
        
        const patientRef = doc(db, 'patients', patientId);
        const patientSnap = await getDoc(patientRef);

        // Fetch Prescriptions for this patient
        const pq = query(
          collection(db, 'prescriptions'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const pSnap = await getDocs(pq);
        setPrescriptions(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Clinical Notes
        const nq = query(
          collection(db, 'clinicalNotes'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const nSnap = await getDocs(nq);
        setClinicalNotes(nSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Exam Results
        const eq = query(
          collection(db, 'examResults'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const eSnap = await getDocs(eq);
        setExamResults(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Consultations
        const cq = query(
          collection(db, 'consultations'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const cSnap = await getDocs(cq);
        setConsultations(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (userSnap.exists()) {
          setPatient({
            ...userSnap.data(),
            medical: patientSnap.exists() ? patientSnap.data() : {}
          });
        }
      } catch (error) {
        console.error("Error fetching patient record:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatient();
  }, [patientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim() || !userProfile || !patientId) return;

    setSavingNote(true);
    try {
      const noteData = {
        patientId,
        doctorId: userProfile.uid,
        doctorName: userProfile.displayName || 'Doctor',
        category: newNote.category,
        content: newNote.content,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'clinicalNotes'), noteData);
      
      // Refresh notes list locally
      const nq = query(
        collection(db, 'clinicalNotes'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const nSnap = await getDocs(nq);
      setClinicalNotes(nSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setIsNoteModalOpen(false);
      setNewNote({ category: 'Subjective', content: '' });
    } catch (error) {
      console.error("Error adding clinical note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.testName.trim() || !userProfile || !patientId) return;

    setSavingExam(true);
    try {
      const examData = {
        ...newExam,
        patientId,
        doctorId: userProfile.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'examResults'), examData);
      
      const eq = query(
        collection(db, 'examResults'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const eSnap = await getDocs(eq);
      setExamResults(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setIsExamModalOpen(false);
      setNewExam({ testName: '', datePerformed: new Date().toISOString().split('T')[0], resultValue: '', unit: '', status: 'Normal' });
    } catch (error) {
      console.error("Error adding exam result:", error);
    } finally {
      setSavingExam(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-slate-900 rounded-full"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <h1 className="text-2xl font-black text-slate-800 mb-4 tracking-tighter uppercase italic">Protocol Breach: Record Missing</h1>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-xs hover:underline"
        >
          <ArrowLeft size={20} /> Back to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 relative overflow-hidden">
      {/* Abstract Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 font-black text-slate-400 hover:text-indigo-600 transition-all mb-10 uppercase tracking-widest text-xs"
        >
          <div className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl group-hover:-translate-x-1 transition-transform">
            <ArrowLeft size={18} />
          </div>
          Return to Console
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Identity Column (Col 4) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* Main Profile Card */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-[2.5rem] p-10 flex flex-col items-center text-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6">
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                    Live Record
                  </div>
               </div>

               <div className="relative mb-8 mt-4">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity"></div>
                  {patient.photoURL ? (
                    <img src={patient.photoURL} alt="Profile" className="relative w-40 h-40 rounded-[3rem] border-[6px] border-white shadow-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="relative w-40 h-40 rounded-[3rem] bg-indigo-100 text-indigo-600 flex items-center justify-center text-6xl font-black shadow-xl">
                      {patient.displayName?.charAt(0) || 'P'}
                    </div>
                  )}
                  <div className="absolute -bottom-3 -right-3 p-3 bg-teal-500 text-white rounded-2xl shadow-xl border-4 border-white">
                    <Shield size={24} />
                  </div>
               </div>

               <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none mb-2">{patient.displayName || 'UNNAMED_NODE'}</h1>
               <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-10">{patient.email}</p>

               <div className="w-full grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Age Payload</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{patient.medical?.age || '--'}</p>
                  </div>
                  <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{patient.medical?.gender || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 text-left col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight Metrics</p>
                    <p className="text-2xl font-black text-teal-600 tracking-tighter">{patient.medical?.weightKg || '--'} <span className="text-sm">KG</span></p>
                  </div>
               </div>
            </div>

            {/* Safety Protocol Summary */}
            {(patient.medical?.knownAllergies?.length > 0 || (patient.medical?.medicalConditions?.length || 0) > 2) && (
              <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-rose-900/40 relative overflow-hidden group">
                 <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <Shield size={200} />
                 </div>
                 <h3 className="text-xl font-black tracking-tighter italic uppercase mb-6 flex items-center gap-3">
                    <AlertTriangle size={24} className="text-white animate-pulse" />
                    Clinical Safety Alert
                 </h3>
                 <p className="text-xs font-bold text-rose-100 uppercase tracking-widest mb-6 leading-relaxed">
                   High-risk profile detected. Verify all prescriptions against allergy history and existing pathological conditions.
                 </p>
                 <div className="flex flex-col gap-2">
                    {patient.medical?.knownAllergies?.slice(0, 3).map((a: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-300"></div>
                        <span className="font-bold text-[10px] uppercase tracking-widest">{a}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
               <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-1000">
                  <Activity size={200} />
               </div>
               <h3 className="text-xl font-black tracking-tighter italic uppercase mb-6 flex items-center gap-3">
                  <Activity size={24} className="text-teal-400" />
                  Terminal Actions
               </h3>
               <div className="space-y-4">
                  <button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl flex items-center justify-between transition-all group/btn">
                    <span className="font-bold text-xs uppercase tracking-widest group-hover/btn:text-teal-400 transition-colors">Start Consultation</span>
                    <ChevronRight size={18} />
                  </button>
                  <button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl flex items-center justify-between transition-all group/btn">
                    <span className="font-bold text-xs uppercase tracking-widest group-hover/btn:text-indigo-400 transition-colors">Write E-Prescription</span>
                    <ChevronRight size={18} />
                  </button>
               </div>
            </div>

          </div>

          {/* Clinical Data (Col 8) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Bento Grid Tier 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Allergies - HIGH VISIBILITY */}
               <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Immunology</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Known Allergies Protocol</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patient.medical?.knownAllergies?.length > 0 ? (
                      patient.medical.knownAllergies.map((a: string, i: number) => (
                        <div key={i} className="px-4 py-2 bg-rose-50 text-rose-700 text-xs font-black rounded-xl border border-rose-100 uppercase tracking-tight">
                          {a}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 w-full border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                         <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl mb-3">
                           <CheckCircle2 size={24} className="opacity-20" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest">No Alerts Flagged</p>
                      </div>
                    )}
                  </div>
               </div>

               {/* Medications */}
               <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <Pill size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Therapeutics</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Active Drug Stream</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {patient.medical?.currentMedications?.length > 0 ? (
                      patient.medical.currentMedications.map((m: string, i: number) => (
                        <div key={i} className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-white transition-all">
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                          <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{m}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 w-full border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                         <p className="text-[10px] font-black uppercase tracking-widest italic">Zero Active Prescriptions</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Medical History - FULL WIDTH BENTO CARD */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 flex flex-col group hover:shadow-2xl transition-all">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Pathology & Conditions</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Clinical Diagnostic History</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowEHR(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                      <Database size={14} /> View Full EHR
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      {patient.medical?.medicalConditions?.length || 0} Registered Entries
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {patient.medical?.medicalConditions?.length > 0 ? (
                   patient.medical.medicalConditions.map((c: string, i: number) => (
                     <div key={i} className="group/card relative p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover/card:scale-110 transition-transform">
                             <Heart size={20} />
                           </div>
                           <p className="font-black text-slate-800 uppercase tracking-tight">{c}</p>
                        </div>
                     </div>
                   ))
                 ) : (
                    <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic">No Diagnostic Records Transmitted</p>
                    </div>
                 )}
               </div>
            </div>

            {/* Past CONSULTATIONS - NEW SECTION */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 group hover:shadow-2xl transition-all">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <Video size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Consultation History</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Telemedicine Session Archive</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    {consultations.length} Sessions
                  </div>
               </div>

               <div className="space-y-4">
                  {consultations.length > 0 ? (
                    consultations.map((session) => (
                      <div key={session.id} className="p-6 bg-slate-50/80 border border-slate-100 rounded-3xl hover:bg-white hover:border-indigo-200 transition-all group/session">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-600">
                               <Clock size={16} />
                             </div>
                             <div>
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Session #{session.id.slice(0, 8)}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                 {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : (session.createdAt?.toDate ? new Date(session.createdAt.toDate()).toLocaleString() : 'N/A')}
                               </p>
                             </div>
                          </div>
                          <span className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest ${
                            session.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-100">
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Doctor Involved</p>
                              <p className="text-xs font-bold text-slate-700 uppercase">{session.doctorName || 'Medical Professional'}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration Payload</p>
                              <p className="text-xs font-bold text-slate-700">{session.duration || '20-30'} mins</p>
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic">No Consultation History Logged</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Digital Prescription History */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 group hover:shadow-2xl transition-all">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Prescription Archive</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">E-Script Audit Trail</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-100">
                    {prescriptions.length} Records
                  </div>
               </div>

               <div className="space-y-4">
                  {prescriptions.length > 0 ? (
                    prescriptions.map((px) => (
                      <div key={px.id} className="p-6 bg-slate-50/80 border border-slate-100 rounded-3xl hover:bg-white hover:border-violet-200 transition-all group/px">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-violet-600">
                               <Pill size={16} />
                             </div>
                             <div>
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Script #{px.id.slice(0, 8)}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">DR. {px.doctorName}</p>
                             </div>
                          </div>
                          <span className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest ${
                            px.status === 'filled' || px.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {px.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {px.medications?.map((m: any, i: number) => (
                             <div key={i} className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                               {m.name} {m.dosage}
                             </div>
                           ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic">No Digital Prescriptions Transmitted</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Diagnostic Exam Results (Mocked for user request) */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 group hover:shadow-2xl transition-all">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
                      <Database size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Exam Diagnostic Node</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Laboratory & Imaging Payloads</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsExamModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-teal-500 shadow-lg shadow-teal-200 transition-all active:scale-95"
                  >
                    <Plus size={14} /> Log Result
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examResults.length > 0 ? (
                    examResults.map((exam) => (
                      <div key={exam.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:border-teal-200 transition-all group/exam relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                             exam.status === 'Normal' ? 'bg-green-100 text-green-600 border border-green-200' :
                             exam.status === 'Critical' ? 'bg-rose-100 text-rose-600 border border-rose-200 animate-pulse' :
                             'bg-amber-100 text-amber-600 border border-amber-200'
                           }`}>
                             {exam.status}
                           </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{exam.datePerformed}</p>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight mb-4">{exam.testName}</h4>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">{exam.resultValue}</span>
                           <span className="text-xs font-bold text-slate-400 uppercase">{exam.unit}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">No Examination Data Logged</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Structured Clinical Notes (SOAP Archive) */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 group hover:shadow-2xl transition-all">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black tracking-tighter italic uppercase flex items-center gap-3 text-slate-800">
                    <Clock size={24} className="text-slate-400" />
                    Clinical Note Stream
                  </h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsNoteHistoryModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 transition-all active:scale-95"
                    >
                      <ClipboardList size={14} /> View History
                    </button>
                    <button 
                      onClick={() => setIsNoteModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                      <Plus size={14} /> Add SOAP Note
                    </button>
                  </div>
               </div>

               <div className="space-y-6">
                  {clinicalNotes.length > 0 ? (
                    clinicalNotes.map((note) => (
                      <div key={note.id} className="p-6 bg-slate-50/80 border border-slate-100 rounded-3xl hover:bg-white transition-all group/visit border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                             <div className="flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                                  {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString(undefined, { month: 'short' }) : '...'}
                                </p>
                                <p className="text-2xl font-black text-slate-800 leading-none">
                                  {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString(undefined, { day: 'numeric' }) : '--'}
                                </p>
                             </div>
                             <div className="h-10 w-px bg-slate-100 mx-2"></div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    note.category === 'Subjective' ? 'bg-blue-100 text-blue-600' :
                                    note.category === 'Objective' ? 'bg-teal-100 text-teal-600' :
                                    note.category === 'Assessment' ? 'bg-amber-100 text-amber-600' :
                                    'bg-rose-100 text-rose-600'
                                  }`}>
                                    {note.category}
                                  </span>
                                  <p className="font-black text-slate-800 uppercase tracking-tight">Clinical Entry</p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">DR. {note.doctorName}</p>
                             </div>
                          </div>
                        </div>
                        <div className="bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                           <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                             "{note.content}"
                           </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic">No Clinical Notes Recorded</p>
                    </div>
                  )}
               </div>
            </div>

          </div>

        </div>
      </div>

      {/* Full EHR Modal Overlay */}
      <AnimatePresence>
        {showEHR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEHR(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* EHR Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Electronic Health Record (EHR)</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Authority Node</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest italic">{patient.displayName} // CID-{patient.uid.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEHR(false)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              {/* EHR Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
                
                {/* Section: Comprehensive Diagnostic Stream */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">01</div>
                     <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Clinical Diagnostic Matrix</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {patient.medical?.medicalConditions?.length > 0 ? (
                      patient.medical.medicalConditions.map((c: string, i: number) => (
                        <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-white hover:border-indigo-200 transition-all">
                           <div className="flex items-center gap-4 mb-4">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:rotate-6 transition-transform">
                                <Activity size={18} />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identified Condition</span>
                           </div>
                           <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{c}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Status: Persistent // Monitoring Active</p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 py-12 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">No Pathological Records Detected in Stream</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section: Historical Therapeutic Archive */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-black">02</div>
                     <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Prescription History & Timeline</h3>
                  </div>
                  <div className="space-y-4">
                    {prescriptions.length > 0 ? (
                      prescriptions.map((px, i) => (
                        <div key={px.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 hover:bg-white hover:border-teal-200 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="h-10 w-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-teal-600 font-black">
                                {prescriptions.length - i}
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Script Node: {px.id.slice(0, 12)}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Transmitted by DR. {px.doctorName} // {new Date(px.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {px.medications?.map((m: any, j: number) => (
                                <div key={j} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                  {m.name} // {m.dosage}
                                </div>
                              ))}
                           </div>
                           <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              px.status === 'filled' || px.status === 'fulfilled' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                           }`}>
                             {px.status}
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Zero Prescription Payloads Logged</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section: Visit Log & Consultation Metadata */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-black">03</div>
                     <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Consultation Log & Visit Summaries</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clinicalNotes.length > 0 ? (
                      clinicalNotes.map((note) => (
                        <div key={note.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white transition-all">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <p className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Clinical Event: {note.category}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                   {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : 'Processing Node...'}
                                 </p>
                              </div>
                              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Verified</div>
                           </div>
                           <p className="text-xs font-medium text-slate-600 leading-relaxed italic border-l-2 border-indigo-200 pl-4">
                             "{note.content}"
                           </p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">Transmitted by DR. {note.doctorName}</p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-12 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Zero Consultation Payloads Logged</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section: Diagnostic Lab Archive (NEW in EHR) */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-black">04</div>
                     <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Diagnostic Lab Archive</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {examResults.length > 0 ? (
                      examResults.map((exam) => (
                        <div key={exam.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-teal-200 transition-all group/exam relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4">
                              <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                                exam.status === 'Normal' ? 'bg-green-100 text-green-600 border border-green-200' :
                                exam.status === 'Critical' ? 'bg-rose-100 text-rose-600 border border-rose-200 animate-pulse' :
                                'bg-amber-100 text-amber-600 border border-amber-200'
                              }`}>
                                {exam.status}
                              </span>
                           </div>
                           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">{exam.datePerformed}</p>
                           <h4 className="font-black text-slate-800 uppercase tracking-tight mb-4 text-xs leading-tight">{exam.testName}</h4>
                           <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900 tracking-tighter">{exam.resultValue}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{exam.unit}</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-4 p-12 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Zero Examination Payloads Logged</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section: Biometric Benchmarks (Mocked for EHR) */}
                <section>
                   <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
                      <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-1000">
                        <Activity size={300} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-10">
                           <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center font-black">05</div>
                           <h3 className="text-xl font-black tracking-tighter uppercase italic">Biometric Analytics & Benchmarks</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                           <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Blood Type</p>
                              <p className="text-4xl font-black italic tracking-tighter text-teal-400">O+</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Height Node</p>
                              <p className="text-4xl font-black italic tracking-tighter text-indigo-400">178 <span className="text-sm">CM</span></p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Base Heart Rate</p>
                              <p className="text-4xl font-black italic tracking-tighter text-rose-400">72 <span className="text-sm">BPM</span></p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Oxygen Baseline</p>
                              <p className="text-4xl font-black italic tracking-tighter text-teal-400">98%</p>
                           </div>
                        </div>
                      </div>
                   </div>
                </section>
              </div>

              {/* EHR Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-indigo-600" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End-to-End Encrypted Medical Archive Access</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-95">
                  <FileText size={16} /> Export Record (PDF)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clinical Note History Modal */}
      <AnimatePresence>
        {isNoteHistoryModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Clinical Note History</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Trail for {patient.displayName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsNoteHistoryModalOpen(false)}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sorting Controls */}
              <div className="px-10 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Protocol Sort:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setNoteSort({ ...noteSort, field: 'createdAt' })}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${noteSort.field === 'createdAt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Date
                    </button>
                    <button 
                      onClick={() => setNoteSort({ ...noteSort, field: 'category' })}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${noteSort.field === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Category
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setNoteSort({ ...noteSort, order: noteSort.order === 'asc' ? 'desc' : 'asc' })}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 hover:border-indigo-200 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                  >
                    {noteSort.order === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                </div>
              </div>

              {/* Content Grid */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/20">
                <div className="grid grid-cols-1 gap-4">
                  {[...clinicalNotes]
                    .sort((a, b) => {
                      if (noteSort.field === 'createdAt') {
                        const timeA = a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?.seconds || 0;
                        return noteSort.order === 'asc' ? timeA - timeB : timeB - timeA;
                      } else {
                        const catA = a.category || '';
                        const catB = b.category || '';
                        return noteSort.order === 'asc' ? catA.localeCompare(catB) : catB.localeCompare(catA);
                      }
                    })
                    .map((note) => (
                      <div key={note.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center min-w-[50px]">
                                 <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                                   {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString(undefined, { month: 'short' }) : '...'}
                                 </p>
                                 <p className="text-xl font-black text-slate-800 leading-none">
                                   {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString(undefined, { day: 'numeric' }) : '--'}
                                 </p>
                                 <p className="text-[9px] font-bold text-slate-300 mt-0.5">
                                   {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).getFullYear() : ''}
                                 </p>
                              </div>
                              <div className="h-10 w-px bg-slate-100 mx-2"></div>
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                   <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                     note.category === 'Subjective' ? 'bg-blue-100 text-blue-600' :
                                     note.category === 'Objective' ? 'bg-teal-100 text-teal-600' :
                                     note.category === 'Assessment' ? 'bg-amber-100 text-amber-600' :
                                     'bg-rose-100 text-rose-600'
                                   }`}>
                                     {note.category}
                                   </span>
                                   <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Entry ID: {note.id.slice(0, 8)}</p>
                                 </div>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Authenticated by DR. {note.doctorName}</p>
                              </div>
                           </div>
                        </div>
                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                           <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                             "{note.content}"
                           </p>
                        </div>
                      </div>
                    ))}
                  {clinicalNotes.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-white">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Clinical Archive Found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historical clinical events are immutable</p>
                <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase">
                  <Shield size={14} /> HIPAA COMPLIANT ACCESS
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Clinical Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-10 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Structured SOAP Note</h3>
                </div>
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddNote} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documentation Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Subjective', 'Objective', 'Assessment', 'Plan'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewNote({ ...newNote, category: cat })}
                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          newNote.category === cat 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                            : 'bg-slate-50 border-transparent text-slate-500 hover:border-indigo-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Observation Content</label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-3xl text-sm font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                    placeholder="Transcribe findings, patient responses, and clinical paths..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  ></textarea>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={savingNote}
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                  >
                    {savingNote ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    Commit Record to Node
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Exam Result Modal */}
      <AnimatePresence>
        {isExamModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExamModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-10 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg">
                    <Database size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Log Exam Payload</h3>
                </div>
                <button 
                  onClick={() => setIsExamModalOpen(false)}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddExam} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Designation</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500/20 focus:bg-white rounded-2xl text-sm font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                      placeholder="e.g. Hemoglobin A1c"
                      value={newExam.testName}
                      onChange={(e) => setNewExam({ ...newExam, testName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timestamp</label>
                    <input
                      required
                      type="date"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500/20 focus:bg-white rounded-2xl text-sm font-bold shadow-inner outline-none transition-all"
                      value={newExam.datePerformed}
                      onChange={(e) => setNewExam({ ...newExam, datePerformed: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metric Value</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500/20 focus:bg-white rounded-2xl text-sm font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                      placeholder="e.g. 5.7"
                      value={newExam.resultValue}
                      onChange={(e) => setNewExam({ ...newExam, resultValue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Protocol</label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500/20 focus:bg-white rounded-2xl text-sm font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
                      placeholder="e.g. % or mg/dL"
                      value={newExam.unit}
                      onChange={(e) => setNewExam({ ...newExam, unit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnostic Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Normal', 'Critical', 'Pending', 'Requires Review'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setNewExam({ ...newExam, status })}
                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                          newExam.status === status 
                            ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-200' 
                            : 'bg-slate-50 border-transparent text-slate-500 hover:border-teal-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={savingExam}
                    className="w-full py-5 bg-teal-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-teal-900/20 active:scale-95 disabled:opacity-50"
                  >
                    {savingExam ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    Inject Result to Stream
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
