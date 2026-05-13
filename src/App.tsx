/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { currentUser, userProfile, patientData } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" />;
  
  // If user hasn't completed onboarding, redirect to onboarding
  if (userProfile?.role === 'unassigned') {
    return <Navigate to="/onboarding" />;
  }
  
  if (userProfile?.role === 'patient' && (!patientData || !patientData.age || !patientData.weightKg)) {
    return <Navigate to="/onboarding" />;
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
