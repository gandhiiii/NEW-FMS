import { useState, useEffect } from 'react';
import { floorChecklistAPI } from '../services/api';

const floors = ['B-3', 'B-2', 'B-1', 'Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th (Terrace)'];

const zonesByFloor = {
  'B-3': ['Parking', 'Store Room', 'Access Point', 'Drainage', 'Locker Room'],

  'B-2': ['Parking', 'Fire System Pumps', 'Drainage', 'Locker Room'],
  'B-1': ['Parking', 'MGPS Station', 'Vacuum Pumps', 'Air Filter Room', 'LT Panel Room', 'UPS Room'],
  'Ground': ['Parking Entrance', 'Medical Gas Station', 'Two Wheeler Parking', 'Canteen', 'Medical', 'Physiotherapy', 'Reception', 'Main Entrance', 'Bathroom'],
  '1st': ['Radiology', 'MRI Room', 'CT Scan', 'X-Ray', 'Sonography', 'Admin', 'Marketing', 'Discharge', 'Admission', 'Call Center'],
  '2nd': ['PG-1 OPD', 'PG-2 OPD', 'Physician Room', 'OPD 1-13', 'Research Room', 'Minor OT', 'Blood Collection', 'Doctor Room'],
  '3rd': ['HDU', 'PREOP', 'CSSD', 'OT 1-6', 'Doctor Room', 'Nursing Station', 'Changing Room', 'Biowaste'],
  '4th': ['Patient Room 2-17', 'Nursing Station', 'Reception', 'Linen Storage', 'Store Room'],
  '5th': ['Patient Room 2-17', 'Nursing Station', 'Reception', 'Linen Storage', 'Store Room'],
  '6th': ['Patient Room 2-17', 'Nursing Station', 'Reception', 'Linen Storage', 'Store Room'],
  '7th (Terrace)': ['HVAC', 'AHU', 'Outdoor Unit', 'Water Tank', 'STP', 'RO System', 'Solar Panel', 'Lift Fresh Air']
};

export default function FloorChecklist() {
  const [checklists, setChecklists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [form, setForm] = useState({ floor: 'Ground', zone: '', items: [] });

  useEffect(() => { fetchChecklists(); }, []);

  const fetchChecklists = async () => {
    try { const { data } = await floorChecklistAPI.getAll(); setChecklists(data); } catch (err) { console.error(err); }
  };

  const handleFloorChange = (floor) => {
    const zones = zonesByFloor[floor] || [];
    const items = zones.flatMap(zone => [
      { name: 'Light', category: 'Electrical', status: 'ok', note: '' },
      { name: 'Fan', category: 'Electrical', status: 'ok', note: '' },
      { name: 'Camera', category: 'Security', status: 'ok', note: '' },
      { name: 'Fire Alarm', category: 'Safety', status: 'ok', note: '' },
      { name: 'Fire Extinguisher', category: 'Safety', status: 'ok', note: '' },
      { name: 'Door Lock', category: 'Civil', status: 'ok', note: '' },
      { name: 'Plumbing', category: 'Plumbing', status: 'ok', note: '' },
      { name: 'Cleanliness', category: 'Housekeeping', status: 'ok', note: '' }
    ]);
    setForm({ floor, zone: zones[0] || '', items });
  };

  useEffect(() => { handleFloorChange(form.floor); }, [form.floor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await floorChecklistAPI.create(form); setShowForm(false); fetchChecklists(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const changeItemStatus = (index, status) => {
    const items = [...form.items];
    items[index] = { ...items[index], status };
    setForm({ ...form, items });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Floor-wise Facility Checklist</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Inspection</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Floor Inspection</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="label">Floor</label>
                  <select className="select" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })}>
                    {floors.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div><label className="label">Zone</label>
                  <select className="select" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}>
                    {(zonesByFloor[form.floor] || []).map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Item</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="table-cell">{item.name}</td>
                        <td className="table-cell text-gray-500">{item.category}</td>
                        <td className="table-cell">
                          <select className="select text-xs !py-1 !px-2" value={item.status} onChange={e => changeItemStatus(i, e.target.value)}>
                            <option value="ok">OK</option>
                            <option value="not_ok">Not OK</option>
                            <option value="not_applicable">N/A</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Inspection</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setSelectedChecklist(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-2">{selectedChecklist.floor} - {selectedChecklist.zone}</h3>
            <p className="text-sm text-gray-500 mb-4">Status: <span className={`badge-${selectedChecklist.status === 'completed' ? 'green' : 'yellow'}`}>{selectedChecklist.status}</span></p>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Item</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedChecklist.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="table-cell">{item.name}</td>
                    <td className="table-cell text-gray-500">{item.category}</td>
                    <td className="table-cell">
                      <span className={`badge-${item.status === 'ok' ? 'green' : item.status === 'not_ok' ? 'red' : 'gray'}`}>{item.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setSelectedChecklist(null)} className="btn-secondary mt-6">Close</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checklists.map(c => (
          <div key={c._id} className="card card-hover cursor-pointer" onClick={() => setSelectedChecklist(c)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{c.floor}</h3>
                <p className="text-xs text-gray-500">{c.zone}</p>
              </div>
              <span className={`badge-${c.status === 'completed' ? 'green' : 'yellow'}`}>{c.status}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${c.items.filter(i => i.status === 'ok' || i.status === 'not_applicable').length / Math.max(c.items.length, 1) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500">{c.items.filter(i => i.status === 'ok').length}/{c.items.length}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">📅 {new Date(c.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
