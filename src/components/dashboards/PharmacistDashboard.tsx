import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Store, Package, RefreshCw, AlertTriangle, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PharmacistDashboard() {
  const { userProfile } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
      
      {/* Pharmacy Profile Summary (Col span 4) */}
      <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
            <Store size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Pharmacy Profile</h2>
        </div>
        <div className="flex flex-col items-center mb-6">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-amber-50 shadow-md mb-3" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3 text-2xl font-bold">
              {userProfile?.displayName?.charAt(0) || 'P'}
            </div>
          )}
          <h3 className="text-xl font-bold text-slate-800">{userProfile?.displayName || 'Pharmacist'}</h3>
          <p className="text-sm text-slate-500">City Health Pharmacy</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
            <p className="text-2xl font-bold text-amber-600">45</p>
            <p className="text-xs text-slate-500 font-medium uppercase">Orders Today</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
            <p className="text-2xl font-bold text-rose-600">3</p>
            <p className="text-xs text-slate-500 font-medium uppercase">Low Stock</p>
          </div>
        </div>
      </div>

      {/* Inventory & MTM (Col span 8) */}
      <div className="md:col-span-8 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xl shadow-amber-600/20 rounded-3xl p-6 flex flex-col relative overflow-hidden hover:shadow-2xl hover:shadow-amber-600/30 transition-shadow duration-300">
        <div className="absolute right-[-5%] top-[-10%] opacity-10 pointer-events-none">
          <Package size={250} strokeWidth={1} />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-xl">
              <Package size={20} />
            </div>
            <h2 className="text-xl font-bold">Inventory & MTM Dashboard</h2>
          </div>
          <p className="text-amber-100 mb-6 max-w-lg">
            Manage real-time stock, monitor FEFO (First Expire, First Out) alerts, and process generic substitutions.
          </p>
          <div className="mt-auto flex gap-3">
            <button className="bg-white text-amber-700 font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-amber-50 transition-colors active:scale-95 text-center flex items-center gap-2">
              <Search size={18} /> Manage Inventory
            </button>
            <button className="bg-amber-600/50 backdrop-blur-md border border-amber-400/50 text-white font-semibold py-3 px-6 rounded-xl hover:bg-amber-600/70 transition-colors active:scale-95 text-center flex items-center gap-2">
              <RefreshCw size={18} /> Generic Substitutions
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Alerts (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">FEFO Expiry Alerts</h2>
          </div>
          <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full uppercase tracking-wider">Action Required</span>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
            <div>
              <p className="text-sm font-bold text-slate-800">Amoxicillin 500mg</p>
              <p className="text-xs text-slate-500">Batch: AMX-992</p>
            </div>
            <span className="text-sm font-bold text-rose-600">Expires in 15 days</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div>
              <p className="text-sm font-bold text-slate-800">Lisinopril 10mg</p>
              <p className="text-xs text-slate-500">Batch: LIS-401</p>
            </div>
            <span className="text-sm font-bold text-amber-600">Expires in 45 days</span>
          </div>
        </div>
        <button className="mt-auto w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] text-center block">
          View All Alerts
        </button>
      </div>

      {/* E-Prescriptions (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl">
            <FileText size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">E-Prescriptions</h2>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <div>
                <p className="text-sm font-bold text-slate-800">Rx: Metformin 500mg</p>
                <p className="text-xs text-slate-500">Patient: John Doe</p>
              </div>
            </div>
            <button className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100">Fulfill</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <div>
                <p className="text-sm font-bold text-slate-800">Rx: Atorvastatin 20mg</p>
                <p className="text-xs text-slate-500">Patient: Jane Smith</p>
              </div>
            </div>
            <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">Fulfill</button>
          </div>
        </div>
        <button className="mt-auto w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] text-center block">
          View All Prescriptions
        </button>
      </div>

    </div>
  );
}
