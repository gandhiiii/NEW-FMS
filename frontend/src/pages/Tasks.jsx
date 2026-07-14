import { useState, useEffect } from 'react';
import { taskAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Tasks() {
  const { user, hasPermission } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '', department: '', dueDate: '' });
  const [filter, setFilter] = useState({ status: '' });

  useEffect(() => { fetchTasks(); if (hasPermission('tasks', 'assign')) fetchEmployees(); }, []);

  const fetchTasks = async () => {
    try { const { data } = await taskAPI.getAll(filter); setTasks(data); } catch (err) { console.error(err); }
  };

  const fetchEmployees = async () => {
    try { const { data } = await userAPI.getAll(); setEmployees(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await taskAPI.create(form); setShowForm(false); setForm({ title: '', description: '', priority: 'medium', assignedTo: '', department: '', dueDate: '' }); fetchTasks(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try { await taskAPI.update(id, { status }); fetchTasks(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Task Management</h2>
        {hasPermission('tasks', 'create') && <button onClick={() => setShowForm(true)} className="btn-primary">+ New Task</button>}
      </div>
      <div className="flex gap-3 mb-4">
        <select className="select max-w-[160px]" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option><option value="in_progress">In Progress</option>
          <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchTasks} className="btn-primary text-xs">Filter</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Task</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Priority</label>
                    <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div><label className="label">Assign To</label>
                    <select className="select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                      <option value="">Select Employee</option>
                      {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
                    </select>
                  </div>
                  <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                  <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task._id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</h3>
                  <span className={`badge-${task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'yellow' : 'blue'}`}>{task.priority}</span>
                  <span className={`badge-${task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : task.status === 'cancelled' ? 'red' : 'yellow'}`}>{task.status}</span>
                </div>
                {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  {task.assignedTo && <span>👤 {task.assignedTo.name}</span>}
                  {task.department && <span>🏢 {task.department}</span>}
                  {task.dueDate && <span>📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {task.status === 'pending' && <button onClick={() => handleStatusUpdate(task._id, 'in_progress')} className="btn-primary text-xs !px-2 !py-1">Start</button>}
                {task.status === 'in_progress' && <button onClick={() => handleStatusUpdate(task._id, 'completed')} className="btn-success text-xs !px-2 !py-1">Complete</button>}
                {task.status !== 'completed' && task.status !== 'cancelled' && <button onClick={() => handleStatusUpdate(task._id, 'cancelled')} className="btn-danger text-xs !px-2 !py-1">Cancel</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
