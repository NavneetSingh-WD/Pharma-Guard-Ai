import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Pill, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';

export default function Header() {
  const { userProfile, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const isDev = window.location.hostname === 'localhost';

  if (!userProfile) return null;

  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-12 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-4 lg:p-5 px-8 group">
      <div className="flex items-center gap-6 mb-4 md:mb-0">
        <Link to="/" className="flex items-center gap-6">
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
        </Link>
      </div>
      
      <div className="flex-1 w-full max-w-sm mx-6 hidden md:block">
        <GlobalSearch />
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
           <div className="flex items-center gap-2 group/profile relative">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase italic">{userProfile?.displayName || 'Authorized User'}</p>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">{userProfile?.role || 'Guest'}</p>
              </div>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-10 h-10 rounded-xl border-2 border-white shadow-lg object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200"><User size={20} /></div>
              )}
              
              <Link 
                to="/onboarding" 
                className="absolute -bottom-2 -left-2 bg-slate-900 text-white p-1 rounded-lg opacity-0 group-hover/profile:opacity-100 transition-all hover:bg-indigo-600 shadow-lg z-20"
                title="Edit Profile"
              >
                <Settings size={12} />
              </Link>
           </div>
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="group/btn relative p-4 bg-slate-50 text-slate-500 hover:text-white hover:bg-rose-600 rounded-2xl transition-all shadow-sm active:scale-90"
          title="Terminate Session"
        >
          <LogOut size={24} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></div>
        </button>
      </div>
    </header>
  );
}
