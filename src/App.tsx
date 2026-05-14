/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Telemedicine from './pages/Telemedicine';
import ConsultationRoom from './pages/ConsultationRoom';
import Scanner from './pages/Scanner';
import SafetyEngine from './pages/SafetyEngine';
import EmergencyHub from './pages/EmergencyHub';
import PharmacyLocator from './pages/PharmacyLocator';
import PediatricCalculator from './pages/PediatricCalculator';
import PatientRecord from './pages/Doctor/PatientRecord';
import PharmacistInventory from './pages/Pharmacist/Inventory';
import { Users, Calendar, Pill, Search, Plus, ArrowRight, Clock, FilePlus, AlertCircle, Settings } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import ScheduleModal from './components/modals/ScheduleModal';
import NewPrescriptionModal from './components/modals/NewPrescriptionModal';
import { useNavigate } from 'react-router-dom';

function DoctorDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isRxOpen, setIsRxOpen] = useState(false);

  // Fetch upcoming appointments
  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', userProfile.uid),
      orderBy('date', 'asc'),
      orderBy('time', 'asc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [userProfile?.uid]);

  useEffect(() => {
    async function searchPatients() {
      if (!searchTerm) {
        setPatients([]);
        return;
      }
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'patient'),
          limit(10)
        );
        const snap = await getDocs(q);
        const allPatients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filtered = allPatients.filter((p: any) => 
          p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setPatients(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(searchPatients, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const togglePriority = async (e: React.MouseEvent, appointmentId: string, currentPriority: boolean) => {
    e.stopPropagation();
    try {
      const aptRef = doc(db, 'appointments', appointmentId);
      await updateDoc(aptRef, {
        priority: !currentPriority
      });
    } catch (err) {
      console.error("Error updating priority:", err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none mb-2">Doctor Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unified Clinical & Patient Management Console</p>
            <div className="w-px h-3 bg-slate-200"></div>
            <Link to="/onboarding" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
              <Settings size={12} /> Edit Profile
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Calendar size={18} /> Schedule Slot
          </button>
          <button 
            onClick={() => setIsRxOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-200 active:scale-95"
          >
            <Pill size={18} /> New Prescription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-1 bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/10 rounded-2xl text-indigo-400">
                  <Clock size={24} />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tight italic">Daily Queue</h2>
              </div>

              <div className="space-y-4">
                {appointments.length > 0 ? (
                  appointments.map(apt => (
                    <div 
                      key={apt.id} 
                      className={`p-5 bg-white/5 border rounded-2xl transition-all cursor-pointer relative group/item ${
                        apt.priority 
                          ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.1)]' 
                          : 'border-white/10 hover:bg-white/10'
                      }`} 
                      onClick={() => navigate(`/patient/${apt.patientId}`)}
                    >
                      {apt.priority && (
                        <div className="absolute -top-2 -left-2 bg-rose-500 text-white rounded-full p-1 animate-pulse shadow-lg shadow-rose-500/50">
                          <AlertCircle size={14} />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${apt.priority ? 'text-rose-400' : 'text-indigo-400'}`}>
                          {apt.time}
                        </span>
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={(e) => togglePriority(e, apt.id, !!apt.priority)}
                            className={`p-1.5 rounded-lg transition-all ${
                              apt.priority 
                                ? 'bg-rose-500 text-white' 
                                : 'bg-white/5 text-white/40 hover:bg-white/20'
                            }`}
                            title={apt.priority ? "Remove Priority" : "Mark as Priority"}
                           >
                              <AlertCircle size={12} />
                           </button>
                           <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-tighter ${
                             apt.priority ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
                           }`}>
                             {apt.type}
                           </span>
                        </div>
                      </div>
                      <p className={`text-sm font-bold mb-1 ${apt.priority ? 'text-rose-100' : 'text-white'}`}>{apt.patientName}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">DR. {apt.doctorName || 'Medical'}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-30 border-2 border-dashed border-white/10 rounded-3xl">
                     <p className="text-[10px] font-black uppercase tracking-widest">No Slots Booked</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Patient Management */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight italic leading-none">Patient Registry</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-Node Record Access</p>
              </div>
           </div>
           
           <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Query patient identity terminal..." 
                className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-lg font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-2 py-10 text-center animate-pulse text-slate-400 text-xs font-black uppercase tracking-widest italic">Syncing Central Registry...</div>
              ) : patients.length > 0 ? (
                patients.map(p => (
                  <div key={p.id} className="p-5 bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white rounded-3xl flex items-center justify-between transition-all cursor-pointer group shadow-sm hover:shadow-lg" onClick={() => navigate(`/patient/${p.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 uppercase shadow-inner">
                        {p.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-800 leading-none mb-1">{p.displayName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">UID: {p.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))
              ) : searchTerm ? (
                <div className="col-span-2 py-10 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Zero Matches in Sector</div>
              ) : (
                <div className="col-span-2 py-16 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] border-2 border-dashed border-slate-50 rounded-[2.5rem] italic">Input identity data to retrieve records</div>
              )}
           </div>
        </div>
      </div>

      <ScheduleModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} />
      <NewPrescriptionModal isOpen={isRxOpen} onClose={() => setIsRxOpen(false)} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { currentUser, userProfile, patientData } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" />;
  
  const isAdminUser = userProfile?.role === 'admin' || currentUser?.email === 'goyalelectrocare@gmail.com';

  // Admins can bypass almost everything for testing/management
  if (isAdminUser) {
    return <>{children}</>;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  if (userProfile?.role === 'unassigned') {
    return <Navigate to="/onboarding" />;
  }
  
  if (userProfile?.role === 'patient' && (!patientData || !patientData.age || !patientData.weightKg)) {
    return <Navigate to="/onboarding" />;
  }

  // Enforce verification for professionals on specific routes
  const isProfessional = userProfile?.role === 'doctor' || userProfile?.role === 'pharmacist';
  if (isProfessional && userProfile?.status !== 'active' && allowedRoles) {
    // If they are trying to access a role-specific route but aren't active, send them to dashboard
    // Dashboard will show the "Verification in Progress" screen
    return <Navigate to="/" />;
  }

  if (allowedRoles && userProfile?.role && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-200">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            } />
            <Route 
              path="/telemedicine" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor']}>
                  <Telemedicine />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/consultation/:roomId" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor']}>
                  <ConsultationRoom />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/scanner" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor', 'pharmacist']}>
                  <Scanner />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/safety-engine" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor', 'pharmacist']}>
                  <SafetyEngine />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/emergency" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor']}>
                  <EmergencyHub />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/pharmacy" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor']}>
                  <PharmacyLocator />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/pediatric-calculator" 
              element={
                <PrivateRoute allowedRoles={['patient', 'doctor', 'pharmacist']}>
                  <PediatricCalculator />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patient/:patientId" 
              element={
                <PrivateRoute allowedRoles={['doctor']}>
                  <PatientRecord />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/doctor-panel" 
              element={
                <PrivateRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <PrivateRoute allowedRoles={['pharmacist']}>
                  <PharmacistInventory />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
