import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Store, Package, RefreshCw, AlertTriangle, FileText, Search, CheckCircle2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import GenericSubModal from '../modals/GenericSubModal';

export default function PharmacistDashboard() {
  const { userProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch pending prescriptions
        const qPx = query(
          collection(db, 'prescriptions'), 
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapPx = await getDocs(qPx);
        setPrescriptions(snapPx.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch inventory for FEFO alerts
        const qInv = query(
          collection(db, 'inventory'),
          orderBy('expiryDate', 'asc'),
          limit(5)
        );
        const snapInv = await getDocs(qInv);
        setInventory(snapInv.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching pharmacist data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getDaysLeft = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fulfillPrescription = async (id: string) => {
    try {
      await updateDoc(doc(db, 'prescriptions', id), {
        status: 'fulfilled',
        fulfilledAt: new Date().toISOString(),
        pharmacyId: userProfile?.uid,
        pharmacyName: userProfile?.displayName
      });
      setPrescriptions(prev => prev.filter(p => p.id !== id));
      alert("Prescription fulfilled successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to fulfill prescription");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 auto-rows-[minmax(140px,auto)]">
      
      {/* Inventory & MTM HERO CARD (Col span 8) */}
      <div className="lg:col-span-8 bg-amber-600 shadow-2xl shadow-amber-900/20 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group">
        <div className="absolute right-[-5%] top-[-5%] opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000 text-white">
           <Package size={320} strokeWidth={1} />
        </div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl group-hover:bg-amber-400/30 transition-colors"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-xl text-white rounded-2xl border border-white/20 group-hover:rotate-12 transition-transform">
              <Package size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">PMS Control Hub</h2>
              <p className="text-amber-100/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">MTM & Inventory Telemetry</p>
            </div>
          </div>
          <p className="text-amber-50 text-lg font-medium mb-10 max-w-xl leading-relaxed">
            Monitor real-time stock levels, automated FEFO alerts, and MTM drug interactions. 
            Utilize our clinical engine for safe generic substitutions and price benchmarking.
          </p>
          <div className="mt-auto flex flex-wrap gap-4">
            <Link 
              to="/inventory"
              className="bg-white text-amber-800 font-black py-4 px-10 rounded-2xl shadow-xl hover:bg-slate-50 hover:-translate-y-1 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
            >
              <Search size={20} /> Manage Stock
            </Link>
            <button 
              onClick={() => setIsSubModalOpen(true)}
              className="bg-amber-800/40 backdrop-blur-xl border border-white/30 text-white font-black py-4 px-10 rounded-2xl hover:bg-amber-800/60 hover:-translate-y-1 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-3"
            >
              <RefreshCw size={20} /> Substitution Engine
            </button>
          </div>
        </div>
      </div>

      {/* Pharmacist Profile (Col span 4) */}
      <div className="lg:col-span-4 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group hover:shadow-2xl transition-all duration-500">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-amber-500 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity"></div>
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="Profile" className="relative w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="relative w-32 h-32 rounded-[2.5rem] bg-amber-100 text-amber-700 flex items-center justify-center text-5xl font-black shadow-xl">
              {userProfile?.displayName?.charAt(0) || 'P'}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 p-2.5 bg-amber-500 text-white rounded-xl shadow-lg border-2 border-white">
            <Store size={18} />
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{userProfile?.displayName || 'Chief Pharmacist'}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Clinical MTM Specialist • Terminal #92</p>
        
        <Link to="/onboarding" className="mb-8 w-full bg-slate-50 text-slate-600 font-bold py-3 rounded-2xl border border-slate-100 hover:bg-white transition-all text-center block text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
          <Settings size={14} /> Update Credentials
        </Link>

        <div className="w-full grid grid-cols-2 gap-4">
          <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 group/stat">
            <p className="text-2xl font-black text-amber-600 leading-none mb-1 group-hover/stat:scale-110 transition-transform">45</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Orders</p>
          </div>
          <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100 group/stat">
            <p className="text-2xl font-black text-rose-600 leading-none mb-1 group-hover/stat:scale-110 transition-transform">3</p>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">Critical</p>
          </div>
        </div>
      </div>

      {/* FEFO Alerts (Col span 5, Row span 2) */}
      <div className="lg:col-span-5 lg:row-span-2 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
        <div className="absolute -left-8 -top-8 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl group-hover:rotate-6 transition-transform">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">FEFO Telemetry</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Expiry Risk Vector</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Warning
          </span>
        </div>
        
        <div className="space-y-4 mb-8 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
          {inventory.length > 0 ? (
            inventory.map((item) => {
              const daysLeft = getDaysLeft(item.expiryDate);
              const progress = Math.max(0, Math.min(100, (daysLeft / 180) * 100)); // normalized against 6 months
              
              return (
                <div key={item.id} className={`p-5 border rounded-2xl flex flex-col gap-3 group/alert transition-colors ${
                  daysLeft <= 30 ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50' : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">BATCH: {item.batchNumber}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      daysLeft <= 30 ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {daysLeft < 0 ? 'Expired' : `${daysLeft} Days Left`}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${daysLeft <= 30 ? 'bg-rose-600' : 'bg-amber-600'}`} 
                      style={{ width: `${100 - progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center">
               <Package size={32} className="mx-auto text-slate-200 mb-2" />
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Secure</p>
            </div>
          )}
        </div>

        <Link 
          to="/inventory"
          className="mt-auto w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-center text-sm uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Search size={18} /> Audit Inventory
        </Link>
      </div>

      {/* E-Prescriptions Hub (Col span 7) */}
      <div className="lg:col-span-7 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all duration-500 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Active Rx Stream</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Inter-Operability Protocol</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYNCING
          </div>
        </div>

        <div className="space-y-4 mb-4 flex-1 overflow-y-auto max-h-[360px] pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
               <div className="animate-spin h-10 w-10 border-t-2 border-teal-600 rounded-full mb-4"></div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Decrypting Stream...</p>
            </div>
          ) : prescriptions.length > 0 ? (
            prescriptions.map((px) => (
              <div key={px.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl group/item hover:bg-white hover:border-teal-300 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center font-black text-lg">
                      {px.patientName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-base leading-none mb-1">{px.patientName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">REF: #{px.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => fulfillPrescription(px.id)}
                    className="flex items-center gap-2 text-xs font-black text-white bg-teal-600 px-5 py-2.5 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={16} /> DISPENSE
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {px.medications?.map((m: any, i: number) => (
                    <span key={i} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-lg uppercase tracking-tight">
                      {m.name} • {m.dosage}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
               <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search size={32} />
               </div>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Queue Vacant</p>
            </div>
          )}
        </div>
      </div>



      <GenericSubModal 
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />
    </div>
  );
}
