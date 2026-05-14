import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Package, Search, Plus, Filter, AlertTriangle, ArrowDown, ArrowUp, Calendar, X, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryItem {
  id: string;
  name: string;
  genericName: string;
  stock: number;
  minStock: number;
  expiryDate: string;
  batchNumber: string;
  price: number;
}

export default function PharmacistInventory() {
  const { userProfile } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    name: '',
    genericName: '',
    stock: 0,
    minStock: 10,
    expiryDate: '',
    batchNumber: '',
    price: 0
  });

  useEffect(() => {
    const q = collection(db, 'inventory');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newBatch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pharmacyId: userProfile?.uid
      });
      setIsAddModalOpen(false);
      setNewBatch({
        name: '',
        genericName: '',
        stock: 0,
        minStock: 10,
        expiryDate: '',
        batchNumber: '',
        price: 0
      });
    } catch (err) {
      console.error("Error adding batch:", err);
      alert("Failed to add batch to inventory.");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item from inventory?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return 'critical';
    if (diffDays <= 90) return 'warning';
    return 'ok';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Inventory Management</h1>
            <p className="text-slate-600">Track real-time stock levels, FEFO expiry alerts, and batch pricing.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20} /> Add New Batch
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total SKUs</p>
            <p className="text-3xl font-bold text-slate-800">{inventory.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-rose-500">
            <p className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Out of Stock</p>
            <p className="text-3xl font-bold text-slate-800">{inventory.filter(i => i.stock === 0).length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-1">Expiring Soon</p>
            <p className="text-3xl font-bold text-slate-800">{inventory.filter(i => getExpiryStatus(i.expiryDate) !== 'ok').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-teal-500">
            <p className="text-sm font-bold text-teal-500 uppercase tracking-wider mb-1">Total Value</p>
            <p className="text-3xl font-bold text-slate-800">${inventory.reduce((acc, i) => acc + (i.stock * i.price), 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by drug name or generic composition..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-2xl outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-100 transition-all">
            <Filter size={20} /> Filters
          </button>
        </div>

        {/* Inventory Table/Grid */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Medication</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry (FEFO)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center">
                      <div className="animate-spin h-8 w-8 border-t-2 border-amber-600 rounded-full mx-auto mb-2"></div>
                      <p className="text-slate-400">Loading catalog...</p>
                    </td>
                  </tr>
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.genericName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono">
                          {item.batchNumber}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.stock > item.minStock ? 'bg-teal-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, (item.stock / 200) * 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-bold ${item.stock > item.minStock ? 'text-slate-700' : 'text-rose-600'}`}>
                            {item.stock} units
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{item.expiryDate}</p>
                            {getExpiryStatus(item.expiryDate) === 'critical' && (
                              <span className="text-[10px] font-bold text-rose-600 uppercase">Critical</span>
                            )}
                            {getExpiryStatus(item.expiryDate) === 'warning' && (
                              <span className="text-[10px] font-bold text-amber-600 uppercase">Warning</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-800">
                        ${item.price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <button className="text-amber-600 font-bold text-sm hover:underline">Edit</button>
                           <button 
                            onClick={() => deleteItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 transition-colors"
                            title="Delete"
                           >
                            <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Package size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400">No medications found in inventory matching your search.</p>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 text-amber-600 font-bold hover:underline"
                      >
                        Add your first medication
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Add Batch</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleAddBatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Brand Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newBatch.name}
                      onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                      placeholder="e.g. Paracetamol"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Generic Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newBatch.genericName}
                      onChange={e => setNewBatch({...newBatch, genericName: e.target.value})}
                      placeholder="e.g. Acetaminophen"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Stock</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newBatch.stock}
                      onChange={e => setNewBatch({...newBatch, stock: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Price ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newBatch.price}
                      onChange={e => setNewBatch({...newBatch, price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Batch #</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newBatch.batchNumber}
                      onChange={e => setNewBatch({...newBatch, batchNumber: e.target.value})}
                      placeholder="BT-1234"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Expiry Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    value={newBatch.expiryDate}
                    onChange={e => setNewBatch({...newBatch, expiryDate: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-200 mt-4 hover:bg-amber-700 transition-all uppercase tracking-widest text-sm"
                >
                  Confirm Entry
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
