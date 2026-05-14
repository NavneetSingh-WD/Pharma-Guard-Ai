import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, ShieldCheck, ShieldX, FileText, CheckCircle2, XCircle, Clock, ExternalLink, Search, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingUser {
  id: string;
  email: string;
  displayName: string;
  role: 'doctor' | 'pharmacist';
  status: 'pending';
  createdAt: string;
  professionalData?: any;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
    fetchPatients();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const users: PendingUser[] = [];
      
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        const role = userData.role as 'doctor' | 'pharmacist';
        const collectionName = role === 'doctor' ? 'doctors' : 'pharmacies';
        const profSnap = await getDoc(doc(db, collectionName, userDoc.id));
        
        users.push({
          id: userDoc.id,
          email: userData.email,
          displayName: userData.displayName,
          role: role,
          status: 'pending',
          createdAt: userData.createdAt,
          professionalData: profSnap.exists() ? profSnap.data() : null
        });
      }
      setPendingUsers(users);
    } catch (error) {
      console.error("Error fetching pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    setPatientsLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'patient'), limit(10));
      const snap = await getDocs(q);
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchPatients();
      return;
    }
    
    setPatientsLoading(true);
    try {
      // Client-side filtering for simplicity in this demo, real apps would use a search index
      const q = query(collection(db, 'users'), where('role', '==', 'patient'));
      const snap = await getDocs(q);
      const allPatients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const filtered = allPatients.filter(p => 
        p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setPatients(filtered);
    } catch (error) {
      console.error("Error searching patients:", error);
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleVerification = async (userId: string, status: 'active' | 'rejected') => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { 
        status,
        updatedAt: new Date().toISOString() 
      });
      
      // Update local state
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error(`Error updating user ${userId} to ${status}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Admin Stat Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-1000">
            <ShieldCheck size={300} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-2">Central Security Pulse</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Master Governance Node // Protocol V2.5</p>
            </div>
            <div className="flex gap-10">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Approval</p>
                <p className="text-4xl font-black italic tracking-tighter text-amber-400">{pendingUsers.length}</p>
              </div>
              <div className="w-px h-12 bg-white/10 hidden md:block"></div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Assets</p>
                <p className="text-4xl font-black italic tracking-tighter text-teal-400">Locked</p>
              </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Verification Queue Section */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                 <Clock size={24} />
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Verification Queue</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Medical Documentation Review</p>
               </div>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
               <CheckCircle2 size={48} className="text-teal-400 mx-auto mb-4" />
               <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic">No Pending Applications found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingUsers.map((user) => (
                <div key={user.id} className="p-8 bg-slate-50/80 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-violet-200 transition-all group shadow-sm hover:shadow-xl">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
                    {/* User Identity */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shadow-inner uppercase font-black italic text-sm">
                        {user.displayName.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">{user.displayName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{user.email}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          user.role === 'doctor' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Professional Metadata */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Credentials</p>
                          <div className="flex items-center gap-3">
                             <FileText size={16} className="text-violet-500" />
                             <div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">License: {user.professionalData?.licenseNumber || 'NOT-SPECIFIED'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {user.role === 'doctor' ? user.professionalData?.specialization : user.professionalData?.pharmacyName}
                                </p>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentation Audit</p>
                          <a 
                            href={user.professionalData?.verificationDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between group/link h-10 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-violet-600 transition-all"
                          >
                            <span>Review Certificate</span>
                            <ExternalLink size={14} className="group-hover/link:translate-x-1 transition-transform" />
                          </a>
                       </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => handleVerification(user.id, 'active')}
                        disabled={!!actionLoading}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-600/20 transition-all active:scale-90 disabled:opacity-50"
                      >
                        {actionLoading === user.id ? 'Wait...' : <><ShieldCheck size={16} /> Approve</>}
                      </button>
                      <button 
                        onClick={() => handleVerification(user.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all active:scale-90 disabled:opacity-50"
                      >
                        {actionLoading === user.id ? 'Wait...' : <><ShieldX size={16} /> Reject</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patient Directory Section */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem] p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                 <Users size={24} />
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Patient Directory</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Medical Data Stream</p>
               </div>
            </div>

            <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
              <input 
                type="text" 
                placeholder="Search patient identity..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-xs font-bold shadow-inner outline-none transition-all placeholder:text-slate-300"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Search size={18} />
              </div>
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Identity</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Node</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {patientsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="animate-spin inline-block h-8 w-8 border-t-2 border-indigo-600 rounded-full"></div>
                    </td>
                  </tr>
                ) : patients.length > 0 ? (
                  patients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="group cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      onClick={() => navigate(`/patient/${patient.id}`)}
                    >
                      <td className="py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                             {patient.displayName?.slice(0, 2).toUpperCase() || 'P'}
                          </div>
                          <span className="font-black text-slate-800 uppercase tracking-tight text-sm italic">{patient.displayName}</span>
                        </div>
                      </td>
                      <td className="py-5 text-xs font-bold text-slate-400 uppercase tracking-tight">{patient.email}</td>
                      <td className="py-5">
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-lg uppercase tracking-widest border border-green-100">Active</span>
                      </td>
                      <td className="py-5 text-right">
                        <div className="p-2 bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-lg transition-all inline-block">
                          <ArrowRight size={16} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-300 italic uppercase text-[10px] font-black tracking-widest">No patient nodes detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
