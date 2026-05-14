import React, { useState } from 'react';
import { X, RefreshCw, Search, ArrowRight, DollarSign, Pill } from 'lucide-react';

interface GenericSubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenericSubModal({ isOpen, onClose }: GenericSubModalProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const mockDB: Record<string, any> = {
    'lipitor': { generic: 'Atorvastatin', brandPrice: 45, genericPrice: 8, composition: 'Atorvastatin Calcium', savings: '82%' },
    'amoxil': { generic: 'Amoxicillin', brandPrice: 22, genericPrice: 5, composition: 'Amoxicillin Trihydrate', savings: '77%' },
    'glucophage': { generic: 'Metformin', brandPrice: 18, genericPrice: 4, composition: 'Metformin Hydrochloride', savings: '78%' },
    'zoloft': { generic: 'Sertraline', brandPrice: 55, genericPrice: 12, composition: 'Sertraline HCl', savings: '78%' },
    'advil': { generic: 'Ibuprofen', brandPrice: 12, genericPrice: 3, composition: 'Ibuprofen', savings: '75%' },
  };

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      const match = mockDB[query.toLowerCase()];
      setResult(match || 'not_found');
      setLoading(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-amber-500 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RefreshCw size={20} />
            <h2 className="text-xl font-bold">Generic Substitution Tool</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-500">
            Enter a brand-name medication to find its cost-effective generic alternative and active composition.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Enter brand name (e.g. Lipitor, Advil)..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              Search
            </button>
          </div>

          <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
            {loading ? (
              <div className="animate-spin h-8 w-8 border-t-2 border-amber-500 rounded-full"></div>
            ) : result === 'not_found' ? (
              <div className="text-center p-6">
                <p className="text-slate-400 text-sm">No generic alternative found for "{query}" in our local database.</p>
              </div>
            ) : result ? (
              <div className="w-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Brand Name</p>
                    <p className="text-lg font-bold text-slate-800 capitalize">{query}</p>
                    <p className="text-rose-500 font-bold">${result.brandPrice}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                      <ArrowRight size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 mt-2">Save {result.savings}</span>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Generic Alternative</p>
                    <p className="text-lg font-bold text-teal-600">{result.generic}</p>
                    <p className="text-green-600 font-bold">${result.genericPrice}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill size={14} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Composition</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{result.composition}</p>
                </div>

                <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  <DollarSign size={18} /> Update Order with Generic
                </button>
              </div>
            ) : (
              <p className="text-slate-300 text-sm italic">Search results will appear here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
