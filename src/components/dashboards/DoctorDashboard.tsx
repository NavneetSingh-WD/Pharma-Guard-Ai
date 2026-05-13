import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, FileText, Video, Activity, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorDashboard() {
  const { userProfile } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
      
      {/* Doctor Profile Summary (Col span 4) */}
      <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
            <Stethoscope size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Doctor Profile</h2>
        </div>
        <div className="flex flex-col items-center mb-6">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-indigo-50 shadow-md mb-3" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 text-2xl font-bold">
              {userProfile?.displayName?.charAt(0) || 'Dr'}
            </div>
          )}
          <h3 className="text-xl font-bold text-slate-800">{userProfile?.displayName || 'Dr. User'}</h3>
          <p className="text-sm text-slate-500">General Practitioner</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
            <p className="text-2xl font-bold text-indigo-600">12</p>
            <p className="text-xs text-slate-500 font-medium uppercase">Patients Today</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
            <p className="text-2xl font-bold text-teal-600">4</p>
            <p className="text-xs text-slate-500 font-medium uppercase">Pending Consults</p>
          </div>
        </div>
      </div>

      {/* 360 Patient View & E-Prescribing (Col span 8) */}
      <div className="md:col-span-8 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-600/20 rounded-3xl p-6 flex flex-col relative overflow-hidden hover:shadow-2xl hover:shadow-indigo-600/30 transition-shadow duration-300">
        <div className="absolute right-[-5%] top-[-10%] opacity-10 pointer-events-none">
          <Users size={250} strokeWidth={1} />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-xl">
              <Users size={20} />
            </div>
            <h2 className="text-xl font-bold">Patient CRM & E-Prescribing</h2>
          </div>
          <p className="text-indigo-100 mb-6 max-w-lg">
            Access 360-degree patient records, review medical histories, and send digital prescriptions directly to pharmacies.
          </p>
          <div className="mt-auto flex gap-3">
            <button className="bg-white text-indigo-700 font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-indigo-50 transition-colors active:scale-95 text-center">
              View Patient List
            </button>
            <button className="bg-indigo-600/50 backdrop-blur-md border border-indigo-400/50 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-600/70 transition-colors active:scale-95 text-center flex items-center gap-2">
              <FileText size={18} /> New Prescription
            </button>
          </div>
        </div>
      </div>

      {/* Telemedicine (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl">
              <Video size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Virtual Consultations</h2>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">2 Waiting</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">Manage your telemedicine queue and start secure 1-on-1 video calls with patients.</p>
        <Link to="/telemedicine" className="mt-auto w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] text-center block">
          Open Telemedicine Hub
        </Link>
      </div>

      {/* Appointments (Col span 6) */}
      <div className="md:col-span-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Schedule</h2>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <div>
                <p className="text-sm font-bold text-slate-800">John Doe</p>
                <p className="text-xs text-slate-500">Follow-up</p>
              </div>
            </div>
            <span className="text-sm font-medium text-slate-600">10:30 AM</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <div>
                <p className="text-sm font-bold text-slate-800">Jane Smith</p>
                <p className="text-xs text-slate-500">Consultation</p>
              </div>
            </div>
            <span className="text-sm font-medium text-slate-600">11:15 AM</span>
          </div>
        </div>
        <button className="mt-auto w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] text-center block">
          View Full Schedule
        </button>
      </div>

    </div>
  );
}
