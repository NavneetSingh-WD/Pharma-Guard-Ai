import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Activity, User, Stethoscope, Store, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  const roles = [
    {
      id: 'patient',
      title: 'Patient Portal',
      desc: 'Access your medical profile, safety checks & consults.',
      icon: User,
      color: 'teal'
    },
    {
      id: 'doctor',
      title: 'Clinical CRM',
      desc: 'Manage patient records, E-Prescribe & video rounds.',
      icon: Stethoscope,
      color: 'indigo'
    },
    {
      id: 'pharmacist',
      title: 'Pharmacy PMS',
      desc: 'Inventory management, generic substitues & dispensing.',
      icon: Store,
      color: 'amber'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white/60 shadow-sm mb-6"
          >
            <ShieldCheck size={18} className="text-teal-600" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Pharma-Guard Healthcare OS</span>
          </motion.div>
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic"
          >
            Integrated <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-indigo-600 to-violet-600">Care Ecosystem</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 mt-6 max-w-xl mx-auto font-bold uppercase text-[10px] tracking-[0.2em] leading-loose"
          >
            A unified multi-role platform for patients, doctors & pharmacists. <br />
            Secure. Interoperable. Relentless about safety.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {roles.map((role, idx) => {
            const Icon = role.icon;
            const colorClass = 
              role.color === 'teal' ? 'bg-teal-600 shadow-teal-200 group-hover:bg-teal-700' :
              role.color === 'indigo' ? 'bg-indigo-600 shadow-indigo-200 group-hover:bg-indigo-700' :
              'bg-amber-500 shadow-amber-200 group-hover:bg-amber-600';
            
            return (
              <motion.div 
                key={role.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="group relative bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-500"
              >
                <div className={`w-20 h-20 ${colorClass} text-white rounded-[2rem] flex items-center justify-center shadow-2xl mb-8 group-hover:rotate-12 transition-transform duration-500`}>
                  <Icon size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic mb-4">{role.title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-10">
                  {role.desc}
                </p>
                <div className="w-full h-px bg-slate-100 mb-8"></div>
                <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                  <Activity size={12} /> Live Network Node
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={loginWithGoogle}
            className="group relative w-full max-w-md bg-slate-900 overflow-hidden hover:bg-black text-white font-black py-6 px-10 rounded-[2rem] shadow-2xl shadow-slate-900/30 transition-all active:scale-95 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2.5 group-hover:rotate-12 transition-transform">
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
               </div>
               <span className="text-sm uppercase tracking-[0.2em] italic">Secure System Access</span>
            </div>
            <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="mt-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
             Unified Authentication via Google SSO
          </p>
        </motion.div>
      </div>
    </div>
  );
}
