import { useState, useEffect } from 'react';
import { complaintAPI, userAPI } from '../services/api';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientName: '', roomNo: '', complaintType: 'service', description: '', priority: 'medium' });

  useEffect(() => { fetchComplaints(); fetchEmployees(); }, []);

  const fetchComplaints = async () => {
    try { const { data } = await complaintAPI.getAll(); setComplaints(data); } catch (err) { console.error(err); }
  };

  const fetchEmployees = async () => {
    try { const { data } = await userAPI.getAll(); setEmployees(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await complaintAPI.create(form); setShowForm(false); setForm({ patientName: '', roomNo: '', complaintType: 'service', description: '', priority: 'medium' }); fetchComplaints(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleResolve = async (id) => {
    const resolution = prompt('Resolution details:');
    if (!resolution) return;
    try { await complaintAPI.update(id, { status: 'resolved', resolution }); fetchComplaints(); } catch (err) { alert('Error'); }
  };

  const handleAssign = async (id) => {
    const assignedTo = prompt('Enter user ID to assign:');
    if (!assignedTo) return;
    try { await complaintAPI.update(id, { assignedTo, status: 'in_progress' }); fetchComplaints(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Patient Complaints</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Complaint</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Register Complaint</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Patient Name</label><input className="input" value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} required /></div>
                  <div><label className="label">Room No</label><input className="input" value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} /></div>
                  <div><label className="label">Complaint Type</label>
                    <select className="select" value={form.complaintType} onChange={e => setForm({ ...form, complaintType: e.target.value })}>
                      <option value="service">Service</option><option value="facility">Facility</option>
                      <option value="staff">Staff</option><option value="billing">Billing</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div><label className="label">Priority</label>
                    <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {complaints.map(c => (
          <div key={c._id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{c.patientName}</h3>
                  <span className="badge-blue">{c.complaintType}</span>
                  <span className={`badge-${c.priority === 'urgent' ? 'red' : c.priority === 'high' ? 'yellow' : 'gray'}`}>{c.priority}</span>
                  <span className={`badge-${c.status === 'resolved' ? 'green' : c.status === 'in_progress' ? 'blue' : c.status === 'closed' ? 'gray' : 'yellow'}`}>{c.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                {c.resolution && <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700"><strong>Resolution:</strong> {c.resolution}</div>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {c.roomNo && <span>🏠 Room {c.roomNo}</span>}
                  <span>📅 {new Date(c.createdAt).toLocaleDateString()}</span>
                  {c.assignedTo && <span>👤 {c.assignedTo.name}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {c.status === 'pending' && <button onClick={() => handleAssign(c._id)} className="btn-primary text-xs !px-2 !py-1">Assign</button>}
                {c.status !== 'resolved' && c.status !== 'closed' && <button onClick={() => handleResolve(c._id)} className="btn-success text-xs !px-2 !py-1">Resolve</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
