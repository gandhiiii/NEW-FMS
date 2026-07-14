import { useState, useEffect } from 'react';
import { lostFoundAPI } from '../services/api';

export default function LostFound() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'lost', itemName: '', description: '', location: '', dateLost: '', dateFound: '', reportedBy: '', reportedContact: '' });
  const [filter, setFilter] = useState({ type: '', status: '' });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try { const { data } = await lostFoundAPI.getAll(filter); setItems(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await lostFoundAPI.create(form); setShowForm(false); setForm({ type: 'lost', itemName: '', description: '', location: '', dateLost: '', dateFound: '', reportedBy: '', reportedContact: '' }); fetchItems(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleClaim = async (id) => {
    const claimedBy = prompt('Claimant name:');
    const claimedContact = prompt('Claimant contact:');
    if (!claimedBy || !claimedContact) return;
    try { await lostFoundAPI.claim(id, { claimedBy, claimedContact }); fetchItems(); } catch (err) { alert('Error'); }
  };

  const handleTakeAction = async (id) => {
    const actionTaken = prompt('Action taken:');
    if (!actionTaken) return;
    try { await lostFoundAPI.update(id, { actionTaken, status: 'disposed' }); fetchItems(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Lost & Found</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Report Item</button>
      </div>
      <div className="flex gap-3 mb-4">
        <select className="select max-w-[140px]" value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="">All</option><option value="lost">Lost</option><option value="found">Found</option>
        </select>
        <select className="select max-w-[140px]" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option><option value="claimed">Claimed</option>
          <option value="disposed">Disposed</option>
        </select>
        <button onClick={fetchItems} className="btn-primary text-xs">Filter</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Report Lost/Found Item</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Type</label>
                    <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="lost">Lost</option><option value="found">Found</option>
                    </select>
                  </div>
                  <div><label className="label">Item Name</label><input className="input" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} required /></div>
                </div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div><label className="label">{form.type === 'lost' ? 'Date Lost' : 'Date Found'}</label><input type="date" className="input" value={form.type === 'lost' ? form.dateLost : form.dateFound} onChange={e => setForm({ ...form, [form.type === 'lost' ? 'dateLost' : 'dateFound']: e.target.value })} /></div>
                  <div><label className="label">Reported By</label><input className="input" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} /></div>
                  <div><label className="label">Contact</label><input className="input" value={form.reportedContact} onChange={e => setForm({ ...form, reportedContact: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit</button>
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
              <th className="table-header">Type</th>
              <th className="table-header">Location</th>
              <th className="table-header">Reported</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-cell">
                  <p className="font-medium">{item.itemName}</p>
                  {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                </td>
                <td className="table-cell"><span className={item.type === 'lost' ? 'badge-red' : 'badge-green'}>{item.type}</span></td>
                <td className="table-cell text-xs">{item.location || '-'}</td>
                <td className="table-cell text-xs">{item.reportedBy || '-'}</td>
                <td className="table-cell"><span className={`badge-${item.status === 'claimed' ? 'green' : item.status === 'disposed' ? 'gray' : 'yellow'}`}>{item.status}</span></td>
                <td className="table-cell">
                  {item.status === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleClaim(item._id)} className="btn-success text-xs !px-2 !py-1">Claim</button>
                      <button onClick={() => handleTakeAction(item._id)} className="btn-secondary text-xs !px-2 !py-1">Action</button>
                    </div>
                  )}
                  {item.actionTaken && <p className="text-xs text-gray-400 mt-1">Action: {item.actionTaken}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
