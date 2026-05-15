import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Camera, Upload, Loader2, ArrowLeft, Pill, Calendar, Hash, Clock, AlertTriangle, CheckCircle2, X, Info, ShieldAlert, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

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

  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualData, setManualData] = useState({
    drugName: '',
    dosage: '',
    expiryDate: '',
    batchNumber: '',
    usageInfo: '',
    sideEffects: '',
    precautions: ''
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleManualSave = () => {
    if (!manualData.drugName || !manualData.dosage) {
      alert("Please enter at least drug name and dosage.");
      return;
    }
    setExtractedData(manualData);
    setIsManualEntry(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle stream binding
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

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
      { regex: /^(\d{2})[\/\-](\d{2})$/, format: (m: string[]) => `20${m[2]}-${m[1]}-01` }, // MM/YY -> YYYY-MM-01 (duplicate removal later if needed)
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
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1];

      const res = await fetch('/api/scanner/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType })
      });

      const data = await res.json();
      
      if (!data.extractedData) {
        throw new Error(data.error || "Failed to analyze label");
      }

      const result = data.extractedData;
      
      // Apply Regex Normalization
      const normalizedDate = normalizeExpiryDate(result.rawExpiryDate || result.expiryDate || "");
      
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
        usageInfo: extractedData.usageInfo || 'Not Extracted',
        sideEffects: extractedData.sideEffects || 'Not Extracted',
        precautions: extractedData.precautions || 'Not Extracted',
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
    <Layout>
      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
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
                      onClick={startCamera}
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
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <button 
                      onClick={startCamera}
                      className="group bg-white border border-slate-100 hover:border-teal-500 hover:bg-teal-50 text-slate-800 font-bold py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <div className="p-4 bg-teal-100 text-teal-600 rounded-2xl group-hover:rotate-6 transition-transform">
                        <Camera size={32} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-black">Live Scan</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="group bg-white border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-slate-800 font-bold py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:-rotate-6 transition-transform">
                        <Upload size={32} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-black">Upload</span>
                    </button>
                    <button 
                      onClick={() => setIsManualEntry(true)}
                      className="group bg-white border border-slate-100 hover:border-amber-500 hover:bg-amber-50 text-slate-800 font-bold py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl group-hover:rotate-12 transition-transform">
                        <Pill size={32} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-black">Manual</span>
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
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 flex flex-col h-[700px] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-slate-800 mb-4 sticky top-0 bg-white/50 backdrop-blur-sm z-10 pb-2">Extracted Data & Reminders</h2>
            
            {!extractedData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Pill size={48} className="mb-4 opacity-50" />
                <p>Scan a label to see extracted details here.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="space-y-3 mb-6">
                  {/* Basic Info */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                    <Pill className="text-teal-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Drug Name & Dosage</p>
                      <p className="text-slate-800 font-bold text-lg leading-tight">{extractedData.drugName}</p>
                      <p className="text-teal-600 font-medium text-sm">{extractedData.dosage}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                      <Calendar className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Expiry Date</p>
                        <p className="text-slate-800 font-bold text-sm">{extractedData.expiryDate}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                      <Hash className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Batch No.</p>
                        <p className="text-slate-800 font-bold text-sm truncate">{extractedData.batchNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* CLINICAL INFO SECTION */}
                  <div className="space-y-3 pt-2">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                      <FileText className="text-blue-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Usage Instructions</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{extractedData.usageInfo || 'Not found'}</p>
                      </div>
                    </div>

                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                      <Info className="text-rose-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Common Side Effects</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{extractedData.sideEffects || 'Not found'}</p>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                      <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Safety Precautions</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{extractedData.precautions || 'Not found'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={16} className="text-teal-600" /> Daily Reminders
                    </h3>
                    <button onClick={addTime} className="text-xs text-teal-600 font-bold hover:text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
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
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium"
                        />
                        {dailyTimes.length > 1 && (
                          <button onClick={() => removeTime(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 leading-normal">
                    AI Protocol Note: Reminders for expiry will be auto-triggered at 60 and 30 day intervals before <strong>{extractedData.expiryDate}</strong>. Always cross-verify AI extractions with the physical label.
                  </p>
                </div>

                <button 
                  onClick={saveReminder}
                  disabled={isSaving || saveSuccess}
                  className={`mt-auto w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs ${
                    saveSuccess 
                      ? 'bg-green-500 text-white shadow-green-500/20' 
                      : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20 active:scale-[0.98]'
                  }`}
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : saveSuccess ? <><CheckCircle2 size={20} /> Success: Saved</> : 'Confirm & Set Reminders'}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Manual Entry Modal */}
        <AnimatePresence>
          {isManualEntry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                onClick={() => setIsManualEntry(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-10 overflow-hidden border border-slate-100 p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Manual Registry Entry</h3>
                  <button onClick={() => setIsManualEntry(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Drug Name</label>
                      <input 
                        type="text" 
                        value={manualData.drugName}
                        onChange={(e) => setManualData({...manualData, drugName: e.target.value})}
                        placeholder="e.g. Paracetamol"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Dosage</label>
                      <input 
                        type="text" 
                        value={manualData.dosage}
                        onChange={(e) => setManualData({...manualData, dosage: e.target.value})}
                        placeholder="e.g. 500mg"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expiry Date</label>
                      <input 
                        type="date" 
                        value={manualData.expiryDate}
                        onChange={(e) => setManualData({...manualData, expiryDate: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Batch Number</label>
                      <input 
                        type="text" 
                        value={manualData.batchNumber}
                        onChange={(e) => setManualData({...manualData, batchNumber: e.target.value})}
                        placeholder="BATCH123"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Usage Protocol</label>
                    <textarea 
                      value={manualData.usageInfo}
                      onChange={(e) => setManualData({...manualData, usageInfo: e.target.value})}
                      placeholder="e.g. One tablet after meals twice daily"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium h-24 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Side Effects</label>
                    <textarea 
                      value={manualData.sideEffects}
                      onChange={(e) => setManualData({...manualData, sideEffects: e.target.value})}
                      placeholder="e.g. Drowsiness, Nausea"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium h-20 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Safety Warnings</label>
                    <textarea 
                      value={manualData.precautions}
                      onChange={(e) => setManualData({...manualData, precautions: e.target.value})}
                      placeholder="e.g. Avoid alcohol, Store in cool place"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium h-20 resize-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleManualSave}
                  className="mt-8 w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px]"
                >
                  Commit Data to Registry
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
