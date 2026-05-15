import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing. Please ensure it is set in the environment secrets.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

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
    const { query, lat, lng } = req.query;
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    // Dynamic region detection for mock data
    const isIndia = latitude > 8 && latitude < 37 && longitude > 68 && longitude < 97;
    
    // In a real app, this would query a pharmacy aggregator API
    const MOCK_RESULTS = isIndia ? [
      {
        id: '1',
        name: 'Apollo Pharmacy',
        distance: '0.5 km',
        address: 'MG Road, New Delhi, India',
        isOpen: true,
        currency: '₹',
        stock: [
          { type: 'Brand', name: 'Calpol 500', composition: 'Paracetamol 500mg', price: 15.50, expiryDate: '2027-05-01', inStock: true },
          { type: 'Generic', name: 'Paracet 500', composition: 'Paracetamol 500mg', price: 9.00, expiryDate: '2026-11-15', inStock: true }
        ]
      },
      {
        id: '2',
        name: 'Wellness Forever',
        distance: '1.8 km',
        address: 'Hauz Khas, New Delhi, India',
        isOpen: true,
        currency: '₹',
        stock: [
          { type: 'Brand', name: 'Dolo 650', composition: 'Paracetamol 650mg', price: 30.00, expiryDate: '2027-02-20', inStock: true },
          { type: 'Generic', name: 'Acetaminophen 650', composition: 'Paracetamol 650mg', price: 12.00, expiryDate: '2028-01-10', inStock: true }
        ]
      },
      {
        id: '3',
        name: 'MedPlus Pharmacy',
        distance: '3.2 km',
        address: 'Saket, New Delhi, India',
        isOpen: false,
        currency: '₹',
        stock: [
          { type: 'Generic', name: 'P-500 Oral Suspension', composition: 'Paracetamol 500mg/5ml', price: 25.00, expiryDate: '2026-08-30', inStock: true }
        ]
      }
    ] : [
      {
        id: '1',
        name: 'City Health Pharmacy',
        distance: '0.8 miles',
        address: '123 Main St, San Francisco, CA',
        isOpen: true,
        currency: '$',
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
        currency: '$',
        stock: [
          { type: 'Brand', name: 'Tylenol Extra Strength', composition: 'Paracetamol 500mg', price: 9.49, expiryDate: '2027-02-20', inStock: false },
          { type: 'Generic', name: 'Acetaminophen 500mg', composition: 'Paracetamol 500mg', price: 4.99, expiryDate: '2028-01-10', inStock: true }
        ]
      }
    ];
    
    res.json({ results: MOCK_RESULTS });
  });

  // Mock API: Emergency Dispatch
  app.post("/api/emergency/dispatch", (req, res) => {
    const { lat, lng, profile } = req.body;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const isIndia = latitude > 8 && latitude < 37 && longitude > 68 && longitude < 97;
    const locStr = isIndia 
      ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (New Delhi, India)`
      : `${latitude.toFixed(4)}° N, ${Math.abs(longitude).toFixed(4)}° W (Regional Command)`;

    // In a real app, this would integrate with an ambulance dispatch system
    res.json({ 
      success: true, 
      eta: isIndia ? "12 Minutes" : "8 Minutes", 
      location: locStr,
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

  // --- NEW: DDI & Structured Overdose Safety Engine (AI Powered) ---
  app.post("/api/safety/evaluate", async (req, res) => {
    const { query, patientProfile } = req.body;
    
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are an elite clinical pharmacologist AI. You must evaluate dosage, potential overdose, or interactions based on the provided patient profile and their intake query. You MUST strictly output JSON with the following keys: riskAssessment (array of strings), immediateGuidance (array of strings), redFlagTrigger (array of strings), escalationInstruction (array of strings). Provide specific, medically validated guidance."
        },
        contents: `
        PATIENT PROFILE:
        Age: ${patientProfile.age}
        Weight: ${patientProfile.weightKg}kg
        Gender: ${patientProfile.gender}
        Conditions: ${patientProfile.medicalConditions?.join(', ') || 'None'}
        Allergies: ${patientProfile.knownAllergies?.join(', ') || 'None'}
        Current Meds: ${patientProfile.currentMedications?.join(', ') || 'None'}

        INTAKE QUERY: "${query}"

        Analyze the safety risk and provide a structured report.
      `
      });

      const responseText = response.text || "";
      // Remove any markdown code blocks if present
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const evaluation = JSON.parse(cleanJson);

      res.json({ evaluation });
    } catch (err: any) {
      console.error("Gemini Evaluation Error:", err);
      res.status(500).json({ 
        error: "Failed to process clinical safety evaluation",
        details: err?.message || String(err)
      });
    }
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

  // --- NEW: OCR Medicine Label Scanning ---
  app.post("/api/scanner/analyze", async (req, res) => {
    const { image, mimeType } = req.body;
    
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: image,
              mimeType: mimeType
            }
          },
          "Extract the following information from this medicine label. You MUST output strictly valid JSON. If a field is not found, return 'Not Found'.\n\nRequired JSON format:\n{\n  \"drugName\": \"Name of the medicine\",\n  \"dosage\": \"Dosage strength (e.g. 500mg)\",\n  \"expiryDate\": \"The raw expiry date text EXACTLY as printed on the label\",\n  \"batchNumber\": \"The batch or lot number\",\n  \"usageInfo\": \"Detailed usage instructions and frequency extracted from the label\",\n  \"sideEffects\": \"Common side effects mentioned on the label or packaging\",\n  \"precautions\": \"Key precautions, warnings, or storage instructions (e.g. 'Keep away from children', 'Store in a cool dry place')\"\n}"
        ]
      });

      const responseText = response.text || "";
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const extractedData = JSON.parse(cleanJson);

      res.json({ extractedData });
    } catch (err: any) {
      console.error("OCR Analysis Error:", err);
      res.status(500).json({ 
        error: "Failed to analyze medicine label",
        details: err?.message || String(err)
      });
    }
  });

  // --- NEW: AI Generic Substitution Engine ---
  app.post("/api/pharmacist/substitution", async (req, res) => {
    const { brandName } = req.body;
    
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a clinical pharmacologist. Suggest a cost-effective generic alternative for the given brand-name medicine. Provide the generic name, composition details, and estimated savings percentage. Output strictly valid JSON."
        },
        contents: `Find generic alternative for brand: "${brandName}".\nFormat: { "genericName": "...", "composition": "...", "savings": "..." }`
      });

      const responseText = response.text || "";
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const subData = JSON.parse(cleanJson);

      res.json({ subData });
    } catch (err: any) {
      console.error("Substitution API Error:", err);
      res.status(500).json({ error: "Failed to fetch substitution data" });
    }
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
