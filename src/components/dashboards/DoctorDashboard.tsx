import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, FileText, Video, Stethoscope, Search, User, Filter, ArrowRight, CheckCircle2, Plus, Loader2, List, ChevronLeft, ChevronRight, ShieldCheck, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import NewPrescriptionModal from '../modals/NewPrescriptionModal';
import ScheduleModal from '../modals/ScheduleModal';

export default function DoctorDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentSort, setAppointmentSort] = useState<'time' | 'patient'>('time');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Helper to check if a slot is time-sensitive (within next 30 mins)
  const isTimeSensitive = (aptTime: string) => {
    try {
      const [hours, minutes] = aptTime.split(':').map(Number);
      const now = new Date();
      const aptDate = new Date();
      aptDate.setHours(hours, minutes, 0, 0);
      const diff = (aptDate.getTime() - now.getTime()) / (1000 * 60);
      return diff > 0 && diff <= 45; // Upcoming within 45 mins
    } catch {
      return false;
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesType = typeFilter === 'all' || apt.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || (apt.status || 'Scheduled') === statusFilter;
    return matchesType && matchesStatus;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (appointmentSort === 'time') {
      return a.time.localeCompare(b.time);
    }
    return a.patientName.localeCompare(b.patientName);
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Search Debounce Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400); // Slightly faster debounce for better UX
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial Data Fetch (Live Appointments)
  useEffect(() => {
    if (!userProfile?.uid) return;

    const aq = query(
      collection(db, 'appointments'), 
      where('doctorId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(aq, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setInitialLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Unified Patient Fetch/Search Effect
  useEffect(() => {
    async function fetchPatients() {
      if (!userProfile?.uid) return;
      
      setLoading(true);
      try {
        let q;
        if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
          // In a real app, you'd use Algolia/Elasticsearch or a prefix search strategy
          // For this demo, we fetch a larger chunk and filter client-side to maintain "search everything" feel
          q = query(collection(db, 'users'), where('role', '==', 'patient'), limit(100));
          const snap = await getDocs(q);
          const results = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          
          const filtered = results.filter((p: any) => 
            p.displayName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
            p.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            p.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          );
          setPatients(filtered);
        } else {
          // Default view: Recent activity or first 5
          q = query(collection(db, 'users'), where('role', '==', 'patient'), limit(5));
          const snap = await getDocs(q);
          setPatients(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();
  }, [debouncedSearchTerm, userProfile?.uid]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 auto-rows-[minmax(180px,auto)]">
      
      {/* 360 Patient View & E-Prescribing (Col span 8) - THE LEAD BENTO CARD */}
      <div className="lg:col-span-8 bg-indigo-600 shadow-2xl shadow-indigo-900/20 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group">
        <div className="absolute right-[-5%] top-[-5%] opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <Users size={320} strokeWidth={1} className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-xl text-white rounded-2xl border border-white/20 group-hover:rotate-12 transition-transform">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Global Patient CRM</h2>
              <p className="text-indigo-100/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">E-Prescribing & Interoperability</p>
            </div>
          </div>
          <p className="text-indigo-50 text-lg font-medium mb-10 max-w-xl leading-relaxed text-balance">
            Full 360-degree visibility into patient histories, medications, and allergies. Securely transmit digital prescriptions to our unified pharmacy network.
          </p>
          <div className="mt-auto flex flex-wrap gap-4">
            <button 
              onClick={() => navigate('/doctor-panel')}
              className="bg-slate-900 border border-white/20 text-white font-black py-4 px-10 rounded-2xl shadow-xl hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
            >
              <ShieldCheck size={20} /> Command Panel
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('patient-list-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white text-indigo-700 font-black py-4 px-10 rounded-2xl shadow-xl hover:bg-slate-50 hover:-translate-y-1 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Access Records
            </button>
            <button 
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="bg-indigo-500/30 backdrop-blur-xl border border-white/30 text-white font-black py-4 px-10 rounded-2xl hover:bg-indigo-500/50 hover:-translate-y-1 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-3"
            >
              <FileText size={20} /> Digital Script
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Identity Profile (Col span 4) */}
      <div className="lg:col-span-4 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group hover:shadow-2xl transition-all duration-500">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="Profile" className="relative w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="relative w-32 h-32 rounded-[2.5rem] bg-indigo-100 text-indigo-600 flex items-center justify-center text-5xl font-black shadow-xl">
              {userProfile?.displayName?.charAt(0) || 'D'}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 p-2 bg-green-500 text-white rounded-xl shadow-lg border-2 border-white">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{userProfile?.displayName || 'Dr. Consultant'}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-6">Board Certified • Clinical Specialist</p>
        
        <Link to="/onboarding" className="mb-8 w-full bg-slate-50 text-slate-600 font-bold py-3 rounded-2xl border border-slate-100 hover:bg-white transition-all text-center block text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
          <Settings size={14} /> Update Professional Profile
        </Link>

        <div className="w-full grid grid-cols-2 gap-4">
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-100">
            <p className="text-2xl font-black text-indigo-600 leading-none mb-1">12</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Queue</p>
          </div>
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-100">
            <p className="text-2xl font-black text-teal-600 leading-none mb-1">98%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rating</p>
          </div>
        </div>
      </div>

      {/* Telemedicine Queue (Col span 6) */}
      <div className="lg:col-span-6 bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-8 flex flex-col group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-100">
             <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span> Network Active
           </div>
        </div>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
            <Video size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Virtual Consultations</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Real-time Video Signal</p>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:bg-white transition-all cursor-pointer group/item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">JD</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">John Doe</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pain Management</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-lg uppercase tracking-widest animate-pulse font-mono">Urgent</div>
          </div>
          <div className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:bg-white transition-all cursor-pointer group/item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">JS</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Jane Smith</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consultation</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-slate-200 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">Waiting</div>
          </div>
        </div>
        <Link to="/telemedicine" className="mt-auto w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-xl shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] text-center block text-xs uppercase tracking-widest">
          Initiate Terminal
        </Link>
      </div>

      {/* Integrated Appointment Command Center (Col span 6) */}
      <div className="lg:col-span-6 bg-slate-900 shadow-2xl shadow-slate-900/40 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
        <div className="absolute right-[-10%] top-[-10%] opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <Calendar size={250} strokeWidth={1} className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/10 group-hover:rotate-6 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold italic tracking-tighter">Clinical Schedule</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Real-time Sync Active</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
              {/* View Toggle */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-2">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  title="List View"
                >
                  <List size={14} />
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  title="Calendar View"
                >
                  <Calendar size={14} />
                </button>
              </div>

              <button 
                onClick={() => setIsScheduleModalOpen(true)}
                className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg hover:bg-indigo-600 active:scale-95 transition-all"
                title="Schedule New"
              >
                 <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Enhanced Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 flex-1">
                <Filter size={14} className="text-indigo-400" />
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-[10px] font-black w-full uppercase tracking-widest outline-none cursor-pointer text-white"
                >
                  <option value="all" className="bg-slate-900 text-white">Type: All</option>
                  <option value="Consultation" className="bg-slate-900 text-white">Consultation</option>
                  <option value="Follow-up" className="bg-slate-900 text-white">Follow-up</option>
                  <option value="Emergency" className="bg-slate-900 text-white">Emergency</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 flex-1">
                <CheckCircle2 size={14} className="text-teal-400" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[10px] font-black w-full uppercase tracking-widest outline-none cursor-pointer text-white"
                >
                  <option value="all" className="bg-slate-900 text-white">Status: All</option>
                  <option value="Scheduled" className="bg-slate-900 text-white">Scheduled</option>
                  <option value="Completed" className="bg-slate-900 text-white">Completed</option>
                  <option value="Cancelled" className="bg-slate-900 text-white">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={appointmentSort}
                onChange={(e) => setAppointmentSort(e.target.value as any)}
                className="bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 outline-none hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <option value="time" className="bg-slate-900 text-white">By Time</option>
                <option value="patient" className="bg-slate-900 text-white">By Name</option>
              </select>
              
              {(typeFilter !== 'all' || statusFilter !== 'all') && (
                <button 
                  onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}
                  className="text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {viewMode === 'list' ? (
            <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedAppointments.length > 0 ? (
                sortedAppointments.map((apt) => {
                  const urgent = isTimeSensitive(apt.time);
                  return (
                    <div 
                      key={apt.id} 
                      className={`p-4 rounded-2xl border transition-all group/item cursor-pointer flex items-center justify-between
                        ${urgent 
                          ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 shadow-lg shadow-rose-900/20' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      onClick={() => navigate(`/patient/${apt.patientId}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex flex-col items-center min-w-[60px] border-r pr-4 ${urgent ? 'border-rose-500/20' : 'border-white/10'}`}>
                          <span className={`text-xs font-black uppercase leading-none ${urgent ? 'text-rose-400' : 'text-indigo-400'}`}>{apt.time}</span>
                          {urgent && <span className="text-[7px] font-black text-rose-500 uppercase mt-1 animate-pulse">Starting Soon</span>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm text-white leading-none">{apt.patientName}</p>
                            {urgent && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500"></div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{apt.type}</p>
                            <span className="text-[8px] text-slate-600">•</span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              apt.status === 'Completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                              apt.status === 'Cancelled' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            }`}>
                              {apt.status || 'Scheduled'}
                            </span>
                            <span className="text-[8px] text-slate-600">•</span>
                            <p className="text-[8px] text-slate-500 uppercase">{apt.date}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {urgent && (
                          <div className="hidden sm:flex px-2 py-1 bg-rose-500 text-white rounded-lg text-[7px] font-black uppercase tracking-widest">
                            High Priority
                          </div>
                        )}
                        <ArrowRight size={16} className={`transition-all transform group-hover/item:translate-x-1 ${urgent ? 'text-rose-400' : 'text-slate-600 group-hover/item:text-indigo-400'}`} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-12 opacity-30">
                   <Calendar size={48} className="mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-center">No Active Slots in Queue</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 mb-8">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-400" />
                    {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const today = new Date();
                        setCurrentCalendarDate(today);
                        setSelectedDay(today);
                      }}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-slate-500 text-[9px] font-black uppercase tracking-widest py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square opacity-0"></div>
                  ))}
                  {Array.from({ length: new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
                    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                    const dayAppointments = filteredAppointments.filter(apt => apt.date === dateStr);
                    const isToday = new Date().toDateString() === dateObj.toDateString();
                    const isSelected = selectedDay.toDateString() === dateObj.toDateString();

                    return (
                      <div 
                        key={day} 
                        onClick={() => setSelectedDay(dateObj)}
                        className={`aspect-square relative flex flex-col items-center justify-center rounded-2xl border transition-all cursor-pointer group/cell
                          ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 
                            isToday ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 
                            'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'}
                        `}
                      >
                        <span className={`text-[11px] font-black group-hover/cell:scale-110 transition-transform ${isSelected ? 'animate-in zoom-in-75' : ''}`}>
                          {day}
                        </span>
                        {dayAppointments.length > 0 && (
                          <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500 shadow-sm shadow-indigo-500/50'}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day's Detail List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Schedule for {selectedDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </h4>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black rounded uppercase">
                    {filteredAppointments.filter(a => a.date === `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`).length} Results
                  </span>
                </div>
                
                <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {filteredAppointments.filter(a => a.date === `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`).length > 0 ? (
                    filteredAppointments
                      .filter(a => a.date === `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`)
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((apt) => (
                        <div 
                          key={apt.id} 
                          className="p-4 bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-between group/apt cursor-pointer"
                          onClick={() => navigate(`/patient/${apt.patientId}`)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                              {apt.time}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white leading-none mb-1">{apt.patientName}</p>
                              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">{apt.type}</p>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-slate-600 group-hover/apt:text-white transition-colors" />
                        </div>
                      ))
                  ) : (
                    <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">No Events Logged for this Cycle</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button className="mt-auto w-full bg-white/10 border border-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] text-center block text-[10px] uppercase tracking-[0.2em]">
            Export Analytics
          </button>
        </div>
      </div>

      <div id="patient-list-section" className="lg:col-span-12 bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[3rem] p-10 flex flex-col hover:shadow-indigo-500/5 transition-all duration-700 overflow-hidden">
        <div className="flex flex-col gap-8 mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200 rotate-3 group-hover:rotate-0 transition-transform">
                <Users size={28} />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Patient Directory</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                   Unified Health Information Terminal
                 </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="px-5 py-2 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Nodes: {patients.length} Active
              </div>
            </div>
          </div>

          {/* New Prominent Search Bar */}
          <div className="relative group">
            <div className="absolute inset-x-0 -bottom-2 h-1 bg-gradient-to-r from-teal-500 via-indigo-600 to-violet-600 rounded-full opacity-20 group-focus-within:opacity-100 transition-opacity blur-sm"></div>
            <div className="relative flex items-center bg-slate-50 border-2 border-transparent focus-within:border-indigo-500/20 focus-within:bg-white rounded-[2rem] transition-all duration-500 shadow-inner group">
              <div className="pl-8 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Search size={24} />
              </div>
              <input 
                type="text" 
                placeholder="Query Patient Identity, MRN, or Diagnostic Protocol..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-6 pr-24 py-6 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300 placeholder:italic transition-all"
              />
              
              <div className="absolute right-6 flex items-center gap-3">
                {loading && searchTerm ? (
                  <Loader2 className="animate-spin text-indigo-600" size={20} />
                ) : searchTerm ? (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                  >
                    <Plus className="rotate-45" size={16} />
                  </button>
                ) : (
                  <div className="px-3 py-1 bg-slate-200 text-slate-400 text-[9px] font-black rounded-lg uppercase tracking-widest">
                    CMD + K
                  </div>
                )}
                <div className="w-px h-8 bg-slate-200"></div>
                <button className="p-3 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95 border border-slate-100">
                  <Filter size={20} />
                </button>
              </div>
            </div>

            {debouncedSearchTerm && debouncedSearchTerm.length >= 2 && (
              <div className="absolute -bottom-8 left-8">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-1">
                  Filtering results for: <span className="text-indigo-600 italic">"{debouncedSearchTerm}"</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-10 px-10">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-l-2xl">Patient / MRN</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Gender / Age</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Status</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="inline-block animate-spin h-10 w-10 border-t-2 border-indigo-600 rounded-full"></div>
                  </td>
                </tr>
              ) : patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id} className="group hover:scale-[1.01] transition-transform cursor-pointer" onClick={() => navigate(`/patient/${patient.id}`)}>
                    <td className="px-10 py-6 bg-white border-y border-l border-slate-100 rounded-l-[1.5rem] shadow-sm group-hover:shadow-indigo-500/5">
                      <div className="flex items-center gap-5">
                        {patient.photoURL ? (
                          <img src={patient.photoURL} className="w-12 h-12 rounded-[1rem] object-cover border-2 border-white shadow-xl" />
                        ) : (
                          <div className="w-12 h-12 rounded-[1rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg uppercase shadow-inner border border-indigo-100">
                            {patient.displayName?.charAt(0) || 'P'}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-black text-slate-800 leading-none mb-1 uppercase tracking-tight italic">{patient.displayName || 'UNNAMED'}</p>
                          <p className="text-[10px] text-slate-400 font-bold font-mono tracking-widest">ID: #{patient.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 bg-white border-y border-slate-100 hidden sm:table-cell">
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">{patient.medical?.gender || 'N/A'}</span>
                         <div className="w-px h-3 bg-slate-200"></div>
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{patient.medical?.age || '--'} YRS</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 bg-white border-y border-slate-100">
                       <span className="px-3 py-1.5 bg-green-50 text-green-700 text-[9px] font-black rounded-lg uppercase tracking-[0.2em] border border-green-100">Stable</span>
                    </td>
                    <td className="px-10 py-6 bg-white border-y border-r border-slate-100 rounded-r-[1.5rem] text-right">
                      <button 
                        className="p-3 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-xl shadow-sm transition-all active:scale-90"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="p-10 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Registry Vacuum Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-10 flex justify-center">
          <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-[0.3em] py-3 px-8 bg-indigo-50 rounded-2xl hover:bg-indigo-100">
            Expand Directory
          </button>
        </div>
      </div>

      <NewPrescriptionModal 
        isOpen={isPrescriptionModalOpen} 
        onClose={() => setIsPrescriptionModalOpen(false)} 
      />

      <ScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </div>
  );
}
