import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Activity } from 'lucide-react';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-100 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-300/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2rem] flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 mb-6">
          <ShieldAlert size={40} strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">PHARMA-GUARD</h1>
        <p className="text-slate-600 mb-8 font-medium">
          Integrated Drug Safety, Telemedicine & Emergency Resource System
        </p>

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 font-semibold py-3.5 px-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
          <Activity size={16} />
          <span>HIPAA-Compliant Interoperability</span>
        </div>
      </div>
    </div>
  );
}
