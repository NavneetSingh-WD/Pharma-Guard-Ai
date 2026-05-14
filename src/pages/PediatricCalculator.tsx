import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calculator, Baby, AlertTriangle, Info, ShieldCheck, Weight, Syringe } from 'lucide-react';
import { calculateMgDose, calculateMlVolume, isPediatric as checkPediatric } from '../lib/pharmaUtils';

export default function PediatricCalculator() {
  const { userProfile, patientData } = useAuth();
  
  const [drugName, setDrugName] = useState('');
  const [age, setAge] = useState<number | ''>(patientData?.age || '');
  const [weightKg, setWeightKg] = useState<number | ''>(patientData?.weightKg || '');
  const [targetDoseMgKg, setTargetDoseMgKg] = useState<number | ''>('');
  const [concentrationMg, setConcentrationMg] = useState<number | ''>('');
  const [concentrationMl, setConcentrationMl] = useState<number | ''>(1);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [calculatedDoseMg, setCalculatedDoseMg] = useState<number | null>(null);
  const [calculatedVolumeMl, setCalculatedVolumeMl] = useState<number | null>(null);

  const isPediatric = age !== '' ? checkPediatric(Number(age)) : (patientData?.age ? checkPediatric(patientData.age) : false);

  const validate = (name: string, value: number | '') => {
    let error = '';
    if (value !== '' && value <= 0) {
      error = 'Must be a positive number';
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  useEffect(() => {
    const w = weightKg !== '' ? Number(weightKg) : Number(patientData?.weightKg);
    const d = targetDoseMgKg !== '' ? Number(targetDoseMgKg) : 0;
    
    if (w > 0 && d > 0) {
      const totalMg = calculateMgDose(w, d);
      setCalculatedDoseMg(totalMg);

      const cmg = concentrationMg !== '' ? Number(concentrationMg) : 0;
      const cml = concentrationMl !== '' ? Number(concentrationMl) : 0;

      if (cmg > 0 && cml > 0) {
        const volume = calculateMlVolume(totalMg, cmg, cml);
        setCalculatedVolumeMl(volume);
      } else {
        setCalculatedVolumeMl(null);
      }
    } else {
      setCalculatedDoseMg(null);
      setCalculatedVolumeMl(null);
    }
  }, [weightKg, targetDoseMgKg, concentrationMg, concentrationMl, patientData?.weightKg]);

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
            
            {/* Patient Context & Inputs */}
            <div className={`bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 space-y-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPediatric ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 text-slate-500'}`}>
                    {isPediatric ? <Baby size={24} /> : <Weight size={24} />}
                  </div>
                  <div>
                    <h2 className={`font-bold ${isPediatric ? 'text-amber-900' : 'text-slate-800'}`}>
                      {isPediatric ? 'Pediatric Patient Profile' : 'Adult Patient Profile'}
                    </h2>
                    <p className={`text-sm text-slate-500 uppercase font-bold tracking-widest text-[10px]`}>
                      Initialize weight-based verification
                    </p>
                  </div>
                </div>
                {isPediatric && (
                  <div className="hidden sm:flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle size={14} /> High Risk
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Patient Age (Years)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setAge(val);
                        validate('age', val);
                      }}
                      placeholder="e.g. 5"
                      className={`w-full px-4 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition-all ${errors.age ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                    />
                    {errors.age && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">{errors.age}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Current Weight (kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={weightKg}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setWeightKg(val);
                        validate('weight', val);
                      }}
                      placeholder="e.g. 18.5"
                      className={`w-full px-4 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition-all ${errors.weight ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                    />
                    {errors.weight && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">{errors.weight}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator Form */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Syringe size={20} className="text-indigo-600" />
                Dosage Parameters
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Drug Name (Optional)</label>
                  <input 
                    type="text" 
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g., Amoxicillin" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Target Dose (mg/kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={targetDoseMgKg}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setTargetDoseMgKg(val);
                        validate('dosage', val);
                      }}
                      placeholder="e.g., 15" 
                      className={`w-full pl-4 pr-16 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition-all ${errors.dosage ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                    />
                    <span className="absolute right-4 top-[14px] text-slate-400 font-medium text-xs">mg/kg</span>
                    {errors.dosage && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">{errors.dosage}</p>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Consult a physician or drug reference for the correct target dose.</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Liquid Concentration (Required for mL)</label>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={concentrationMg}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setConcentrationMg(val);
                            validate('concentration', val);
                          }}
                          placeholder="e.g., 250" 
                          className={`w-full pl-4 pr-12 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition-all ${errors.concentration ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                        />
                        <span className="absolute right-4 top-[14px] text-slate-400 font-medium text-xs">mg</span>
                      </div>
                      {errors.concentration && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">{errors.concentration}</p>}
                    </div>
                    <span className="text-slate-400 font-bold mt-3">per</span>
                    <div className="flex-1">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={concentrationMl}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setConcentrationMl(val);
                            validate('quantity', val);
                          }}
                          placeholder="e.g., 5" 
                          className={`w-full pl-4 pr-12 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition-all ${errors.quantity ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                        />
                        <span className="absolute right-4 top-[14px] text-slate-400 font-medium text-xs">mL</span>
                      </div>
                      {errors.quantity && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">{errors.quantity}</p>}
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
                      Based on {weightKg || patientData?.weightKg || '--'} kg × {targetDoseMgKg} mg/kg
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
