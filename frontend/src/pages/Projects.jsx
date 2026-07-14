import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewProject, setViewProject] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', department: '', priority: 'medium', startDate: '', endDate: '', estimatedCost: '' });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try { const { data } = await projectAPI.getAll(); setProjects(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await projectAPI.create(form); setShowForm(false); setForm({ title: '', description: '', category: '', department: '', priority: 'medium', startDate: '', endDate: '', estimatedCost: '' }); fetchProjects(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const addCost = async (projectId) => {
    const category = prompt('Cost category:');
    const amount = prompt('Amount:');
    if (!category || !amount) return;
    try {
      await projectAPI.addCost(projectId, { category, estimatedAmount: +amount });
      fetchProjects();
    } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Upcoming Projects</h2>
        {hasPermission('projects', 'create') && <button onClick={() => setShowForm(true)} className="btn-primary">+ New Project</button>}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Project</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div><label className="label">Project Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required placeholder="e.g. Construction, IT, Medical" /></div>
                  <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                  <div><label className="label">Priority</label>
                    <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div><label className="label">Estimated Cost (₹)</label><input type="number" className="input" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} /></div>
                  <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewProject && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setViewProject(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">{viewProject.title}</h3>
            <div className="text-sm space-y-4">
              <p className="text-gray-600">{viewProject.description}</p>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-gray-500">Category</p><p className="font-medium">{viewProject.category}</p></div>
                <div><p className="text-gray-500">Status</p><span className={`badge-${viewProject.status === 'completed' ? 'green' : viewProject.status === 'in_progress' ? 'blue' : viewProject.status === 'planning' ? 'yellow' : viewProject.status === 'on_hold' ? 'red' : 'gray'}`}>{viewProject.status}</span></div>
                <div><p className="text-gray-500">Budget</p><p className="font-medium">₹{(viewProject.estimatedCost || 0).toLocaleString()}</p></div>
              </div>
              {viewProject.costs?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Cost Breakdown</h4>
                  <div className="space-y-1">
                    {viewProject.costs.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b">
                        <span>{c.category}</span>
                        <span>₹{c.estimatedAmount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewProject.milestones?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Milestones</h4>
                  <div className="space-y-2">
                    {viewProject.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm">{m.title}</span>
                        {m.dueDate && <span className="text-xs text-gray-400">{new Date(m.dueDate).toLocaleDateString()}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setViewProject(null)} className="btn-secondary mt-6">Close</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p._id} className="card card-hover cursor-pointer" onClick={() => setViewProject(p)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-xs text-gray-500">{p.category} | {p.department}</p>
              </div>
              <span className={`badge-${p.priority === 'critical' ? 'red' : p.priority === 'high' ? 'yellow' : 'blue'}`}>{p.priority}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.description}</p>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
              <span className={`badge-${p.status === 'completed' ? 'green' : p.status === 'in_progress' ? 'blue' : 'yellow'}`}>{p.status}</span>
              <span>₹{(p.estimatedCost || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
