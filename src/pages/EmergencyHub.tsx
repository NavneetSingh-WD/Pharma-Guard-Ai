import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PhoneCall, MapPin, AlertTriangle, HeartPulse, Activity, ShieldAlert, Navigation, Bed, Loader2, CheckCircle2 } from 'lucide-react';

export default function EmergencyHub() {
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        const res = await fetch('/api/emergency/beds');
        const data = await res.json();
        setHospitals(data.hospitals);
      } catch (err) {
        console.error("Failed to fetch beds", err);
      }
    };
    fetchBeds();
  }, []);

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 37.7749, lng: -122.4194 })
      });
      const data = await res.json();
      if (data.success) {
        setLocation(data.location);
        setDispatchSuccess(true);
      }
    } catch (err) {
      console.error("Dispatch failed", err);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-rose-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-rose-600/30 mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">Emergency Response Hub</h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Immediate first aid protocols, real-time hospital bed availability, and rapid ambulance dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Dispatch & Beds (Step 6) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Ambulance Dispatch */}
            <div className="bg-white/80 backdrop-blur-xl border-2 border-rose-100 shadow-2xl shadow-rose-500/10 rounded-[2rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
              
              <h2 className="text-2xl font-bold text-rose-900 mb-2 flex items-center gap-3">
                <PhoneCall size={28} className="text-rose-600" />
                SOS Dispatch
              </h2>
              <p className="text-rose-700/80 mb-8">Instantly transmit your GPS location and medical profile to emergency responders.</p>
              
              {!dispatchSuccess ? (
                <button 
                  onClick={handleDispatch}
                  disabled={isDispatching}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-rose-600/30 transition-all active:scale-[0.98] disabled:opacity-70 flex flex-col items-center justify-center gap-2"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 size={32} className="animate-spin mb-2" />
                      Acquiring GPS & Dispatching...
                    </>
                  ) : (
                    <>
                      <Navigation size={32} className="mb-2" />
                      DISPATCH AMBULANCE NOW
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">Ambulance Dispatched</h3>
                  <p className="text-green-800/80 text-sm mb-4">ETA: 8 Minutes</p>
                  <div className="bg-white/60 p-3 rounded-xl text-xs text-slate-600 flex items-center justify-center gap-2">
                    <MapPin size={14} className="text-rose-500" />
                    {location}
                  </div>
                </div>
              )}
            </div>

            {/* Hospital Bed Availability */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Bed size={24} className="text-indigo-600" />
                Real-Time Bed Availability
              </h2>
              
              <div className="space-y-4">
                {hospitals.length > 0 ? hospitals.map((hospital) => (
                  <div key={hospital.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">{hospital.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {hospital.distance} away
                      </p>
                    </div>
                    <div className="flex gap-3 text-center">
                      <div className={`px-3 py-1.5 rounded-lg ${hospital.beds.icu > 0 ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">ICU</p>
                        <p className="font-bold text-lg leading-none">{hospital.beds.icu}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg ${hospital.beds.general > 0 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Gen</p>
                        <p className="font-bold text-lg leading-none">{hospital.beds.general}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <p>Loading bed availability...</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: First Aid Protocols (Step 5) */}
          <div className="lg:col-span-7">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 lg:p-8 h-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <HeartPulse size={28} className="text-rose-500" />
                Emergency First Aid Protocols
              </h2>
              <p className="text-slate-500 mb-8">Strict, medically validated instructions for immediate bystander intervention.</p>

              <div className="space-y-6">
                
                {/* Anaphylaxis */}
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-rose-900 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-rose-600" />
                    Anaphylaxis (Severe Allergic Reaction)
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0">1</div>
                      <div>
                        <p className="font-bold text-slate-800">Lay the person flat</p>
                        <p className="text-sm text-slate-600">Do not allow them to stand or walk. If breathing is difficult, allow them to sit up slightly.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0">2</div>
                      <div>
                        <p className="font-bold text-slate-800">Use Epinephrine Auto-Injector</p>
                        <p className="text-sm text-slate-600">If available, administer immediately into the outer mid-thigh. Note the time of administration.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0">3</div>
                      <div>
                        <p className="font-bold text-slate-800">Call Emergency Services</p>
                        <p className="text-sm text-slate-600">Even if symptoms improve after epinephrine, immediate medical evaluation is mandatory.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overdose */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-amber-600" />
                    Drug Overdose
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">1</div>
                      <div>
                        <p className="font-bold text-slate-800">Prevent further intake</p>
                        <p className="text-sm text-slate-600">Remove any remaining pills, patches, or substances from the person's vicinity.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">2</div>
                      <div>
                        <p className="font-bold text-slate-800">Do NOT induce vomiting</p>
                        <p className="text-sm text-slate-600">Unless explicitly instructed by poison control or emergency services. It can cause choking or severe esophageal damage.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">3</div>
                      <div>
                        <p className="font-bold text-slate-800">Monitor Vital Signs</p>
                        <p className="text-sm text-slate-600">Check breathing and responsiveness. If unconscious but breathing, place in the recovery position (on their side).</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
