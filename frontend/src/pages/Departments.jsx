import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentAPI } from '../services/api';

export default function Departments() {
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', floor: '' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    try { const { data } = await departmentAPI.getAll(); setDepartments(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await departmentAPI.create(form);
      setShowForm(false);
      setForm({ name: '', category: '', description: '', floor: '' });
      fetchDepartments();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    try { await departmentAPI.delete(id); fetchDepartments(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Departments</h2>
        {isAdmin && <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Department</button>}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Department</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div><label className="label">Department Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required placeholder="e.g. Clinical, Administrative, Support" /></div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div><label className="label">Floor</label><input className="input" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d._id} className="card card-hover">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{d.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{d.category}</p>
              </div>
              {isAdmin && <button onClick={() => handleDelete(d._id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>}
            </div>
            {d.floor && <p className="text-xs text-gray-400 mt-2">📍 Floor: {d.floor}</p>}
            {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
            {d.hod && <p className="text-xs text-blue-600 mt-2">HOD: {d.hod.name}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
