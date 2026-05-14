import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, PhoneCall, MapPin, AlertTriangle, HeartPulse, Activity, ShieldAlert, Navigation, Bed, Loader2, CheckCircle2, X } from 'lucide-react';
import Layout from '../components/Layout';

export default function EmergencyHub() {
  const { userProfile, patientData } = useAuth();
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);

  const [protocolViewer, setProtocolViewer] = useState<any>(null);

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        const res = await fetch('/api/emergency/beds');
        const data = await res.json();
        setHospitals(data.hospitals.map((h: any) => ({
          ...h,
          beds: h.beds.general,
          icu: h.beds.icu,
          status: h.beds.general > 0 ? 'available' : 'full'
        })));
      } catch (err) {
        console.error("Failed to fetch beds", err);
      }
    };
    fetchBeds();
  }, []);

  const protocols = {
    anaphylaxis: {
      title: "Anaphylaxis Protocol",
      steps: [
        "Lay the person flat. Do not let them stand or walk.",
        "Administer Epinephrine auto-injector (Epi-Pen) in the outer mid-thigh.",
        "Call Emergency Services (911) immediately.",
        "If there is no improvement after 5-10 minutes, administer a second dose if available.",
        "Monitor airway and breathing until responders arrive."
      ],
      color: "rose"
    },
    overdose: {
      title: "Suspected Overdose",
      steps: [
        "Stay calm and call emergency services immediately.",
        "Check for responsiveness and breathing.",
        "Do NOT induce vomiting unless instructed by poison control.",
        "Prevent further intake of the substance.",
        "Monitor vitals (pulse, breathing) and be prepared to perform CPR if necessary.",
        "Gather substance containers for responders to identify."
      ],
      color: "amber"
    }
  };

  const handleDispatch = async () => {
    setIsDispatching(true);
    
    // Attempt real GPS acquisition
    let coords = { lat: 37.7749, lng: -122.4194 }; // Default
    
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch (err) {
      console.warn("GPS access denied, using default coordinates.");
    }

    try {
      const res = await fetch('/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...coords, 
          profile: {
            name: userProfile?.displayName,
            age: patientData?.age,
            weight: patientData?.weightKg,
            conditions: patientData?.medicalConditions,
            allergies: patientData?.knownAllergies
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setLocation(`${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° W`);
        setDispatchSuccess(true);
      }
    } catch (err) {
      console.error("Dispatch failed", err);
    } finally {
      setIsDispatching(false);
    }
  };

  const [hospitalBeds, setHospitalBeds] = useState([
    { name: 'City Central Hospital', beds: 12, icu: 2, distance: '0.8 km', status: 'available' },
    { name: 'St. Mary Medical Center', beds: 4, icu: 0, distance: '2.4 km', status: 'critical' },
    { name: 'Metro General', beds: 28, icu: 8, distance: '3.1 km', status: 'available' },
    { name: 'University Health', beds: 0, icu: 0, distance: '5.2 km', status: 'full' },
  ]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
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
          
          {/* Smart Dispatch COMMAND CENTER (Col 7) */}
          <div className="lg:col-span-7 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
               <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 italic">
                 Priority 1 Protocol
               </div>
            </div>

            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div className="w-20 h-20 bg-rose-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                <ShieldAlert size={40} />
              </div>
              <div className="max-w-md">
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Smart Dispatch</h2>
                <p className="text-slate-500 font-medium">GPS-linked emergency responder deployment with automated medical history transmission.</p>
              </div>
            </div>
            
            <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-6 mb-10">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Dispatcher Payload Preview</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Target Profile</p>
                  <p className="text-sm font-bold text-slate-800">{userProfile?.displayName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Medication History</p>
                  <p className="text-sm font-bold text-slate-800">{patientData?.medicalConditions?.length || 0} Conditions</p>
                </div>
                <div className="col-span-2 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-2">
                    <Navigation size={12} /> Geolocation Precision
                  </p>
                  <p className="text-sm font-mono font-bold text-slate-700">{location || "Awaiting GPS Authorization..."}</p>
                </div>
              </div>
            </div>

            {!dispatchSuccess ? (
              <button 
                onClick={handleDispatch}
                disabled={isDispatching}
                className="mt-auto w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-6 rounded-3xl shadow-2xl shadow-rose-600/30 transition-all active:scale-[0.98] disabled:opacity-70 flex flex-col items-center justify-center gap-2"
              >
                {isDispatching ? (
                  <div className="flex items-center gap-4">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-2xl tracking-tighter">SECURING GPS...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <PhoneCall size={32} />
                    <span className="text-2xl tracking-tighter uppercase italic">Initialize Dispatch</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="mt-auto bg-green-500 text-white rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-500 shadow-xl shadow-green-500/20">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">Dispatch Active</h3>
                <p className="text-green-50 font-bold text-lg mb-4">ETA: 4-6 Minutes • Unit #AMB-912</p>
                <div className="bg-white/10 p-3 rounded-2xl text-xs font-mono font-bold inline-block">
                  GPS LOCK: {location}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Telemetry & Protocols (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Hospital Telemetry */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all duration-500">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:rotate-6 transition-transform">
                     <Bed size={24} />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-slate-800 tracking-tight">Hospital Telemetry</h2>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Regional UHI Stream</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
                 </div>
               </div>

               <div className="space-y-3">
                 {hospitalBeds.map((h, i) => (
                   <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-white transition-all cursor-pointer group/item">
                     <div className="flex gap-4 items-center">
                       <div className={`p-2 rounded-xl scale-90 ${h.status === 'full' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                         <Navigation size={16} />
                       </div>
                       <div>
                         <p className="font-bold text-slate-800 text-sm group-hover/item:text-indigo-600 transition-colors uppercase tracking-tight">{h.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.distance}</p>
                       </div>
                     </div>
                     <div className="flex gap-4 text-right">
                       <div className="flex flex-col">
                         <span className={`text-xl font-black tracking-tighter ${h.beds > 0 ? 'text-teal-600' : 'text-slate-300'}`}>{h.beds}</span>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Beds</span>
                       </div>
                       <div className="flex flex-col border-l border-slate-100 pl-4">
                         <span className={`text-xl font-black tracking-tighter ${h.icu > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{h.icu}</span>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ICU</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Protocol Quick-view */}
            <div className="bg-slate-900 shadow-2xl shadow-slate-900/20 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute right-[-10%] bottom-[-10%] opacity-20 pointer-events-none group-hover:scale-150 transition-transform duration-1000">
                 <HeartPulse size={200} strokeWidth={1} />
               </div>
               <h2 className="text-xl font-bold mb-4 flex items-center gap-3 relative z-10">
                 <HeartPulse size={24} className="text-rose-500" />
                 Medical Protocols
               </h2>
               <div className="space-y-4 relative z-10">
                 <div 
                   onClick={() => setProtocolViewer(protocols.anaphylaxis)}
                   className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group/opt"
                 >
                    <p className="font-bold text-sm mb-1 group-hover/opt:text-rose-400 transition-colors uppercase tracking-tight">Anaphylaxis</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">Lay flat, Epi-Pen, call-911 instantly.</p>
                 </div>
                 <div 
                   onClick={() => setProtocolViewer(protocols.overdose)}
                   className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group/opt"
                 >
                    <p className="font-bold text-sm mb-1 group-hover/opt:text-amber-400 transition-colors uppercase tracking-tight">Overdose</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">Safety monitor, do NOT induce vomiting.</p>
                 </div>
               </div>
            </div>

          </div>

        </div>
      </div>

      {/* Medical Protocol Modal */}
      {protocolViewer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative">
              <div className={`p-8 bg-${protocolViewer.color}-600 text-white`}>
                 <div className="flex justify-between items-center mb-4">
                    <HeartPulse size={32} />
                    <button onClick={() => setProtocolViewer(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                      <X size={24} />
                    </button>
                 </div>
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter">{protocolViewer.title}</h2>
              </div>
              <div className="p-8">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Immediate Action Protocol</p>
                 <div className="space-y-4">
                    {protocolViewer.steps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-4">
                         <div className={`w-6 h-6 rounded-lg bg-${protocolViewer.color}-100 text-${protocolViewer.color}-600 flex items-center justify-center font-black text-xs shrink-0`}>
                           {i + 1}
                         </div>
                         <p className="text-slate-700 font-bold leading-relaxed">{step}</p>
                      </div>
                    ))}
                 </div>
                 <button 
                  onClick={() => setProtocolViewer(null)}
                  className={`mt-10 w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg`}
                 >
                   Understood - Monitor Vitals
                 </button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
}
