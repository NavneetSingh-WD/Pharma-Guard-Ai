import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "PHARMA-GUARD Backend is running" });
  });

  // Mock API: Pharmacy Locator
  app.get("/api/pharmacies", (req, res) => {
    const { query } = req.query;
    // In a real app, this would query a pharmacy aggregator API
    const MOCK_RESULTS = [
      {
        id: '1',
        name: 'City Health Pharmacy',
        distance: '0.8 miles',
        address: '123 Main St, San Francisco, CA',
        isOpen: true,
        stock: [
          { type: 'Brand', name: 'Tylenol Extra Strength', composition: 'Paracetamol 500mg', price: 8.99, expiryDate: '2027-05-01', inStock: true },
          { type: 'Generic', name: 'Acetaminophen 500mg', composition: 'Paracetamol 500mg', price: 3.49, expiryDate: '2026-11-15', inStock: true }
        ]
      },
      {
        id: '2',
        name: 'Walgreens Pharmacy',
        distance: '1.2 miles',
        address: '456 Market St, San Francisco, CA',
        isOpen: true,
        stock: [
          { type: 'Brand', name: 'Tylenol Extra Strength', composition: 'Paracetamol 500mg', price: 9.49, expiryDate: '2027-02-20', inStock: false },
          { type: 'Generic', name: 'Acetaminophen 500mg', composition: 'Paracetamol 500mg', price: 4.99, expiryDate: '2028-01-10', inStock: true }
        ]
      },
      {
        id: '3',
        name: 'Neighborhood Care Rx',
        distance: '2.5 miles',
        address: '789 Mission St, San Francisco, CA',
        isOpen: false,
        stock: [
          { type: 'Generic', name: 'Acetaminophen 500mg', composition: 'Paracetamol 500mg', price: 2.99, expiryDate: '2026-08-30', inStock: true }
        ]
      }
    ];
    
    res.json({ results: MOCK_RESULTS });
  });

  // Mock API: Emergency Dispatch
  app.post("/api/emergency/dispatch", (req, res) => {
    const { lat, lng, profile } = req.body;
    // In a real app, this would integrate with an ambulance dispatch system
    res.json({ 
      success: true, 
      eta: "8 Minutes", 
      location: "37.7749° N, 122.4194° W (San Francisco, CA)",
      dispatchId: `DSP-${Math.floor(Math.random() * 10000)}`
    });
  });

  // Mock API: Hospital Beds
  app.get("/api/emergency/beds", (req, res) => {
    // In a real app, this would query HL7 FHIR or UHI APIs
    const MOCK_HOSPITALS = [
      {
        id: '1',
        name: 'City General Hospital',
        distance: '2.4 miles',
        beds: { icu: 4, general: 12 }
      },
      {
        id: '2',
        name: 'Mercy Medical Center',
        distance: '3.8 miles',
        beds: { icu: 0, general: 5 }
      }
    ];
    res.json({ hospitals: MOCK_HOSPITALS });
  });

  // --- NEW: DDI & Structured Overdose Safety Engine ---
  app.post("/api/safety/evaluate", (req, res) => {
    const { drug, amount, strength, timeframeHours } = req.body;
    
    // Example logic based on the strict clinical format requested
    const totalMg = amount * strength;
    
    let riskAssessment = "Dose within standard therapeutic limits.";
    let immediateGuidance = "Continue as prescribed. Do not exceed daily limits.";
    let redFlagTrigger = "If total intake exceeds maximum daily allowance or combined with contraindications.";
    let escalationInstruction = "Seek medical evaluation if adverse symptoms develop.";

    // Specific logic for Paracetamol/Acetaminophen
    if (drug.toLowerCase().includes("paracetamol") || drug.toLowerCase().includes("acetaminophen")) {
      if (totalMg >= 3000 && timeframeHours <= 4) {
        riskAssessment = "Dose exceeds standard single-dose recommendation. Within daily maximum but taken in a short interval.";
        immediateGuidance = "Do not take any additional paracetamol. Monitor for symptoms.";
        redFlagTrigger = "If total intake exceeds 4 g within 24 hours. If patient is underweight, has liver disease, or consumes alcohol.";
        escalationInstruction = "Seek medical evaluation if any red-flag condition applies. Go to emergency services immediately if severe symptoms develop.";
      } else if (totalMg > 4000) {
        riskAssessment = "CRITICAL: Dose exceeds maximum daily allowance (4g). High risk of hepatotoxicity.";
        immediateGuidance = "Do NOT take any more medication. Contact poison control immediately.";
        redFlagTrigger = "Any signs of nausea, vomiting, or abdominal pain.";
        escalationInstruction = "Go to emergency services IMMEDIATELY. Require N-acetylcysteine (NAC) evaluation.";
      }
    }

    res.json({
      input: `I took ${amount} tablets of ${strength} mg ${drug} in ${timeframeHours} hours.`,
      evaluation: {
        riskAssessment,
        immediateGuidance,
        redFlagTrigger,
        escalationInstruction
      }
    });
  });

  // --- NEW: Pediatric Dose Calculator ---
  app.post("/api/safety/pediatric-dose", (req, res) => {
    const { weightKg, ageMonths, drug } = req.body;
    
    let recommendedDose = "";
    let frequency = "";
    let warning = "";

    if (drug.toLowerCase().includes("paracetamol") || drug.toLowerCase().includes("acetaminophen")) {
      // Standard pediatric dose: 10-15 mg/kg per dose
      const minDose = Math.round(weightKg * 10);
      const maxDose = Math.round(weightKg * 15);
      recommendedDose = `${minDose}mg - ${maxDose}mg`;
      frequency = "Every 4-6 hours (Max 4 doses in 24h)";
      warning = "Do not exceed 60mg/kg/day. Ensure you are using pediatric suspension concentration correctly.";
    } else if (drug.toLowerCase().includes("amoxicillin")) {
      // Standard pediatric dose: 40-90 mg/kg/day divided every 8-12 hours
      const dailyMin = Math.round(weightKg * 40);
      const dailyMax = Math.round(weightKg * 90);
      recommendedDose = `${Math.round(dailyMin/2)}mg - ${Math.round(dailyMax/2)}mg`;
      frequency = "Every 12 hours";
      warning = "Complete the full course of antibiotics even if symptoms improve.";
    } else {
      recommendedDose = "Consult physician for specific dosing.";
      warning = "Drug not recognized in pediatric safety database.";
    }

    res.json({
      weightKg,
      ageMonths,
      drug,
      recommendedDose,
      frequency,
      warning,
      isPediatric: true
    });
  });

  // --- NEW: WebRTC Signaling & Chat (Socket.io) ---
  io.on("connection", (socket) => {
    console.log("User connected to Telemedicine Hub:", socket.id);

    // Join a specific consultation room
    socket.on("join-room", (roomId, userId) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-connected", userId);

      socket.on("disconnect", () => {
        socket.to(roomId).emit("user-disconnected", userId);
      });
    });

    // WebRTC Signaling
    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", payload);
    });
    
    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", payload);
    });
    
    socket.on("ice-candidate", (incoming) => {
      io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });

    // Real-time Chat
    socket.on("send-message", (roomId, message) => {
      io.to(roomId).emit("receive-message", message);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
