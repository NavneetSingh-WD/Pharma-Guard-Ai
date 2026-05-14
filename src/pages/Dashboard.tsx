import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Pill, Clock, ShieldAlert, XCircle, Settings } from 'lucide-react';
import PatientDashboard from '../components/dashboards/PatientDashboard';
import DoctorDashboard from '../components/dashboards/DoctorDashboard';
import PharmacistDashboard from '../components/dashboards/PharmacistDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { userProfile, logout } = useAuth();

  const renderDashboard = () => {
    // Check status first
    if (userProfile?.status === 'pending') {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
           <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mb-8 animate-pulse shadow-2xl shadow-amber-200">
              <Clock size={48} />
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic mb-4">Verification in Progress</h2>
           <p className="text-slate-500 max-w-md mx-auto font-bold uppercase text-[10px] tracking-widest leading-loose">
             Protocol is currently analyzing your credentials. An administrator will review your medical documentation shortly. Access to restricted nodes is disabled.
           </p>
           <button onClick={logout} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
             <LogOut size={16} /> Disconnect Session
           </button>
        </div>
      );
    }

    if (userProfile?.status === 'rejected') {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
           <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-rose-200">
              <XCircle size={48} />
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic mb-4">Verification Failed</h2>
           <p className="text-slate-500 max-w-md mx-auto font-bold uppercase text-[10px] tracking-widest leading-loose">
             The provided credentials did not meet the required clinical standards or were identified as unverified. Please contact support or disconnect.
           </p>
           <button onClick={logout} className="mt-10 px-8 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">
             Terminate Session
           </button>
        </div>
      );
    }

    switch (userProfile?.role) {
      case 'doctor':
        return <DoctorDashboard />;
      case 'pharmacist':
        return <PharmacistDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'patient':
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <Layout>
      {renderDashboard()}
    </Layout>
  );
}
