import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Activity, AlertTriangle, Video, MapPin, PhoneCall, Search, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientDashboard() {
  const { patientData } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
      
      {/* Profile Summary (Col span 4) */}
      <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <User size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Patient Profile</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Age</p>
            <p className="text-lg font-semibold text-slate-800">{patientData?.age || '--'} yrs</p>
          </div>
          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Weight</p>
            <p className="text-lg font-semibold text-slate-800">{patientData?.weightKg || '--'} kg</p>
          </div>
        </div>
        <div className="space-y-3 mt-auto">
          <div className="mb-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle size={12} className="text-rose-500" /> Allergies
            </p>
            <div className="flex flex-wrap gap-1.5">
              {patientData?.knownAllergies && patientData.knownAllergies.length > 0 ? (
                patientData.knownAllergies.map((allergy, i) => (
                  <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-md border border-rose-100">{allergy}</span>
                ))
              ) : (
                <span className="text-sm text-slate-400">None reported</span>
              )}
            </div>
          </div>
          <Link to="/pediatric-calculator" className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 rounded-xl border border-indigo-200 transition-colors text-center block text-sm">
            Open Dose Calculator
          </Link>
        </div>
      </div>

      {/* Drug Scanning & DDI (Col span 8) */}
      <div className="md:col-span-8 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-xl shadow-teal-600/20 rounded-3xl p-6 flex flex-col relative overflow-hidden hover:shadow-2xl hover:shadow-teal-600/30 transition-shadow duration-300">
        <div className="absolute right-[-5%] top-[-10%] opacity-10 pointer-events-none">
          <Activity size={250} strokeWidth={1} />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-xl">
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-bold">Drug Safety & DDI Engine</h2>
          </div>
          <p className="text-teal-100 mb-6 max-w-lg">
            Scan medicine labels or enter dosage to instantly check for interactions, overdose risks, and pediatric safety.
          </p>
          <div className="mt-auto flex gap-3">
            <Link to="/scanner" className="bg-white text-teal-700 font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-teal-50 transition-colors active:scale-95 text-center">
              Scan Medicine Label
            </Link>
            <Link to="/safety-engine" className="bg-teal-600/50 backdrop-blur-md border border-teal-400/50 text-white font-semibold py-3 px-6 rounded-xl hover:bg-teal-600/70 transition-colors active:scale-95 text-center">
              Manual Check
            </Link>
          </div>
        </div>
      </div>

      {/* Telemedicine (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Video size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Telemedicine</h2>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Doctors Online</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">Connect with a healthcare professional instantly via secure 1-on-1 video consultation.</p>
        <Link to="/telemedicine" className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] text-center block">
          Start Virtual Consult
        </Link>
      </div>

      {/* Pharmacy Locator (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
            <MapPin size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Pharmacy Locator</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6">Find nearby pharmacies, check real-time inventory, and compare generic vs. brand prices.</p>
        <Link to="/pharmacy" className="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] text-center block flex items-center justify-center gap-2">
          <Search size={18} /> Search Nearby Stock
        </Link>
      </div>

      {/* Emergency Resources (Col span 12) */}
      <div className="md:col-span-12 bg-rose-50 border border-rose-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
            <PhoneCall size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-rose-900 mb-1">Emergency Resources</h2>
            <p className="text-rose-700/80 text-sm">First aid protocols, real-time hospital bed availability, and ambulance dispatch.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link to="/emergency" className="flex-1 md:flex-none bg-white text-rose-700 font-semibold py-3 px-6 rounded-xl border border-rose-200 shadow-sm hover:bg-rose-100 transition-colors active:scale-95 text-center">
            First Aid Guide
          </Link>
          <Link to="/emergency" className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-95 text-center">
            Dispatch Ambulance
          </Link>
        </div>
      </div>

    </div>
  );
}
