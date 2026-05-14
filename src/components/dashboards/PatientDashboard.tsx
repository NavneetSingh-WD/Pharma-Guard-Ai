import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Activity, AlertTriangle, Video, MapPin, PhoneCall, Search, Pill, FileText, Clock, CheckCircle2, Bell, AlertCircle, ShieldAlert, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';

export default function PatientDashboard() {
  const { currentUser, patientData } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      try {
        // Fetch Prescriptions
        const pq = query(
          collection(db, 'prescriptions'),
          where('patientId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const pSnap = await getDocs(pq);
        setPrescriptions(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Reminders
        const rq = query(
          collection(db, 'users', currentUser.uid, 'reminders'),
          orderBy('createdAt', 'desc')
        );
        const rSnap = await getDocs(rq);
        setReminders(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Expired', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle };
    if (diffDays <= 30) return { label: 'Expires in < 30 days', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle };
    if (diffDays <= 60) return { label: 'Expires in < 60 days', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Bell };
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">
      
      {/* Profile Summary (Col span 4, Row span 2) */}
      <div className="md:col-span-4 md:row-span-2 bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl rounded-[2.5rem] p-8 flex flex-col hover:shadow-2xl transition-all duration-500 group">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:rotate-6 transition-transform">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">Patient Profile</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide border-b border-slate-100 pb-1">Clinical Record #VAL82</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-100 hover:bg-white transition-colors">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Age</p>
            <p className="text-xl font-black text-slate-800 tracking-tighter">{patientData?.age || '--'}</p>
            <p className="text-[10px] text-slate-400 font-medium">Years</p>
          </div>
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-100 hover:bg-white transition-colors">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Weight</p>
            <p className="text-xl font-black text-slate-800 tracking-tighter">{patientData?.weightKg || '--'}</p>
            <p className="text-[10px] text-slate-400 font-medium">Kilograms</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-500" /> Active Allergies
            </p>
            <div className="flex flex-wrap gap-2">
              {patientData?.knownAllergies && patientData.knownAllergies.length > 0 ? (
                patientData.knownAllergies.map((allergy, i) => (
                  <span key={i} className="px-3 py-1.5 bg-rose-50/50 text-rose-700 text-xs font-bold rounded-xl border border-rose-100/50 backdrop-blur-sm self-start">{allergy}</span>
                ))
              ) : (
                <span className="text-sm text-slate-400 italic">No allergies reported</span>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <Link to="/pediatric-calculator" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center block text-sm flex items-center justify-center gap-2">
              <Activity size={18} /> Pediatric Dose Calculator
            </Link>
          </div>
        </div>
      </div>

      {/* Drug Scanning & DDI Hero (Col span 8) */}
      <div className="md:col-span-8 bg-teal-600 shadow-2xl shadow-teal-700/20 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group hover:shadow-teal-700/30 transition-all duration-500">
        <div className="absolute right-[-5%] top-[-10%] opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <Activity size={320} strokeWidth={1} className="text-white" />
        </div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-xl text-white rounded-2xl shadow-inner border border-white/20">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Safety Engine</h2>
          </div>
          <p className="text-lg text-teal-50 font-medium mb-10 max-w-xl leading-relaxed">
            Ensure clinical maximum dose safety. Scan medicine labels or cross-reference 
            with your medical history for real-time interaction (DDI) checks.
          </p>
          <div className="mt-auto flex flex-wrap gap-4">
            <Link to="/scanner" className="bg-white text-teal-800 font-black py-4 px-8 rounded-2xl shadow-xl hover:bg-teal-50 hover:shadow-2xl transition-all active:scale-95 text-lg flex items-center gap-3">
              <Search size={20} /> AI Label Scanner
            </Link>
            <Link to="/safety-engine" className="bg-teal-800/40 backdrop-blur-xl border border-teal-400/40 text-white font-bold py-4 px-8 rounded-2xl hover:bg-teal-800/60 transition-all active:scale-95 text-lg">
              Manual Check
            </Link>
          </div>
        </div>
      </div>

      {/* Telemedicine (Col span 4) */}
      <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl rounded-[2.5rem] p-8 flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden relative group">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <Video size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Tele-Health</h2>
          </div>
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Live
          </span>
        </div>
        <p className="text-slate-500 text-sm mb-10 font-medium leading-relaxed">Secure, encrypted 1-on-1 virtual consultations with certified professionals.</p>
        <Link to="/telemedicine" className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] text-center block text-sm">
          Join Consultation Room
        </Link>
      </div>

      {/* Pharmacy Locator (Col span 4) */}
      <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col hover:shadow-2xl transition-all duration-500 group">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl group-hover:rotate-12 transition-transform">
            <MapPin size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Drug Inventory</h2>
        </div>
        <p className="text-slate-500 text-sm mb-10 font-medium leading-relaxed">Search nearby stock, compare MTM generic vs. brand prices, and check FEFO expiry.</p>
        <Link to="/pharmacy" className="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] text-center block flex items-center justify-center gap-3 text-sm">
          <Store size={20} /> Locate In-Stock
        </Link>
      </div>


      {/* Emergency Resources (Col span 12) */}
      <div className="md:col-span-12 bg-rose-600 shadow-2xl shadow-rose-700/20 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10 hover:shadow-rose-700/30 transition-all duration-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl text-white rounded-3xl flex items-center justify-center shadow-inner border border-white/20 group-hover:rotate-12 transition-transform">
            <PhoneCall size={36} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Emergency Protocol</h2>
            <p className="text-rose-100 text-lg font-medium max-w-md">Critical first aid, instant hospital bed telemetry, and GPS-enabled ambulance dispatch.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto relative z-10">
          <Link to="/emergency" className="flex-1 md:flex-none bg-white text-rose-800 font-bold py-5 px-10 rounded-2xl shadow-2xl hover:bg-rose-50 transition-all active:scale-95 text-center">
            First Aid HUB
          </Link>
          <Link to="/emergency" className="flex-1 md:flex-none bg-rose-900/40 backdrop-blur-xl border border-rose-400/40 text-white font-bold py-5 px-10 rounded-2xl hover:bg-rose-900/60 transition-all active:scale-95 text-center flex items-center justify-center gap-3">
             Request Dispatch
          </Link>
        </div>
      </div>


      {/* Medication Reminders & Expiry Alerts (Col span 12) */}
      <div className="md:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Dosage Alarms */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl">
              <Clock size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Daily Dosage Alarms</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6"><div className="animate-spin h-5 w-5 border-t-2 border-teal-600 rounded-full"></div></div>
            ) : reminders.length > 0 ? (
              reminders.flatMap(r => r.dailyTimes.map((time: string, i: number) => ({ ...r, time, timeId: `${r.id}-${i}` })))
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((rem) => (
                  <div key={rem.timeId} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-l-4 border-l-teal-500">
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-slate-800 font-mono">{rem.time}</p>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{rem.drugName}</p>
                        <p className="text-xs text-slate-500">{rem.dosage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No active dosage reminders.</p>
              </div>
            )}
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <Bell size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Medication Expiry Alerts</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6"><div className="animate-spin h-5 w-5 border-t-2 border-amber-600 rounded-full"></div></div>
            ) : reminders.some(r => getExpiryStatus(r.expiryDate)) ? (
              reminders.filter(r => getExpiryStatus(r.expiryDate)).map((rem) => {
                const status = getExpiryStatus(rem.expiryDate);
                if (!status) return null;
                const StatusIcon = status.icon;
                return (
                  <div key={rem.id} className={`flex items-start justify-between p-4 ${status.bg} rounded-2xl border border-white/50`}>
                    <div className="flex gap-4">
                      <div className={`p-2 rounded-xl bg-white shadow-sm ${status.color}`}>
                        <StatusIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{rem.drugName}</p>
                        <p className="text-xs text-slate-500 mb-1">Batch: {rem.batchNumber}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.label}: {rem.expiryDate}</p>
                      </div>
                    </div>
                    <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Dismiss</button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">All scanned medications are strictly safe.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* My Prescriptions (Col span 12) */}
      <div className="md:col-span-12 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl">
            <FileText size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">My E-Prescriptions</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-t-2 border-violet-600 rounded-full"></div>
            </div>
          ) : prescriptions.length > 0 ? (
            prescriptions.map((px) => (
              <div key={px.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 hover:border-violet-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <Pill size={16} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Prescription</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-tighter">#{px.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  {px.status === 'fulfilled' ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                      <CheckCircle2 size={10} /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  {px.medications?.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{m.name}</span>
                      <span className="text-slate-500">{m.dosage}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Dr. {px.doctorName}</span>
                  <button className="text-[10px] font-bold text-violet-600 hover:underline">View Details</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">No digital prescriptions found.</p>
              <button 
                onClick={() => navigate('/telemedicine')}
                className="mt-2 text-violet-600 text-xs font-bold hover:underline"
              >
                Schedule a consultation
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
