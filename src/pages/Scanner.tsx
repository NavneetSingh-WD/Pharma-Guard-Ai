import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { Camera, Upload, Loader2, ArrowLeft, Pill, Calendar, Hash, Clock, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Scanner() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dailyTimes, setDailyTimes] = useState<string[]>(['08:00']);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setExtractedData(null);
        setSaveSuccess(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      // We need a slight delay to ensure the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please ensure permissions are granted in your browser.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(dataUrl);
        setExtractedData(null);
        setSaveSuccess(false);
        stopCamera();
      }
    }
  };

  const normalizeExpiryDate = (rawDate: string) => {
    // Regex patterns to match common expiry date formats (e.g., MM/YY, MM/YYYY, MMM YYYY, DD/MM/YYYY)
    const patterns = [
      { regex: /^(\d{2})[\/\-](\d{2})$/, format: (m: string[]) => `20${m[2]}-${m[1]}-01` }, // MM/YY -> YYYY-MM-01
      { regex: /^(\d{2})[\/\-](\d{4})$/, format: (m: string[]) => `${m[2]}-${m[1]}-01` }, // MM/YYYY -> YYYY-MM-01
      { regex: /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, format: (m: string[]) => `${m[3]}-${m[2]}-${m[1]}` }, // DD/MM/YYYY -> YYYY-MM-DD
      { regex: /^([A-Za-z]{3})\s+(\d{4})$/, format: (m: string[]) => { // MMM YYYY -> YYYY-MM-01
          const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
          const month = months[m[1].toLowerCase()] || '01';
          return `${m[2]}-${month}-01`;
        }
      }
    ];

    const cleanDate = rawDate.trim().replace(/\s+/g, ' ');
    for (const { regex, format } of patterns) {
      const match = cleanDate.match(regex);
      if (match) {
        return format(match);
      }
    }
    
    // Fallback if no regex matches, return raw or attempt Date parse
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return rawDate; // Return raw if all fails
  };

  const analyzeLabel = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Extract the following information from this medicine label: Drug Name, Dosage, Expiry Date (raw text), and Batch Number. If a field is not found, return "Not Found".' }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              drugName: { type: Type.STRING },
              dosage: { type: Type.STRING },
              rawExpiryDate: { type: Type.STRING },
              batchNumber: { type: Type.STRING }
            },
            required: ['drugName', 'dosage', 'rawExpiryDate', 'batchNumber']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Apply Regex Normalization
      const normalizedDate = normalizeExpiryDate(result.rawExpiryDate);
      
      setExtractedData({
        ...result,
        expiryDate: normalizedDate
      });
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Failed to analyze the image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTime = () => setDailyTimes([...dailyTimes, '12:00']);
  const updateTime = (index: number, value: string) => {
    const newTimes = [...dailyTimes];
    newTimes[index] = value;
    setDailyTimes(newTimes);
  };
  const removeTime = (index: number) => {
    setDailyTimes(dailyTimes.filter((_, i) => i !== index));
  };

  const saveReminder = async () => {
    if (!currentUser || !extractedData) return;
    setIsSaving(true);
    
    try {
      const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');
      await addDoc(remindersRef, {
        drugName: extractedData.drugName,
        dosage: extractedData.dosage,
        batchNumber: extractedData.batchNumber,
        expiryDate: extractedData.expiryDate,
        dailyTimes: dailyTimes,
        createdAt: new Date().toISOString()
      });
      
      setSaveSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error saving reminder:", error);
      alert("Failed to save reminder.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-teal-300/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/20 mx-auto mb-4">
            <Camera size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Medicine Scanner</h1>
          <p className="text-slate-600">Extract drug details and set automated expiry & dosage reminders.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Capture Label</h2>
            
            <div className={`flex-1 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-2 transition-all overflow-hidden relative ${imagePreview || isCameraOpen ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 bg-slate-50'}`}>
              
              {isCameraOpen ? (
                <div className="relative w-full h-[400px] flex flex-col items-center justify-center bg-black rounded-[1.5rem] overflow-hidden group">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  
                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="w-64 h-48 border-2 border-teal-400/50 rounded-2xl relative">
                      {/* Scanning Line */}
                      <motion.div 
                        initial={{ top: '0%' }}
                        animate={{ top: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_rgba(45,212,191,0.8)]"
                      />
                      {/* Corners */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-500 rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-500 rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-500 rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-500 rounded-br-lg"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-20">
                    <button 
                      onClick={stopCamera}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white p-4 rounded-full shadow-lg hover:bg-rose-500 transition-all active:scale-90"
                    >
                      <X size={24} />
                    </button>
                    <button 
                      onClick={capturePhoto}
                      className="bg-teal-500 hover:bg-teal-400 text-white font-black px-10 py-4 rounded-full shadow-2xl shadow-teal-500/40 transition-all active:scale-95 text-lg uppercase tracking-wider"
                    >
                      Capture
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative w-full h-[300px] flex flex-col items-center justify-center p-4">
                  <motion.img 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={imagePreview} 
                    alt="Medicine Label" 
                    className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white mb-6" 
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsCameraOpen(true)}
                      className="text-xs font-bold text-teal-600 hover:underline uppercase tracking-widest"
                    >
                      Retake
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setExtractedData(null); }}
                      className="text-xs font-bold text-rose-500 hover:underline uppercase tracking-widest"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 w-full p-10">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button 
                      onClick={startCamera}
                      className="group bg-white border border-slate-100 hover:border-teal-500 hover:bg-teal-50 text-slate-800 font-bold py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <div className="p-4 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
                        <Camera size={32} />
                      </div>
                      <span className="text-sm uppercase tracking-widest">Live Scan</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="group bg-white border border-slate-100 hover:border-teal-500 hover:bg-teal-50 text-slate-800 font-bold py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <div className="p-4 bg-teal-100 text-teal-600 rounded-2xl group-hover:-rotate-6 transition-transform">
                        <Upload size={32} />
                      </div>
                      <span className="text-sm uppercase tracking-widest">Upload DB</span>
                    </button>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">OCR Protocol Active</p>
                    <p className="text-slate-400 text-[10px] max-w-[200px]">Ensure the medicine label is centered and illuminated for maximum extraction accuracy.</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>

            <button 
              onClick={analyzeLabel}
              disabled={!imagePreview || isAnalyzing}
              className="mt-6 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <><Loader2 size={20} className="animate-spin" /> Analyzing Label...</> : 'Analyze Label'}
            </button>
          </div>

          {/* Results Section */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Extracted Data & Reminders</h2>
            
            {!extractedData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Pill size={48} className="mb-4 opacity-50" />
                <p>Scan a label to see extracted details here.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                    <Pill className="text-teal-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Drug Name & Dosage</p>
                      <p className="text-slate-800 font-semibold">{extractedData.drugName}</p>
                      <p className="text-slate-600 text-sm">{extractedData.dosage}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                      <Calendar className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Expiry Date</p>
                        <p className="text-slate-800 font-semibold">{extractedData.expiryDate}</p>
                        <p className="text-xs text-slate-400 mt-1">Normalized via Regex</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                      <Hash className="text-indigo-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Batch No.</p>
                        <p className="text-slate-800 font-semibold">{extractedData.batchNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={16} className="text-teal-600" /> Daily Reminders
                    </h3>
                    <button onClick={addTime} className="text-xs text-teal-600 font-semibold hover:text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                      + Add Time
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dailyTimes.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={time}
                          onChange={(e) => updateTime(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        {dailyTimes.length > 1 && (
                          <button onClick={() => removeTime(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Expiry warnings will be automatically scheduled for 1 month and 2 months prior to <strong>{extractedData.expiryDate}</strong>.
                  </p>
                </div>

                <button 
                  onClick={saveReminder}
                  disabled={isSaving || saveSuccess}
                  className={`mt-auto w-full font-semibold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    saveSuccess 
                      ? 'bg-green-500 text-white shadow-green-500/20' 
                      : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20 active:scale-[0.98]'
                  }`}
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : saveSuccess ? <><CheckCircle2 size={20} /> Saved Successfully</> : 'Save Medication & Set Reminders'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
