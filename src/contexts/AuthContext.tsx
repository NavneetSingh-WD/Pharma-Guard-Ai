import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin' | 'unassigned';
  status: 'active' | 'pending' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface PatientData {
  age?: number;
  dob?: string;
  weightKg?: number;
  gender?: string;
  medicalConditions?: string[];
  knownAllergies?: string[];
  currentMedications?: string[];
}

export interface ProfessionalData {
  licenseNumber?: string;
  verificationDocUrl?: string;
  specialization?: string;
  pharmacyName?: string;
  address?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  patientData: PatientData | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updatePatientData: (data: Partial<PatientData>) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateProfessionalData: (role: 'doctor' | 'pharmacist', data: Partial<ProfessionalData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        let profile: UserProfile;
        
        if (docSnap.exists()) {
          profile = docSnap.data() as UserProfile;
          // Force Admin upgrade for specific email if not already set
          if (user.email === 'goyalelectrocare@gmail.com' && profile.role !== 'admin') {
            profile.role = 'admin';
            profile.status = 'active';
            await updateDoc(docRef, { role: 'admin', status: 'active' });
          }
          setUserProfile(profile);
        } else {
          // Bootstrap admin for specific email
          const isAdmin = user.email === 'goyalelectrocare@gmail.com';
          
          // Create initial profile
          profile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: isAdmin ? 'admin' : 'unassigned', 
            status: isAdmin ? 'active' : 'active', // Patients are active by default, professionals will be pending
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, profile);
          setUserProfile(profile);
        }
        
        // If patient, fetch patient data
        if (profile.role === 'patient' || profile.role === 'admin') {
          const patientRef = doc(db, 'patients', user.uid);
          const patientSnap = await getDoc(patientRef);
          if (patientSnap.exists()) {
            setPatientData(patientSnap.data() as PatientData);
          } else if (profile.role === 'patient') {
            const initialPatientData = { updatedAt: new Date().toISOString() };
            await setDoc(patientRef, initialPatientData);
            setPatientData(initialPatientData);
          }
        }
        
      } else {
        setUserProfile(null);
        setPatientData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sync patient data if role changes to patient dynamically
  useEffect(() => {
    async function syncPatientData() {
      if (currentUser && userProfile?.role === 'patient' && !patientData) {
        const patientRef = doc(db, 'patients', currentUser.uid);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          setPatientData(patientSnap.data() as PatientData);
        }
      }
    }
    syncPatientData();
  }, [userProfile?.role, currentUser]);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  const updatePatientData = async (data: Partial<PatientData>) => {
    if (!currentUser) return;
    const docRef = doc(db, 'patients', currentUser.uid);
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(docRef, updatedData, { merge: true });
    setPatientData((prev) => ({ ...(prev || {}), ...updatedData }));
  };

  const updateProfessionalData = async (role: 'doctor' | 'pharmacist', data: Partial<ProfessionalData>) => {
    if (!currentUser) return;
    const collectionName = role === 'doctor' ? 'doctors' : 'pharmacies';
    const docRef = doc(db, collectionName, currentUser.uid);
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(docRef, updatedData, { merge: true });
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(docRef, updatedData, { merge: true });
    setUserProfile((prev) => ({ ...(prev || {}), ...updatedData } as UserProfile));
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      patientData, 
      loading, 
      loginWithGoogle, 
      logout, 
      updatePatientData, 
      updateUserProfile,
      updateProfessionalData 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
