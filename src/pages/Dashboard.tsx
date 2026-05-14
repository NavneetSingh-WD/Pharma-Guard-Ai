import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Pill, Clock, ShieldAlert, XCircle } from 'lucide-react';
import PatientDashboard from '../components/dashboards/PatientDashboard';
import DoctorDashboard from '../components/dashboards/DoctorDashboard';
import PharmacistDashboard from '../components/dashboards/PharmacistDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';

export default function Dashboard() {
  const { userProfile, logout, updateUserProfile } = useAuth();

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

  const isDev = window.location.hostname === 'localhost';

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 lg:p-10 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - High-Contrast Clinical Design */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-4 lg:p-5 px-8 group">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20 group-hover:rotate-6 transition-transform">
              <Pill size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Pharma-Guard</h1>
              <div className="flex items-center gap-4 mt-1">
                 <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Active</span>
                 </div>
                 <div className="w-px h-3 bg-slate-200"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node: v2.5.0-Secure</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Role Switcher - Admin Only or Dev Mode */}
            {(userProfile?.role === 'admin' || isDev) && (
              <div className="hidden md:flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button 
                  onClick={() => updateUserProfile({ role: 'patient' })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userProfile?.role === 'patient' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Patient
                </button>
                <button 
                  onClick={() => updateUserProfile({ role: 'doctor' })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userProfile?.role === 'doctor' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Doctor
                </button>
                <button 
                  onClick={() => updateUserProfile({ role: 'pharmacist' })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userProfile?.role === 'pharmacist' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Pharmacist
                </button>
                <button 
                  onClick={() => updateUserProfile({ role: 'admin' })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userProfile?.role === 'admin' ? 'bg-white text-violet-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Admin
                </button>
              </div>
            )}

            <div className="hidden lg:flex flex-col items-end border-r border-slate-100 pr-6">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Authenticated Terminal</span>
               <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase italic">{userProfile?.displayName || 'Authorized User'}</p>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">{userProfile?.role || 'Guest'}</p>
                  </div>
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" className="w-10 h-10 rounded-xl border-2 border-white shadow-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200"><User size={20} /></div>
                  )}
               </div>
            </div>

            <button 
              onClick={logout}
              className="group/btn relative p-4 bg-slate-50 text-slate-500 hover:text-white hover:bg-rose-600 rounded-2xl transition-all shadow-sm active:scale-90"
              title="Terminate Session"
            >
              <LogOut size={24} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></div>
            </button>
          </div>
        </header>

        {/* Role-Specific Dashboard */}
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
          {renderDashboard()}
        </div>
      </div>
    </div>
  );
}
