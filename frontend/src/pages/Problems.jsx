import { useState, useEffect } from 'react';
import { problemAPI } from '../services/api';

export default function Problems() {
  const [problems, setProblems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', department: '', location: '', priority: 'medium' });

  useEffect(() => { fetchProblems(); }, []);

  const fetchProblems = async () => {
    try { const { data } = await problemAPI.getAll(); setProblems(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await problemAPI.create(form); setShowForm(false); setForm({ title: '', description: '', category: '', department: '', location: '', priority: 'medium' }); fetchProblems(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleUpdate = async (id, status) => {
    const extra = {};
    if (status === 'resolved') {
      extra.solution = prompt('Solution details:');
      extra.rootCause = prompt('Root cause:');
      extra.preventiveMeasures = prompt('Preventive measures:');
    }
    try { await problemAPI.update(id, { status, ...extra }); fetchProblems(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Problems & Solutions Tracker</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Report Problem</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Report Problem</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div><label className="label">Problem Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required placeholder="e.g. Electrical, Plumbing, IT" /></div>
                  <div><label className="label">Priority</label>
                    <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                  <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {problems.map(p => (
          <div key={p._id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{p.title}</h3>
                  <span className={`badge-${p.priority === 'critical' ? 'red' : p.priority === 'high' ? 'yellow' : 'blue'}`}>{p.priority}</span>
                  <span className={`badge-${p.status === 'resolved' ? 'green' : p.status === 'in_progress' ? 'blue' : p.status === 'reviewing' ? 'yellow' : p.status === 'closed' ? 'gray' : 'red'}`}>{p.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>📂 {p.category}</span>
                  {p.department && <span>🏢 {p.department}</span>}
                  {p.location && <span>📍 {p.location}</span>}
                </div>
                {p.solution && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                    <p className="font-medium text-green-800">Solution</p>
                    <p className="text-green-700 mt-1">{p.solution}</p>
                    {p.rootCause && <p className="text-green-600 mt-1"><strong>Root Cause:</strong> {p.rootCause}</p>}
                    {p.preventiveMeasures && <p className="text-green-600 mt-1"><strong>Preventive:</strong> {p.preventiveMeasures}</p>}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {p.status === 'reported' && <button onClick={() => handleUpdate(p._id, 'reviewing')} className="btn-secondary text-xs !px-2 !py-1">Review</button>}
                {(p.status === 'reported' || p.status === 'reviewing') && <button onClick={() => handleUpdate(p._id, 'in_progress')} className="btn-primary text-xs !px-2 !py-1">Start</button>}
                {p.status === 'in_progress' && <button onClick={() => handleUpdate(p._id, 'resolved')} className="btn-success text-xs !px-2 !py-1">Resolve</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
