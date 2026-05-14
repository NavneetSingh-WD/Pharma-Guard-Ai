import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, ShieldCheck, ShieldX, FileText, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';

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
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
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
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shadow-inner uppercase font-black italic">
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
      </div>
    </div>
  );
}
