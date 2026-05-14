import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Activity, AlertCircle, ShieldAlert, HeartPulse, Stethoscope, Loader2, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';

interface SafetyReport {
  riskAssessment: string[];
  immediateGuidance: string[];
  redFlagTrigger: string[];
  escalationInstruction: string[];
}

export default function SafetyEngine() {
  const { userProfile, patientData } = useAuth();
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<SafetyReport | null>(null);

  const analyzeSafety = async () => {
    if (!query.trim() || !userProfile || !patientData) return;
    setIsAnalyzing(true);
    setReport(null);

    try {
      const res = await fetch('/api/safety/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
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
      } else {
        throw new Error(data.error || "Failed to process report");
      }
    } catch (error) {
      console.error("Error analyzing safety:", error);
      alert("Failed to analyze the query. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20 mx-auto mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Drug Safety & DDI Engine</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Cross-reference your medication intake against your health profile to instantly check for interactions, overdose risks, and pediatric safety.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Stethoscope size={20} className="text-teal-600" />
                Describe Intake
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Example: "I took 6 tablets of 500 mg Paracetamol in 2 hours" or "Can I take Ibuprofen with my current blood pressure meds?"
              </p>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your medication query here..."
                className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none resize-none mb-4"
              />
              <button
                onClick={analyzeSafety}
                disabled={isAnalyzing || !query.trim()}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? <><Loader2 size={20} className="animate-spin" /> Analyzing Risk...</> : 'Analyze Safety Risk'}
              </button>
            </div>

            {/* Profile Context Summary */}
            <div className="bg-teal-50 border border-teal-100 rounded-[2rem] p-6">
              <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HeartPulse size={16} /> Active Profile Context
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-teal-200/50 pb-2">
                  <span className="text-teal-700/70">Age / Weight</span>
                  <span className="font-semibold text-teal-900">{patientData?.age} yrs / {patientData?.weightKg} kg</span>
                </div>
                <div className="flex justify-between border-b border-teal-200/50 pb-2">
                  <span className="text-teal-700/70">Allergies</span>
                  <span className="font-semibold text-teal-900 text-right max-w-[60%]">{patientData?.knownAllergies?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-teal-700/70">Current Meds</span>
                  <span className="font-semibold text-teal-900 text-right max-w-[60%]">{patientData?.currentMedications?.join(', ') || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-7">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 h-full min-h-[500px]">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Clinical Safety Report</h2>
              
              {!report && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 pb-12">
                  <ShieldAlert size={64} className="mb-4" />
                  <p className="text-center max-w-xs">Enter your medication details to generate a structured safety report.</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 pb-12">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium animate-pulse">Cross-referencing medical profile...</p>
                </div>
              )}

              {report && !isAnalyzing && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Risk Assessment */}
                  <div className="bg-slate-50 border-l-4 border-slate-400 p-4 rounded-r-xl">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Activity size={16} /> Risk Assessment
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {report.riskAssessment.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  {/* Immediate Guidance */}
                  <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                    <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Immediate Guidance
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-teal-900">
                      {report.immediateGuidance.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  {/* Red Flag Trigger */}
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertCircle size={16} /> Red Flag Triggers
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-amber-900">
                      {report.redFlagTrigger.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  {/* Escalation Instruction */}
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                    <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ShieldAlert size={16} /> Escalation Instructions
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-rose-900 font-medium">
                      {report.escalationInstruction.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
