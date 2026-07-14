import { useState, useEffect } from 'react';
import { gateAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Gate() {
  const { hasPermission } = useAuth();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'goods_in', personName: '', companyName: '', contactNo: '', vehicleNo: '', purpose: '', items: [{ name: '', quantity: 1, description: '' }] });
  const [filter, setFilter] = useState({ status: '', type: '' });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { const { data } = await gateAPI.getAll(filter); setEntries(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await gateAPI.create(form); setShowForm(false); setForm({ type: 'goods_in', personName: '', companyName: '', contactNo: '', vehicleNo: '', purpose: '', items: [{ name: '', quantity: 1, description: '' }] }); fetchEntries(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleApprove = async (id, status) => {
    const note = prompt('Approval note (optional):');
    try { await gateAPI.approve(id, { status, approvalNote: note }); fetchEntries(); } catch (err) { alert('Error'); }
  };

  const handleCheckout = async (id) => {
    try { await gateAPI.checkout(id); fetchEntries(); } catch (err) { alert('Error'); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { name: '', quantity: 1, description: '' }] });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i][field] = value;
    setForm({ ...form, items });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Gate Security</h2>
        {hasPermission('gate', 'create') && <button onClick={() => setShowForm(true)} className="btn-primary">+ New Entry</button>}
      </div>
      <div className="flex gap-3 mb-4">
        <select className="select max-w-[160px]" value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="goods_in">Goods In</option><option value="goods_out">Goods Out</option>
          <option value="visitor">Visitor</option><option value="vendor">Vendor</option>
          <option value="staff">Staff</option>
        </select>
        <select className="select max-w-[160px]" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option><option value="completed">Completed</option>
        </select>
        <button onClick={fetchEntries} className="btn-primary text-xs">Filter</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">New Gate Entry</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div><label className="label">Entry Type</label>
                  <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="goods_in">Goods In</option><option value="goods_out">Goods Out</option>
                    <option value="visitor">Visitor</option><option value="vendor">Vendor</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Person Name</label><input className="input" value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })} required /></div>
                  <div><label className="label">Company</label><input className="input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} /></div>
                  <div><label className="label">Contact No</label><input className="input" value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} /></div>
                  <div><label className="label">Vehicle No</label><input className="input" value={form.vehicleNo} onChange={e => setForm({ ...form, vehicleNo: e.target.value })} /></div>
                </div>
                <div><label className="label">Purpose</label><textarea className="input" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} rows={2} /></div>
                {(form.type === 'goods_in' || form.type === 'goods_out') && (
                  <div>
                    <label className="label">Items</label>
                    {form.items.map((item, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input className="input flex-1" placeholder="Item name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} />
                        <input type="number" className="input w-20" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-blue-600 text-xs hover:underline">+ Add Item</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Gate Pass</th>
              <th className="table-header">Person</th>
              <th className="table-header">Type</th>
              <th className="table-header">Vehicle</th>
              <th className="table-header">In Time</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-cell font-mono text-xs">{e.gatePassNo}</td>
                <td className="table-cell">
                  <p className="font-medium">{e.personName}</p>
                  {e.companyName && <p className="text-xs text-gray-400">{e.companyName}</p>}
                </td>
                <td className="table-cell"><span className="badge-blue">{e.type.replace('_', ' ')}</span></td>
                <td className="table-cell text-gray-500">{e.vehicleNo || '-'}</td>
                <td className="table-cell text-xs">{new Date(e.inTime).toLocaleString()}</td>
                <td className="table-cell"><span className={`badge-${e.status === 'completed' ? 'green' : e.status === 'approved' ? 'blue' : e.status === 'rejected' ? 'red' : 'yellow'}`}>{e.status}</span></td>
                <td className="table-cell">
                  {e.status === 'pending' && hasPermission('gate', 'approve') && (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(e._id, 'approved')} className="btn-success text-xs !px-2 !py-1">Approve</button>
                      <button onClick={() => handleApprove(e._id, 'rejected')} className="btn-danger text-xs !px-2 !py-1">Reject</button>
                    </div>
                  )}
                  {e.status === 'approved' && <button onClick={() => handleCheckout(e._id)} className="btn-primary text-xs !px-2 !py-1">Check Out</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
