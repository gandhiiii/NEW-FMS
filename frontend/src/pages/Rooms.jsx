import { useState, useEffect } from 'react';
import { roomAPI } from '../services/api';

const defaultItems = [
  { name: 'Bed', category: 'Furniture' }, { name: 'Fan', category: 'Electrical' },
  { name: 'Light', category: 'Electrical' }, { name: 'AC', category: 'HVAC' },
  { name: 'TV', category: 'Electronics' }, { name: 'Fridge', category: 'Electronics' },
  { name: 'Nurse Calling', category: 'System' }, { name: 'MGPS', category: 'Medical' },
  { name: 'Oxygen Flow Meter', category: 'Medical' }, { name: 'Water Tap', category: 'Plumbing' },
  { name: 'Flush Tank', category: 'Plumbing' }, { name: 'Door Lock', category: 'Civil' },
  { name: 'Door Closer', category: 'Civil' }, { name: 'Fire Alarm', category: 'Safety' },
  { name: 'Fire Sprinkler', category: 'Safety' }, { name: 'Fire Extinguisher', category: 'Safety' },
  { name: 'Smoke Detector', category: 'Safety' }, { name: 'Camera', category: 'Security' },
  { name: 'Speaker', category: 'System' }, { name: 'WiFi Router', category: 'IT' },
  { name: 'Furniture', category: 'Furniture' }, { name: 'Geyser', category: 'Electrical' }
];

export default function Rooms() {
  const [checklists, setChecklists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [form, setForm] = useState({
    roomNo: '', floor: '', department: '', checklistType: 'daily',
    items: defaultItems.map(i => ({ ...i, isChecked: false, note: '' }))
  });

  useEffect(() => { fetchChecklists(); }, []);

  const fetchChecklists = async () => {
    try { const { data } = await roomAPI.getAll(); setChecklists(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await roomAPI.create(form); setShowForm(false); fetchChecklists(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const toggleItem = async (checklistId, itemId) => {
    const checklist = checklists.find(c => c._id === checklistId);
    if (!checklist) return;
    const updatedItems = checklist.items.map(item =>
      item._id === itemId ? { ...item, isChecked: !item.isChecked, _id: item._id } : item
    );
    try { await roomAPI.updateItems(checklistId, { items: updatedItems }); fetchChecklists(); } catch (err) { alert('Error updating'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Room Checklist</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Checklist</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">New Room Checklist</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="label">Room No</label><input className="input" value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} required /></div>
                <div><label className="label">Floor</label><input className="input" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} /></div>
                <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                <div><label className="label">Type</label>
                  <select className="select" value={form.checklistType} onChange={e => setForm({ ...form, checklistType: e.target.value })}>
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option><option value="pre_admission">Pre Admission</option>
                    <option value="post_discharge">Post Discharge</option>
                  </select>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                {form.items.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-2">
                    <input type="checkbox" checked={item.isChecked} onChange={() => {
                      const items = [...form.items];
                      items[i].isChecked = !items[i].isChecked;
                      setForm({ ...form, items });
                    }} className="rounded" />
                    <span className="text-xs text-gray-400 w-20">{item.category}</span>
                    <span>{item.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Checklist</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setSelectedChecklist(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-2">Room {selectedChecklist.roomNo} - {selectedChecklist.checklistType}</h3>
            <p className="text-sm text-gray-500 mb-4">Floor: {selectedChecklist.floor} | Status: <span className={`badge-${selectedChecklist.status === 'completed' ? 'green' : 'yellow'}`}>{selectedChecklist.status}</span></p>
            <div className="space-y-2">
              {selectedChecklist.items.map(item => (
                <div key={item._id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={item.isChecked} onChange={() => toggleItem(selectedChecklist._id, item._id)} className="rounded" />
                  <span className="text-xs text-gray-400 w-20">{item.category}</span>
                  <span className="flex-1 text-sm">{item.name}</span>
                  {item.isChecked && <span className="badge-green">OK</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedChecklist(null)} className="btn-secondary mt-6">Close</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checklists.map(c => (
          <div key={c._id} className="card card-hover cursor-pointer" onClick={() => setSelectedChecklist(c)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">Room {c.roomNo}</h3>
                <p className="text-xs text-gray-500">{c.floor} | {c.checklistType}</p>
              </div>
              <span className={`badge-${c.status === 'completed' ? 'green' : 'yellow'}`}>{c.status}</span>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${c.items.filter(i => i.isChecked).length / Math.max(c.items.length, 1) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500">{c.items.filter(i => i.isChecked).length}/{c.items.length}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">📅 {new Date(c.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
