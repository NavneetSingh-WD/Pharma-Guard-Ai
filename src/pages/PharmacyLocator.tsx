import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Pill, Store, Navigation, DollarSign, Calendar, Loader2 } from 'lucide-react';

interface PharmacyResult {
  id: string;
  name: string;
  distance: string;
  address: string;
  isOpen: boolean;
  stock: {
    type: 'Brand' | 'Generic';
    name: string;
    composition: string;
    price: number;
    expiryDate: string;
    inStock: boolean;
  }[];
}

const MOCK_RESULTS: PharmacyResult[] = [
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

export default function PharmacyLocator() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PharmacyResult[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setResults(null);
    
    try {
      const response = await fetch(`/api/pharmacies?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch pharmacies');
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      // Fallback to empty or show error in a real app
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-300/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Pharmacy Locator & Inventory</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Find nearby pharmacies, check real-time stock availability, and compare generic vs. brand prices.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Search & Map Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a drug (e.g., Paracetamol)..." 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <button 
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} className="rotate-180" />}
                </button>
              </form>
            </div>

            {/* Simulated Map View */}
            <div className="bg-slate-200 rounded-[2rem] h-[400px] relative overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
              {/* Placeholder for actual map integration (e.g., Google Maps) */}
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
              <div className="relative z-10 flex flex-col items-center text-slate-500">
                <MapPin size={48} className="mb-2 opacity-50" />
                <p className="font-medium">Interactive Map View</p>
                <p className="text-sm">Location services active</p>
              </div>

              {/* Mock Map Pins */}
              {results && results.map((res, idx) => (
                <div 
                  key={res.id} 
                  className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md ${res.isOpen ? 'bg-amber-500' : 'bg-slate-400'}`}
                  style={{ 
                    top: `${30 + (idx * 20)}%`, 
                    left: `${40 + (idx * 15)}%` 
                  }}
                >
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-slate-700">
                    {res.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2rem] p-6 h-full min-h-[500px]">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Store size={24} className="text-amber-600" />
                Real-Time Inventory Results
              </h2>

              {!results && !isSearching && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 pb-12">
                  <Search size={64} className="mb-4" />
                  <p className="text-center max-w-xs">Search for a medication to see nearby availability and prices.</p>
                </div>
              )}

              {isSearching && (
                <div className="flex flex-col items-center justify-center h-full text-amber-500 pb-12">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium animate-pulse">Querying pharmacy aggregators...</p>
                </div>
              )}

              {results && !isSearching && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {results.map((pharmacy) => (
                    <div key={pharmacy.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {pharmacy.name}
                            {!pharmacy.isOpen && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Closed</span>}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Navigation size={14} className="text-amber-500" /> {pharmacy.distance} • {pharmacy.address}
                          </p>
                        </div>
                        <button className="text-amber-600 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors">
                          <MapPin size={20} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {pharmacy.stock.map((item, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${item.inStock ? 'bg-white border-slate-200' : 'bg-slate-100/50 border-slate-100 opacity-60'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg mt-0.5 ${item.type === 'Brand' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
                                <Pill size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800">{item.name}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.type === 'Brand' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                                    {item.type}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{item.composition}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                  <Calendar size={12} /> Exp: {item.expiryDate}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {item.inStock ? (
                                <>
                                  <p className="text-lg font-bold text-slate-800 flex items-center justify-end">
                                    <DollarSign size={16} className="text-slate-400" />
                                    {item.price.toFixed(2)}
                                  </p>
                                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mt-1">In Stock</p>
                                </>
                              ) : (
                                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-2">Out of Stock</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
