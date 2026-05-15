# PHARMA-GUARD Project Report

## 1. Project Overview
**PHARMA-GUARD** is an elite, full-stack health-tech application designed for drug safety, telemedicine, and multi-role healthcare management. It utilizes a multi-tenant architecture to connect Patients, Doctors, and Pharmacists, prioritizing patient safety, clinical interoperability, and intelligent data processing.

## 2. Technical Stack
- **Frontend:** React 18+, Vite, TypeScript, Tailwind CSS.
- **Backend:** Express (Node.js), Socket.io (Real-time signaling).
- **Database & Auth:** Firebase Authentication (RBAC), Cloud Firestore.
- **AI Engine:** Google Gemini 3 Flash (for Safety Analysis and OCR).
- **Communication:** WebRTC (Peer-to-Peer Video/Audio).
- **UI Architecture:** Bento Grid layout, Glassmorphism, Responsive Mobile-first design.

## 3. Core System Modules

### A. Multi-Role CRM & RBAC
- **Strict Role-Based Access Control:** Distinct portals for Patients, Doctors, and Pharmacists.
- **Patient Portal:** Comprehensive medical profile (Age, Weight, Allergies, Conditions).
- **Doctor CRM:** 360-degree patient view, E-Prescribing, and schedule management.
- **Pharmacist PMS:** Inventory tracking with FEFO (First Expired, First Out) logic and Generic Substitution recommendations.

### B. Safety Engine (AI-Powered)
- **Clinical DDI Check:** Cross-references medication intake against patient profile and current meds.
- **Structured Safety Reports:** Generates risk assessments, immediate guidance, red-flag triggers, and escalation instructions.
- **Pediatric Safety:** Mathematical mg/kg dosage calculator with pediatric-specific safety cross-checks.

### C. Telemedicine & Virtual Consultations
- **Real-Time Video/Audio:** WebRTC-powered virtual visits.
- **Emergency SOS Console:** High-priority signal broadcast allowing doctors to intercept critical emergency requests.
- **Integrated Chat:** Concurrent chat during video calls for document and prescription sharing.

### D. Computer Vision & OCR
- **Medication Scanning:** Fast extraction of drug name, dosage, and expiry dates from label images.
- **Regex Normalization:** Deterministic processing of varied expiry date formats.
- **Automated Reminders:** Self-scheduling push alerts for medication expiry (1 and 2 months prior) and daily dosage times.

### E. Emergency Logistics
- **Pharmacy Locator:** Real-time inventory and pricing map view.
- **Dispatch Integration:** Mock integration patterns for ambulance dispatch and GPS transmission.
- **Bed Availability:** Query systems for hospital bed tracking (FHIR/UHI patterns).

## 4. Design Philosophy
The application follows a "Technical Clinical" aesthetic, using soft blue/green palettes to reduce anxiety while maintaining a high-density, professional UI. The Bento grid ensures that complex medical data stays organized and scannable.

## 5. Security & Compliance
- **Server-Side API Proxying:** All sensitive API keys (Gemini) are kept server-side to prevent exposure.
- **Data Invariants:** Strict clinical formats for risk assessment outputs.
- **Identity Integrity:** Profile-locked safety analysis ensures guidance is personalized and verified.
