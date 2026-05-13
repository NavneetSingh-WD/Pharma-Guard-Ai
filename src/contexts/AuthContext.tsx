import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin' | 'unassigned';
  createdAt: string;
  updatedAt?: string;
}

export interface PatientData {
  age?: number;
  weightKg?: number;
  gender?: string;
  medicalConditions?: string[];
  knownAllergies?: string[];
  currentMedications?: string[];
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
          setUserProfile(profile);
        } else {
          // Create initial profile
          profile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: 'unassigned', // Default role
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, profile);
          setUserProfile(profile);
        }
        
        // If patient, fetch patient data
        if (profile.role === 'patient') {
          const patientRef = doc(db, 'patients', user.uid);
          const patientSnap = await getDoc(patientRef);
          if (patientSnap.exists()) {
            setPatientData(patientSnap.data() as PatientData);
          } else {
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
    setPatientData((prev) => prev ? { ...prev, ...updatedData } : null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(docRef, updatedData, { merge: true });
    setUserProfile((prev) => prev ? { ...prev, ...updatedData } : null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, patientData, loading, loginWithGoogle, logout, updatePatientData, updateUserProfile }}>
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
