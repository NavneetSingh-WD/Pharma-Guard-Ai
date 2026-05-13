import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Pill } from 'lucide-react';
import PatientDashboard from '../components/dashboards/PatientDashboard';
import DoctorDashboard from '../components/dashboards/DoctorDashboard';
import PharmacistDashboard from '../components/dashboards/PharmacistDashboard';

export default function Dashboard() {
  const { userProfile, logout } = useAuth();

  const renderDashboard = () => {
    switch (userProfile?.role) {
      case 'doctor':
        return <DoctorDashboard />;
      case 'pharmacist':
        return <PharmacistDashboard />;
      case 'patient':
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-300/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-600/20">
              <Pill size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">PHARMA-GUARD</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center"><User size={16} /></div>
              )}
              <span>{userProfile?.displayName || userProfile?.email}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Role-Specific Dashboard */}
        {renderDashboard()}
      </div>
    </div>
  );
}
