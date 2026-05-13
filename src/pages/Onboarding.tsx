import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Activity, AlertTriangle, Pill, Stethoscope, Store } from 'lucide-react';

export default function Onboarding() {
  const { userProfile, patientData, updatePatientData, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'pharmacist' | null>(
    userProfile?.role !== 'unassigned' ? (userProfile?.role as any) : null
  );
  
  const [formData, setFormData] = useState({
    age: patientData?.age || '',
    weightKg: patientData?.weightKg || '',
    gender: patientData?.gender || 'Prefer not to say',
    medicalConditions: patientData?.medicalConditions?.join(', ') || '',
    knownAllergies: patientData?.knownAllergies?.join(', ') || '',
    currentMedications: patientData?.currentMedications?.join(', ') || ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (userProfile?.role === 'unassigned' && selectedRole) {
        await updateUserProfile({ role: selectedRole });
      }

      if (selectedRole === 'patient') {
        await updatePatientData({
          age: Number(formData.age),
          weightKg: Number(formData.weightKg),
          gender: formData.gender,
          medicalConditions: formData.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
          knownAllergies: formData.knownAllergies.split(',').map(s => s.trim()).filter(Boolean),
          currentMedications: formData.currentMedications.split(',').map(s => s.trim()).filter(Boolean),
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
    if (userProfile?.role && userProfile.role !== 'unassigned' && userProfile.role !== 'patient') {
      navigate('/');
    }
  }, [userProfile?.role, navigate]);

  if (userProfile?.role === 'unassigned' && !selectedRole) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent"></div>
        <div className="relative z-10 w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 md:p-10 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to PHARMA-GUARD</h1>
          <p className="text-slate-500 mb-8">Please select your role to continue setting up your account.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => setSelectedRole('patient')}
              className="flex flex-col items-center p-8 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-2xl transition-all"
            >
              <div className="w-16 h-16 bg-teal-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-teal-600/30">
                <User size={32} />
              </div>
              <h2 className="text-xl font-bold text-teal-900 mb-2">Patient</h2>
              <p className="text-sm text-teal-700/80">Access your medical profile, drug safety engine, and telemedicine.</p>
            </button>

            <button 
              onClick={async () => {
                setLoading(true);
                await updateUserProfile({ role: 'doctor' });
                navigate('/');
              }}
              disabled={loading}
              className="flex flex-col items-center p-8 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl transition-all"
            >
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/30">
                <Stethoscope size={32} />
              </div>
              <h2 className="text-xl font-bold text-indigo-900 mb-2">Doctor</h2>
              <p className="text-sm text-indigo-700/80">Manage patients, schedule consults, and e-prescribe.</p>
            </button>

            <button 
              onClick={async () => {
                setLoading(true);
                await updateUserProfile({ role: 'pharmacist' });
                navigate('/');
              }}
              disabled={loading}
              className="flex flex-col items-center p-8 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl transition-all"
            >
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                <Store size={32} />
              </div>
              <h2 className="text-xl font-bold text-amber-900 mb-2">Pharmacist</h2>
              <p className="text-sm text-amber-700/80">Manage inventory, generic substitutions, and fulfill prescriptions.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedRole !== 'patient') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-100/50 to-transparent"></div>

      <div className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Complete Your Medical Profile</h1>
          <p className="text-slate-500">This data is used globally for drug safety checks and pediatric dosage calculations.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-teal-600" /> Age
              </label>
              <input 
                type="number" 
                name="age" 
                required 
                min="0"
                max="150"
                value={formData.age} 
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Years"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity size={16} className="text-teal-600" /> Weight (kg)
              </label>
              <input 
                type="number" 
                name="weightKg" 
                required 
                min="0"
                max="500"
                step="0.1"
                value={formData.weightKg} 
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-teal-600" /> Gender
              </label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={16} className="text-teal-600" /> Medical Conditions
            </label>
            <textarea 
              name="medicalConditions" 
              value={formData.medicalConditions} 
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="e.g. Hypertension, Diabetes (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Known Allergies
            </label>
            <textarea 
              name="knownAllergies" 
              value={formData.knownAllergies} 
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="e.g. Penicillin, Peanuts (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Pill size={16} className="text-teal-600" /> Current Medications
            </label>
            <textarea 
              name="currentMedications" 
              value={formData.currentMedications} 
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="e.g. Lisinopril 10mg, Metformin 500mg (comma separated)"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Saving Profile...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
