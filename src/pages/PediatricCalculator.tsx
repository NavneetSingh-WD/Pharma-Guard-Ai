import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calculator, Baby, AlertTriangle, Info, ShieldCheck, Weight, Syringe } from 'lucide-react';

export default function PediatricCalculator() {
  const { userProfile, patientData } = useAuth();
  
  const [drugName, setDrugName] = useState('');
  const [targetDoseMgKg, setTargetDoseMgKg] = useState<number | ''>('');
  const [concentrationMg, setConcentrationMg] = useState<number | ''>('');
  const [concentrationMl, setConcentrationMl] = useState<number | ''>(1);
  
  const [calculatedDoseMg, setCalculatedDoseMg] = useState<number | null>(null);
  const [calculatedVolumeMl, setCalculatedVolumeMl] = useState<number | null>(null);

  const isPediatric = patientData?.age ? patientData.age < 18 : false;

  useEffect(() => {
    if (patientData?.weightKg && targetDoseMgKg !== '') {
      const weight = patientData.weightKg;
      const totalMg = weight * Number(targetDoseMgKg);
      setCalculatedDoseMg(totalMg);

      if (concentrationMg !== '' && concentrationMl !== '') {
        const volume = (totalMg / Number(concentrationMg)) * Number(concentrationMl);
        setCalculatedVolumeMl(volume);
      } else {
        setCalculatedVolumeMl(null);
      }
    } else {
      setCalculatedDoseMg(null);
      setCalculatedVolumeMl(null);
    }
  }, [patientData?.weightKg, targetDoseMgKg, concentrationMg, concentrationMl]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mx-auto mb-4">
            <Calculator size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Pediatric Dose Calculator</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Strict weight-based (mg/kg) mathematical algorithms for safe pediatric dosage calculations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Input Section */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* Patient Context */}
            <div className={`border rounded-[2rem] p-6 flex items-center justify-between ${isPediatric ? 'bg-amber-50 border-amber-200' : 'bg-white/70 backdrop-blur-xl border-white/60 shadow-xl'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPediatric ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 text-slate-500'}`}>
                  {isPediatric ? <Baby size={24} /> : <Weight size={24} />}
                </div>
                <div>
                  <h2 className={`font-bold ${isPediatric ? 'text-amber-900' : 'text-slate-800'}`}>
                    {isPediatric ? 'Pediatric Patient Profile' : 'Adult Patient Profile'}
                  </h2>
                  <p className={`text-sm ${isPediatric ? 'text-amber-700/80' : 'text-slate-500'}`}>
                    Age: {patientData?.age} yrs • Weight: {patientData?.weightKg} kg
                  </p>
                </div>
              </div>
              {isPediatric && (
                <div className="hidden sm:flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle size={14} /> High Risk
                </div>
              )}
            </div>

            {/* Calculator Form */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Syringe size={20} className="text-indigo-600" />
                Dosage Parameters
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drug Name (Optional)</label>
                  <input 
                    type="text" 
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g., Amoxicillin" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Dose (mg/kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={targetDoseMgKg}
                      onChange={(e) => setTargetDoseMgKg(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g., 15" 
                      className="w-full pl-4 pr-16 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">mg/kg</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Consult a physician or drug reference for the correct target dose.</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Liquid Concentration (Optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        value={concentrationMg}
                        onChange={(e) => setConcentrationMg(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g., 250" 
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">mg</span>
                    </div>
                    <span className="text-slate-400 font-bold">per</span>
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        value={concentrationMl}
                        onChange={(e) => setConcentrationMl(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g., 5" 
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">mL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Results Section */}
          <div className="md:col-span-5">
            <div className="bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 rounded-[2rem] p-6 h-full flex flex-col relative overflow-hidden">
              <div className="absolute right-[-10%] top-[-5%] opacity-10 pointer-events-none">
                <Calculator size={200} strokeWidth={1} />
              </div>
              
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                <ShieldCheck size={24} />
                Calculated Dose
              </h2>

              <div className="relative z-10 flex-1 flex flex-col justify-center gap-6">
                
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
                  <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-1">Total Required Dose</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{calculatedDoseMg !== null ? calculatedDoseMg.toFixed(1) : '--'}</span>
                    <span className="text-xl font-medium text-indigo-200">mg</span>
                  </div>
                  {calculatedDoseMg !== null && (
                    <p className="text-xs text-indigo-200 mt-2">
                      Based on {patientData?.weightKg} kg × {targetDoseMgKg} mg/kg
                    </p>
                  )}
                </div>

                <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 transition-opacity ${calculatedVolumeMl !== null ? 'opacity-100' : 'opacity-50'}`}>
                  <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-1">Liquid Volume to Administer</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{calculatedVolumeMl !== null ? calculatedVolumeMl.toFixed(1) : '--'}</span>
                    <span className="text-xl font-medium text-indigo-200">mL</span>
                  </div>
                  {calculatedVolumeMl !== null && (
                    <p className="text-xs text-indigo-200 mt-2">
                      Using {concentrationMg}mg / {concentrationMl}mL concentration
                    </p>
                  )}
                </div>

              </div>

              <div className="mt-8 bg-indigo-800/50 border border-indigo-400/30 rounded-xl p-4 flex items-start gap-3 relative z-10">
                <Info size={20} className="text-indigo-300 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-200 leading-relaxed">
                  <strong>Disclaimer:</strong> This calculator provides mathematical conversions based on user input. It is not a substitute for professional medical advice. Always double-check calculations before administering medication, especially for pediatric patients.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
