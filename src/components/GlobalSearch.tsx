import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Pill, Calendar, ArrowRight, X } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'patient' | 'prescription' | 'appointment';
  title: string;
  subtitle: string;
  path: string;
}

export default function GlobalSearch() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!term || term.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setIsOpen(true);
      const searchResults: SearchResult[] = [];

      try {
        const lowerTerm = term.toLowerCase();

        // 1. Search Patients (Doctors/Pharmacists/Admins only)
        if (userProfile?.role === 'doctor' || userProfile?.role === 'pharmacist' || userProfile?.role === 'admin') {
          const q = query(
            collection(db, 'users'),
            where('role', '==', 'patient'),
            limit(20)
          );
          const snap = await getDocs(q);
          const patients = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(p => 
              p.displayName?.toLowerCase().includes(lowerTerm) || 
              p.email?.toLowerCase().includes(lowerTerm)
            )
            .map(p => ({
              id: p.id,
              type: 'patient' as const,
              title: p.displayName || 'Unnamed Patient',
              subtitle: p.email || 'No email',
              path: `/patient/${p.id}`
            }));
          searchResults.push(...patients);
        }

        // 2. Search Prescriptions
        const rxQ = query(
          collection(db, 'prescriptions'),
          limit(50)
        );
        const rxSnap = await getDocs(rxQ);
        const prescriptions = rxSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(rx => 
            rx.medicationName?.toLowerCase().includes(lowerTerm) || 
            rx.patientName?.toLowerCase().includes(lowerTerm)
          )
          .map(rx => ({
            id: rx.id,
            type: 'prescription' as const,
            title: rx.medicationName || 'Unnamed Med',
            subtitle: `For ${rx.patientName} • ${rx.dosage}`,
            path: userProfile?.role === 'patient' ? '/' : (userProfile?.role === 'pharmacist' ? '/inventory' : `/patient/${rx.patientId}`)
          }));
        searchResults.push(...prescriptions);

        // 3. Search Appointments
        const aptQ = query(
          collection(db, 'appointments'),
          limit(50)
        );
        const aptSnap = await getDocs(aptQ);
        const appointments = aptSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(apt => 
            apt.patientName?.toLowerCase().includes(lowerTerm) || 
            apt.type?.toLowerCase().includes(lowerTerm)
          )
          .map(apt => ({
            id: apt.id,
            type: 'appointment' as const,
            title: `${apt.type} Appointment`,
            subtitle: `${apt.patientName} • ${apt.date} @ ${apt.time}`,
            path: userProfile?.role === 'doctor' ? '/doctor-panel' : '/'
          }));
        searchResults.push(...appointments);

        // Limit total results and deduplicate if necessary (though they are from diff collections)
        setResults(searchResults.slice(0, 10));
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(performSearch, 500);
    return () => clearTimeout(timer);
  }, [term, userProfile]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search patients, meds, or slots..." 
          className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all text-sm font-bold text-slate-800 placeholder:text-slate-400"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => term.length >= 2 && setIsOpen(true)}
        />
        {term && (
          <button 
            onClick={() => setTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Search Results</span>
            {loading && <Loader2 size={14} className="animate-spin text-indigo-500 mr-2" />}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {results.length > 0 ? (
              results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-indigo-50/50 transition-all text-left border-b border-slate-50 last:border-0 group/result"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    result.type === 'patient' ? 'bg-indigo-100 text-indigo-600' :
                    result.type === 'prescription' ? 'bg-teal-100 text-teal-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {result.type === 'patient' ? <User size={18} /> :
                     result.type === 'prescription' ? <Pill size={18} /> :
                     <Calendar size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-none mb-1 group-hover/result:text-indigo-600 transition-colors">{result.title}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{result.subtitle}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover/result:opacity-100 group-hover/result:translate-x-1 transition-all" />
                </button>
              ))
            ) : term.length >= 2 && !loading ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={24} />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records found in this sector</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
