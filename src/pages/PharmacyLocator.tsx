import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Pill, Store, Navigation, DollarSign, Calendar, Loader2, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface PharmacyResult {
  id: string;
  name: string;
  distance: string;
  address: string;
  isOpen: boolean;
  currency?: string;
  location?: { lat: number; lng: number };
  stock: {
    type: 'Brand' | 'Generic';
    name: string;
    composition: string;
    price: number;
    expiryDate: string;
    inStock: boolean;
  }[];
}

function MapHandler({ results, onMarkerClick }: { results: PharmacyResult[] | null, onMarkerClick: (p: PharmacyResult) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !results || results.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    results.forEach(res => {
      if (res.location) bounds.extend(res.location);
    });
    
    if (results.length > 0) {
      map.fitBounds(bounds);
    }
  }, [map, results]);

  return (
    <>
      {results?.map(res => res.location && (
        <AdvancedMarker 
          key={res.id} 
          position={res.location} 
          onClick={() => onMarkerClick(res)}
          title={res.name}
        >
          <Pin background={res.isOpen ? "#f59e0b" : "#94a3b8"} glyphColor="#fff" />
        </AdvancedMarker>
      ))}
    </>
  );
}

export default function PharmacyLocator() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PharmacyResult[] | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyResult | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default to New Delhi as requested demo area
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    // Attempt to locate user on mount
    locateUser();
  }, []);

  const locateUser = () => {
    if (!navigator.geolocation) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
      }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setResults(null);
    
    try {
      const response = await fetch(`/api/pharmacies?query=${encodeURIComponent(searchQuery)}&lat=${mapCenter.lat}&lng=${mapCenter.lng}`);
      if (!response.ok) throw new Error('Failed to fetch pharmacies');
      const data = await response.json();
      
      // Inject locations relative to the map center (user location)
      const resultsWithLocation = data.results.map((p: any, i: number) => ({
        ...p,
        location: p.location || { 
          lat: mapCenter.lat + (Math.random() - 0.5) * 0.02, 
          lng: mapCenter.lng + (Math.random() - 0.5) * 0.02 
        }
      }));
      
      setResults(resultsWithLocation);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!hasValidKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-xl w-full text-center">
          <div className="w-20 h-20 bg-amber-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 mx-auto mb-8">
            <MapPin size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Google Maps API Key Required</h2>
          <div className="space-y-6 text-left">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">1</div>
              <p className="text-slate-600">
                <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-amber-600 font-bold hover:underline">Get an API Key</a> from the Google Cloud Console.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">2</div>
              <div>
                <p className="text-slate-600 font-medium mb-2">Add your key as a secret:</p>
                <ul className="list-disc list-inside text-sm text-slate-500 space-y-1 ml-2">
                  <li>Open <span className="font-bold">Settings</span> (⚙️ icon, top-right)</li>
                  <li>Go to <span className="font-bold">Secrets</span></li>
                  <li>Name: <code className="bg-slate-100 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                  <li>Paste your key and press Enter</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-slate-100">
            <Link to="/" className="text-slate-500 font-semibold hover:text-slate-800 transition-colors">Return to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-amber-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-amber-600/30 mx-auto mb-6 transform hover:rotate-6 transition-transform">
            <MapPin size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter uppercase italic leading-none">Pharmacy Network</h1>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto uppercase tracking-widest text-[10px]">
            Real-Time Inventory • MTM Substitution Engine • Pricing Interop
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          
          {/* Search & Map Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-6 group focus-within:shadow-2xl transition-all duration-500">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medication (e.g. Paracetamol)..." 
                  className="w-full pl-14 pr-4 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-400"
                />
                <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-600" />
                <button 
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-90 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 size={20} className="animate-spin" /> : <ArrowLeft size={20} className="rotate-180" />}
                </button>
              </form>
            </div>

            {/* Real Map View */}
            <div className="bg-slate-900 rounded-[2.5rem] h-[550px] relative overflow-hidden border border-white shadow-2xl group">
              <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-white/10 rounded-[2.5rem]"></div>
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  center={mapCenter}
                  onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                  defaultZoom={13}
                  mapId="PHARMA_GUARD_LOCATOR"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling={'greedy'}
                  disableDefaultUI={true}
                >
                  <MapHandler 
                    results={results} 
                    onMarkerClick={(p) => {
                      setSelectedPharmacy(p);
                      const element = document.getElementById(`pharmacy-${p.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }} 
                  />
                </Map>
              </APIProvider>
              
              {/* Floating Map Controls overlay */}
              <div className="absolute bottom-8 left-8 right-8 bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    GPS: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                  </span>
                </div>
                <button 
                  onClick={locateUser}
                  disabled={isLocating}
                  className="flex items-center gap-2 text-[10px] text-white font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all border border-white/20"
                >
                  {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  Recenter Signal
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7">
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[2.5rem] p-10 h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Store size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Inventory Payload</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Sourced via Pharmacist CRM</p>
                  </div>
                </div>
                {results && (
                  <div className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    {results.length} Nodes Found
                  </div>
                )}
              </div>

              {!results && !isSearching && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 pb-20 group">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Search size={48} className="opacity-20" />
                  </div>
                  <p className="text-center max-w-xs font-black uppercase tracking-widest text-xs opacity-50">Pending Input Protocol</p>
                </div>
              )}

              {isSearching && (
                <div className="flex-1 flex flex-col items-center justify-center text-amber-500 pb-20">
                  <div className="relative">
                    <Loader2 size={64} className="animate-spin mb-6" />
                    <div className="absolute inset-0 blur-xl bg-amber-500/20 animate-pulse"></div>
                  </div>
                  <p className="font-black uppercase tracking-widest text-xs animate-pulse">Scanning Grid...</p>
                </div>
              )}

              {results && !isSearching && (
                <div className="space-y-8 overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
                  {results.length > 0 ? results.map((pharmacy) => (
                    <div 
                      key={pharmacy.id} 
                      id={`pharmacy-${pharmacy.id}`}
                      className={`bg-slate-50/50 border transition-all duration-500 rounded-[2rem] p-8 hover:bg-white hover:shadow-2xl ${selectedPharmacy?.id === pharmacy.id ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-100'}`}
                      onClick={() => setSelectedPharmacy(pharmacy)}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl ${selectedPharmacy?.id === pharmacy.id ? 'bg-amber-600 text-white' : 'bg-white border text-slate-400'} transition-colors`}>
                            <Store size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none mb-1">
                              {pharmacy.name}
                            </h3>
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest flex items-center gap-1">
                                <Navigation size={12} strokeWidth={3} /> {pharmacy.distance}
                              </p>
                              {!pharmacy.isOpen && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg uppercase tracking-wider font-black">Offline</span>}
                            </div>
                          </div>
                        </div>
                        <button className="text-indigo-600 bg-white border border-slate-100 hover:bg-indigo-50 p-3 rounded-2xl transition-all shadow-sm active:scale-90">
                          <MapPin size={24} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {pharmacy.stock.map((item, idx) => (
                          <div key={idx} className={`group/item flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${item.inStock ? 'bg-white border-slate-50 hover:border-amber-200' : 'bg-slate-100/50 border-transparent opacity-60'}`}>
                            <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-xl shrink-0 ${item.type === 'Brand' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'} group-hover/item:rotate-6 transition-transform`}>
                                <Pill size={24} />
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <p className="font-black text-slate-800 tracking-tight uppercase leading-none">{item.name}</p>
                                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${item.type === 'Brand' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                                    {item.type}
                                  </span>
                                  {item.type === 'Generic' && (
                                    <div className="flex items-center gap-1 text-[8px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black border border-amber-100">
                                      <RefreshCw size={8} /> PHARMA-LOGIC PICK
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.composition}</p>
                                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-1 opacity-70">
                                  <Calendar size={10} /> EXP: {item.expiryDate}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right flex flex-col justify-center items-end">
                              {item.inStock ? (
                                <>
                                  <div className="flex items-start">
                                    <span className="text-xs font-black text-slate-400 mt-1 leading-none">{pharmacy.currency || '$'}</span>
                                    <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">
                                      {item.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="text-[9px] text-teal-600 font-black uppercase tracking-widest mt-1">In Stock</p>
                                </>
                              ) : (
                                <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">Global Shortfall</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 text-center">
                      <Store size={64} className="mb-6 opacity-10" />
                      <p className="font-black uppercase tracking-widest text-xs">Zero Nodes Found</p>
                      <p className="text-xs font-medium uppercase tracking-tight mt-2 italic">Try adjusting global filters or check local signals.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
