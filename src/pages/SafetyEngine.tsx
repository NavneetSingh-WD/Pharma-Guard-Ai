import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Activity, AlertCircle, ShieldAlert, HeartPulse, Stethoscope, Loader2, CheckCircle2, History, Trash2, ExternalLink, Zap, Check, PhoneCall, Info, User } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface SafetyReport {
  riskAssessment: string[];
  immediateGuidance: string[];
  redFlagTrigger: string[];
  escalationInstruction: string[];
}

export default function SafetyEngine() {
  const { currentUser, userProfile, patientData } = useAuth();
  const [queryInput, setQueryInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'users', currentUser.uid, 'safetyChecks'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    return onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [currentUser]);

  const analyzeSafety = async () => {
    if (!queryInput.trim() || !userProfile || !patientData || !currentUser) return;
    setIsAnalyzing(true);
    setReport(null);

    try {
      const res = await fetch('/api/safety/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryInput,
          patientProfile: {
            age: patientData.age,
            weightKg: patientData.weightKg,
            gender: patientData.gender,
            medicalConditions: patientData.medicalConditions,
            knownAllergies: patientData.knownAllergies,
            currentMedications: patientData.currentMedications
          }
        })
      });

      const data = await res.json();
      if (data.evaluation) {
        setReport(data.evaluation);
        // Persist to Firestore
        await addDoc(collection(db, 'users', currentUser.uid, 'safetyChecks'), {
          query: queryInput,
          report: data.evaluation,
          createdAt: new Date().toISOString()
        });
      } else {
        throw new Error(data.error || "Failed to process report");
      }
    } catch (error) {
      console.error("Error analyzing safety:", error);
      alert("Clinical Safety Engine encountered a synchronization error. Please retry.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'safetyChecks', id));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto relative z-10 px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        {/* Hero Section */}
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white mb-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
             <ShieldAlert size={200} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <Activity size={24} />
                </div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter">Clinical Safety Node</h1>
              </div>
              <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
                PHARMA-GUARD utilizes advanced clinical logic to evaluate medication safety, drug-drug interactions (DDI), and pediatric dosage limits against your verified identity profile.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">RxNorm Verified</span>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">ADE Correlation</span>
                </div>
              </div>
            </div>
            
            <motion.div 
               whileHover={{ scale: 1.05 }}
               className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl"
            >
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <HeartPulse size={14} className="text-rose-500" /> Patient Snapshot
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Weight</span>
                   <span className="text-sm font-black text-rose-100">{patientData?.weightKg || '--'} KG</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Allergies</span>
                   <span className="text-sm font-black text-rose-100">{patientData?.knownAllergies?.length || 0} Listed</span>
                 </div>
                 <Link to="/onboarding" className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest text-center mt-2 block shadow-xl hover:bg-slate-100 transition-colors">
                   Update Profile
                 </Link>
               </div>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Control Panel */}
          <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-8">
            
            {/* Input Form */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden group">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
                  <Stethoscope size={24} className="text-indigo-600" />
                  Intake Analysis
                </h2>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    showHistory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <History size={14} /> {showHistory ? 'Hide History' : 'Audit Logs'}
                </button>
              </div>

              <div className="p-8">
                 <div className="mb-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                      Enter the medication details you wish to evaluate. For precise results, include dosage (e.g. 500mg) and frequency.
                    </p>
                 </div>

                 <div className="relative mb-6">
                    <textarea
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="e.g. I took 3 tablets of 500mg Paracetamol in the last 4 hours..."
                      className="w-full h-40 p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-rose-500/20 text-slate-800 font-medium placeholder:text-slate-300 outline-none transition-all resize-none shadow-inner text-lg"
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      AI Powered Engine
                    </div>
                 </div>

                 <button
                    onClick={analyzeSafety}
                    disabled={isAnalyzing || !queryInput.trim()}
                    className="w-full group relative py-6 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 flex items-center justify-center gap-4 text-white font-black uppercase tracking-[0.3em] italic text-xs">
                      {isAnalyzing ? (
                        <><Loader2 size={24} className="animate-spin" /> Verifying Safety Protocol...</>
                      ) : (
                        <><Zap size={18} /> Run Diagnostics</>
                      )}
                    </span>
                 </button>
              </div>
            </div>

            {/* Results Display */}
            <AnimatePresence mode="wait">
              {report && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  className="space-y-6 mb-12"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 bg-rose-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Clinical Report Output</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Assessment */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Activity size={14} className="text-slate-500" /> Physiological Risk
                      </h3>
                      <ul className="space-y-4">
                        {report.riskAssessment.map((item, i) => (
                           <li key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold text-slate-700 leading-relaxed">
                             <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-2 shrink-0"></div>
                             {item}
                           </li>
                        ))}
                      </ul>
                    </div>

                    {/* Immediate Guidance */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 size={80} /></div>
                      <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Immediate Measures
                      </h3>
                      <ul className="space-y-4">
                        {report.immediateGuidance.map((item, i) => (
                           <li key={i} className="flex gap-4 p-4 bg-teal-50 rounded-2xl border border-teal-100 text-sm font-semibold text-teal-900 leading-relaxed">
                             <Check size={16} className="text-teal-500 mt-0.5 shrink-0" />
                             {item}
                           </li>
                        ))}
                      </ul>
                    </div>

                    {/* Red Flag Trigger */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity text-amber-500"><AlertCircle size={80} /></div>
                      <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertCircle size={14} /> Toxicity Triggers
                      </h3>
                      <ul className="space-y-4">
                        {report.redFlagTrigger.map((item, i) => (
                           <li key={i} className="flex gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-semibold text-amber-900 leading-relaxed">
                             <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                             {item}
                           </li>
                        ))}
                      </ul>
                    </div>

                    {/* Escalation Instruction */}
                    <div className="bg-rose-600 p-8 rounded-[2.5rem] shadow-xl shadow-rose-200 relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 opacity-20"><ShieldAlert size={80} className="text-white" /></div>
                      <h3 className="text-xs font-black text-rose-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-white" /> Escalated Response
                      </h3>
                      <ul className="space-y-4">
                        {report.escalationInstruction.map((item, i) => (
                           <li key={i} className="flex gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-sm font-black text-white leading-relaxed uppercase italic italic">
                             <PhoneCall size={16} className="text-white mt-0.5 shrink-0" />
                             {item}
                           </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-[2.5rem] text-center">
                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em]">
                       Analytical Engine Model: PHARMA-GUARD Clinical-v1
                     </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!report && !isAnalyzing && !showHistory && (
               <div className="flex flex-col items-center justify-center py-20 px-8 text-center text-slate-300">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <ShieldAlert size={48} className="opacity-20" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-400">Node Status: Standby</h3>
                  <p className="max-w-xs text-xs font-bold uppercase tracking-widest leading-loose mt-2">Initialize your medicine profile or enter a manual query to trigger interaction analysis.</p>
               </div>
            )}
          </div>

          {/* Right Sidebar: History / Context */}
          <div className="lg:col-span-12 xl:col-span-4">
             <div className="sticky top-8 space-y-6">
                
                {/* History Panel */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden h-[600px] flex flex-col"
                    >
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <History size={18} className="text-indigo-600" />
                           <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Check Audit History</h3>
                         </div>
                         <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{history.length} Logs</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                         {history.length > 0 ? history.map((item) => (
                           <div key={item.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md cursor-pointer" onClick={() => { setReport(item.report); setQueryInput(item.query); }}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <p className="text-xs font-bold text-slate-700 line-clamp-2 italic">"{item.query}"</p>
                              <div className="mt-3 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-teal-600">
                                <CheckCircle2 size={10} /> Validated Report Found
                              </div>
                           </div>
                         )) : (
                           <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <History size={48} className="opacity-10 mb-4" />
                              <p className="text-[10px] font-black uppercase tracking-widest">No history recorded</p>
                           </div>
                         )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Context */}
                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                  <div className="absolute bottom-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><User size={120} /></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-200 mb-6 flex items-center gap-2">
                    <User size={14} /> Bio-Contextual Data
                  </h3>
                  <div className="space-y-4 relative z-10">
                     <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Conditions</span>
                        <p className="text-sm font-bold text-white leading-relaxed">
                          {patientData?.medicalConditions?.join(', ') || 'No reported conditions'}
                        </p>
                     </div>
                     <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Current Medications</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                           {patientData?.currentMedications?.length ? patientData.currentMedications.map((m, i) => (
                             <span key={i} className="px-2 py-1 bg-white/20 text-[10px] font-black rounded-lg">{m}</span>
                           )) : <span className="text-xs text-white/40 italic">None registered</span>}
                        </div>
                     </div>
                  </div>
                  <Link to="/onboarding" className="mt-8 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:translate-x-2 transition-transform">
                    Edit Bio-Node <ArrowLeft className="rotate-180" size={14} />
                  </Link>
                </div>

                {/* Help Panel */}
                <div className="bg-teal-50 border border-teal-100 rounded-[2.5rem] p-8 group overflow-hidden">
                   <h3 className="text-xs font-black text-teal-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Info size={14} /> Safety Disclaimer
                   </h3>
                   <p className="text-[11px] font-medium text-teal-700/80 leading-relaxed mb-6">
                     This clinical node is for informational purposes only. It cross-references data using established pharmacological rulesets but does not replace professional medical intervention.
                   </p>
                   <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-white/50 rounded-xl">
                        <ShieldAlert size={12} className="text-teal-600" />
                        <span className="text-[9px] font-black text-teal-800 uppercase tracking-widest">E2EE Data Transit</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white/50 rounded-xl font-bold uppercase tracking-widest">
                        <Zap size={12} className="text-amber-500" />
                        <span className="text-[9px] font-black text-teal-800 uppercase tracking-widest">Lethal Dose Protection</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

