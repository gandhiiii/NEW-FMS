import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showTransaction, setShowTransaction] = useState(null);
  const [filter, setFilter] = useState({ category: '', status: '', search: '' });
  const [form, setForm] = useState({ name: '', category: '', brand: '', model: '', serialNumber: '', quantity: 0, unit: 'pcs', purchasePrice: 0, warrantyExpiry: '', expiryDate: '', lifecycleYears: 0, department: '', location: '', supplier: '' });
  const [txForm, setTxForm] = useState({ type: 'in', quantity: 1, personName: '', department: '', note: '' });

  useEffect(() => { fetchItems(); fetchStats(); }, []);

  const fetchItems = async () => {
    try { const { data } = await inventoryAPI.getAll(filter); setItems(data); } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try { const { data } = await inventoryAPI.getStats(); setStats(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await inventoryAPI.create(form); setShowForm(false); setForm({ name: '', category: '', brand: '', model: '', serialNumber: '', quantity: 0, unit: 'pcs', purchasePrice: 0, warrantyExpiry: '', expiryDate: '', lifecycleYears: 0, department: '', location: '', supplier: '' }); fetchItems(); fetchStats(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    try { await inventoryAPI.addTransaction(showTransaction._id, txForm); setShowTransaction(null); setTxForm({ type: 'in', quantity: 1, personName: '', department: '', note: '' }); fetchItems(); fetchStats(); } catch (err) { alert('Transaction error'); }
  };

  const getLifecycleColor = (pct) => {
    if (pct > 60) return 'bg-green-500';
    if (pct > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Item</button>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="card py-3 px-4 text-center"><p className="text-xl font-bold text-blue-600">{stats.total}</p><p className="text-xs text-gray-500">Total Items</p></div>
          <div className="card py-3 px-4 text-center"><p className="text-xl font-bold text-green-600">{stats.active}</p><p className="text-xs text-gray-500">Active</p></div>
          <div className="card py-3 px-4 text-center"><p className="text-xl font-bold text-red-600">{stats.expired}</p><p className="text-xs text-gray-500">Expired</p></div>
          <div className="card py-3 px-4 text-center"><p className="text-xl font-bold text-yellow-600">{stats.lowStock}</p><p className="text-xs text-gray-500">Low Stock</p></div>
          <div className="card py-3 px-4 text-center"><p className="text-xl font-bold text-purple-600">₹{((stats.totalValue) / 100000).toFixed(1)}L</p><p className="text-xs text-gray-500">Total Value</p></div>
        </div>
      )}
      <div className="flex gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Search items..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
        <select className="select max-w-[140px]" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          <option value="Medical Equipment">Medical Equipment</option>
          <option value="Furniture">Furniture</option>
          <option value="Consumables">Consumables</option>
          <option value="Electronics">Electronics</option>
          <option value="Tools">Tools</option>
        </select>
        <button onClick={fetchItems} className="btn-primary text-xs">Search</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Add Inventory Item</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Item Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Category</label>
                  <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select</option>
                    <option value="Medical Equipment">Medical Equipment</option><option value="Furniture">Furniture</option>
                    <option value="Consumables">Consumables</option><option value="Electronics">Electronics</option>
                    <option value="Tools">Tools</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="label">Brand</label><input className="input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                <div><label className="label">Model</label><input className="input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
                <div><label className="label">Serial Number</label><input className="input" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                <div><label className="label">Quantity</label><input type="number" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} required /></div>
                <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                <div><label className="label">Purchase Price</label><input type="number" className="input" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: +e.target.value })} /></div>
                <div><label className="label">Warranty Expiry</label><input type="date" className="input" value={form.warrantyExpiry} onChange={e => setForm({ ...form, warrantyExpiry: e.target.value })} /></div>
                <div><label className="label">Expiry Date</label><input type="date" className="input" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
                <div><label className="label">Lifecycle (Years)</label><input type="number" className="input" value={form.lifecycleYears} onChange={e => setForm({ ...form, lifecycleYears: +e.target.value })} /></div>
                <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div><label className="label">Supplier</label><input className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showTransaction && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowTransaction(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Stock Transaction: {showTransaction.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Current Stock: <strong>{showTransaction.quantity}</strong></p>
            <form onSubmit={handleTransaction}>
              <div className="space-y-4">
                <div><label className="label">Type</label>
                  <select className="select" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                    <option value="in">Stock In</option><option value="out">Stock Out</option>
                  </select>
                </div>
                <div><label className="label">Quantity</label><input type="number" className="input" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: +e.target.value })} required min={1} /></div>
                <div><label className="label">Person Name</label><input className="input" value={txForm.personName} onChange={e => setTxForm({ ...txForm, personName: e.target.value })} /></div>
                <div><label className="label">Department</label><input className="input" value={txForm.department} onChange={e => setTxForm({ ...txForm, department: e.target.value })} /></div>
                <div><label className="label">Note</label><input className="input" value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowTransaction(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Item</th>
              <th className="table-header">Category</th>
              <th className="table-header">Qty</th>
              <th className="table-header">Lifecycle</th>
              <th className="table-header">Warranty</th>
              <th className="table-header">Expiry</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-cell">
                  <p className="font-medium">{item.name}</p>
                  {item.serialNumber && <p className="text-xs text-gray-400">SN: {item.serialNumber}</p>}
                </td>
                <td className="table-cell text-gray-500">{item.category}</td>
                <td className="table-cell">
                  <span className={`font-medium ${item.quantity <= 5 ? 'text-red-600' : 'text-gray-700'}`}>{item.quantity}</span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${getLifecycleColor(item.lifecycleBar)}`} style={{ width: `${item.lifecycleBar}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{item.lifecycleBar}%</span>
                  </div>
                </td>
                <td className="table-cell text-xs">{item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString() : '-'}</td>
                <td className="table-cell text-xs">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                <td className="table-cell"><span className={`badge-${item.status === 'active' ? 'green' : item.status === 'expired' ? 'red' : 'yellow'}`}>{item.status}</span></td>
                <td className="table-cell">
                  <button onClick={() => { setShowTransaction(item); }} className="btn-primary text-xs !px-2 !py-1">Stock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
