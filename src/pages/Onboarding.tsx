import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Activity, AlertTriangle, Pill, Stethoscope, Store, MapPin } from 'lucide-react';

export default function Onboarding() {
  const { userProfile, patientData, updatePatientData, updateUserProfile, updateProfessionalData } = useAuth();
  const navigate = useNavigate();
  
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'pharmacist' | null>(
    userProfile?.role !== 'unassigned' ? (userProfile?.role as any) : null
  );
  
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    dob: patientData?.dob || '',
    age: patientData?.age || '',
    weightKg: patientData?.weightKg || '',
    gender: patientData?.gender || 'Prefer not to say',
    medicalConditions: patientData?.medicalConditions?.join(', ') || '',
    knownAllergies: patientData?.knownAllergies?.join(', ') || '',
    currentMedications: patientData?.currentMedications?.join(', ') || '',
    // Professional specific
    licenseNumber: '',
    specialization: '',
    pharmacyName: '',
    address: '',
    verificationDocUrl: '' // Simulated as a string/file path
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Always update display name if changed
      if (formData.displayName !== userProfile?.displayName) {
        await updateUserProfile({ displayName: formData.displayName });
      }

      if (selectedRole === 'patient') {
        if (userProfile?.role === 'unassigned') {
          await updateUserProfile({ role: 'patient', status: 'active' });
        }
        await updatePatientData({
          dob: formData.dob,
          age: Number(formData.age),
          weightKg: Number(formData.weightKg),
          gender: formData.gender,
          medicalConditions: formData.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
          knownAllergies: formData.knownAllergies.split(',').map(s => s.trim()).filter(Boolean),
          currentMedications: formData.currentMedications.split(',').map(s => s.trim()).filter(Boolean),
        });
      } else if (selectedRole === 'doctor' || selectedRole === 'pharmacist') {
        // Only set status to pending if they aren't already active (first time registration)
        const newStatus = userProfile?.status === 'active' ? 'active' : 'pending';
        
        await updateUserProfile({ role: selectedRole, status: newStatus });
        await updateProfessionalData(selectedRole, {
          licenseNumber: formData.licenseNumber,
          verificationDocUrl: formData.verificationDocUrl || 'https://demo-id-card-url.com/id.jpg',
          specialization: formData.specialization,
          pharmacyName: formData.pharmacyName,
          address: formData.address
        });
      }
      navigate('/');
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user has an active professional role to pre-fill verification data if needed
    // But don't redirect away so they can edit
  }, [userProfile?.role]);

  if (userProfile?.role === 'unassigned' && !selectedRole) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent"></div>
        <div className="relative z-10 w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 md:p-10 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 font-black italic tracking-tighter uppercase italic">Pharma-Guard Gateway</h1>
          <p className="text-slate-500 mb-12 font-bold uppercase text-[10px] tracking-[0.2em]">Select your operational role to initialize protocol</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => setSelectedRole('patient')}
              className="group flex flex-col items-center p-10 bg-white hover:bg-teal-50 border-2 border-slate-100 hover:border-teal-200 rounded-[2.5rem] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              <div className="w-20 h-20 bg-teal-600 text-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-teal-600/30 group-hover:rotate-6 transition-transform">
                <User size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3 uppercase italic tracking-tighter">Patient</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Medical Profile, Safety Engine & Telemedicine</p>
            </button>

            <button 
              onClick={() => setSelectedRole('doctor')}
              className="group flex flex-col items-center p-10 bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 rounded-[2.5rem] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              <div className="w-20 h-20 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-600/30 group-hover:rotate-6 transition-transform">
                <Stethoscope size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3 uppercase italic tracking-tighter">Doctor</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Clinical CRM, E-Scripts & Video Consultations</p>
            </button>

            <button 
              onClick={() => setSelectedRole('pharmacist')}
              className="group flex flex-col items-center p-10 bg-white hover:bg-amber-50 border-2 border-slate-100 hover:border-amber-200 rounded-[2.5rem] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              <div className="w-20 h-20 bg-amber-500 text-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-amber-500/30 group-hover:rotate-6 transition-transform">
                <Store size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3 uppercase italic tracking-tighter">Pharmacist</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Inventory, Substitute Engine & PMS</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Common Header for both Patient and Professional Forms
  const FormHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="mb-10 text-center">
      <h1 className="text-4xl font-black text-slate-800 mb-3 tracking-tighter uppercase italic">{title}</h1>
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{subtitle}</p>
    </div>
  );

  if (selectedRole === 'doctor' || selectedRole === 'pharmacist') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent"></div>
        <div className="relative z-10 w-full max-w-2xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-[3rem] p-8 md:p-12">
          <FormHeader 
            title="Credential Verification" 
            subtitle={`Initialize ${selectedRole} Account (Subject to Admin Review)`} 
          />

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Official Name</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                  <input 
                    type="text" 
                    name="displayName"
                    required
                    value={formData.displayName} 
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                    placeholder="Enter your full clinical name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Medical License Number</label>
                <div className="relative group">
                  <Pill className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                  <input 
                    type="text" 
                    name="licenseNumber" 
                    required 
                    value={formData.licenseNumber} 
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                    placeholder="e.g. LIC-99283-MED"
                  />
                </div>
              </div>

              {selectedRole === 'doctor' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Clinical Specialization</label>
                  <div className="relative group">
                    <Stethoscope className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                    <input 
                      type="text" 
                      name="specialization" 
                      required 
                      value={formData.specialization} 
                      onChange={handleChange}
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                      placeholder="e.g. Cardiologist"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pharmacy Name</label>
                  <div className="relative group">
                    <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                    <input 
                      type="text" 
                      name="pharmacyName" 
                      required 
                      value={formData.pharmacyName} 
                      onChange={handleChange}
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                      placeholder="e.g. Central Drugs Ltd."
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Practice Address</label>
                <div className="relative group">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                  <input 
                    type="text" 
                    name="address" 
                    required 
                    value={formData.address} 
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                    placeholder="Physical location of clinic/pharmacy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Upload ID / Medical License</label>
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-400 hover:bg-white transition-all">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                    <Activity size={28} />
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-1">Click to upload credentials</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supports PDF, PNG, JPG (Max 5MB)</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFormData({ ...formData, verificationDocUrl: 'selected_file.jpg' });
                      }
                    }}
                  />
                  {formData.verificationDocUrl && (
                    <div className="mt-4 px-4 py-1.5 bg-green-100 text-green-700 text-[10px] font-black rounded-lg uppercase tracking-widest">
                      Document Attached
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                By submitting, you consent to our automated and manual vetting process. {userProfile?.status === 'active' ? 'Existing verification remains valid.' : 'Access will be granted after review.'}
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || !formData.licenseNumber}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] italic"
            >
              {loading ? 'Processing...' : (userProfile?.status === 'active' ? 'Update Clinical Profile' : 'Initialize Verification')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-100/50 to-transparent"></div>
      <div className="relative z-10 w-full max-w-2xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-[3rem] p-8 md:p-12">
        <FormHeader 
          title="Clinical Archetype" 
          subtitle="Configure Global Patient Identity for Safety Protocols" 
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Full Patient Name</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-teal-600" size={20} />
              <input 
                type="text" 
                name="displayName"
                required
                value={formData.displayName} 
                onChange={handleChange}
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-sm font-bold text-slate-800 outline-none"
                placeholder="Enter patient full name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">DOB</label>
              <input 
                type="date" 
                name="dob"
                required
                value={formData.dob} 
                onChange={handleChange}
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-xs font-bold text-slate-800 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Age</label>
              <input 
                type="number" 
                name="age" 
                required 
                min="0"
                max="150"
                value={formData.age} 
                onChange={handleChange}
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-xs font-bold text-slate-800 outline-none"
                placeholder="Years"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Weight (kg)</label>
              <input 
                type="number" 
                name="weightKg" 
                required 
                min="0"
                max="500"
                step="0.1"
                value={formData.weightKg} 
                onChange={handleChange}
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-xs font-bold text-slate-800 outline-none"
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Gender</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange}
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-xs font-bold text-slate-800 outline-none appearance-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Medical Conditions</label>
            <textarea 
              name="medicalConditions" 
              value={formData.medicalConditions} 
              onChange={handleChange}
              rows={2}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-sm font-bold text-slate-800 outline-none resize-none"
              placeholder="e.g. Hypertension, Diabetes"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Known Allergies</label>
            <textarea 
              name="knownAllergies" 
              value={formData.knownAllergies} 
              onChange={handleChange}
              rows={2}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-rose-500/20 transition-all text-sm font-bold text-slate-800 outline-none resize-none"
              placeholder="e.g. Penicillin, Peanuts"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Current Medications</label>
            <textarea 
              name="currentMedications" 
              value={formData.currentMedications} 
              onChange={handleChange}
              rows={2}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-teal-500/20 transition-all text-sm font-bold text-slate-800 outline-none resize-none"
              placeholder="e.g. Lisinopril 10mg"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-70 uppercase tracking-[0.2em] italic"
          >
            {loading ? 'Initializing Protocol...' : 'Finalize Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
