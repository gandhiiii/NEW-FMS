import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

const defaultPermissions = {
  inventory: { view: false, create: false, edit: false, delete: false },
  gate: { view: false, approve: false, create: false },
  ambulance: { view: false, track: false, create: false },
  tasks: { view: false, assign: false, create: false },
  patients: { view: false, admit: false, discharge: false },
  complaints: { view: false, resolve: false, create: false },
  rooms: { view: false, checklist: false },
  lostfound: { view: false, resolve: false, create: false },
  projects: { view: false, create: false, edit: false },
  problems: { view: false, resolve: false, create: false },
  employees: { view: false, create: false, edit: false, delete: false },
  reports: { view: false }
};

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'employee', department: '', designation: '', permissions: { ...defaultPermissions } });

  useEffect(() => { if (isSuperAdmin) fetchUsers(); }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      setUsers(data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userAPI.update(editingUser._id, form);
      } else {
        await userAPI.register(form);
      }
      setShowForm(false);
      setEditingUser(null);
      setForm({ name: '', email: '', mobile: '', password: '', role: 'employee', department: '', designation: '', permissions: { ...defaultPermissions } });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, mobile: user.mobile, password: '', role: user.role, department: user.department, designation: user.designation, permissions: user.permissions || { ...defaultPermissions } });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await userAPI.delete(id); fetchUsers(); } catch (err) { alert('Error deleting user'); }
  };

  const togglePermission = (module, action) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: { ...prev.permissions[module], [action]: !prev.permissions[module]?.[action] }
      }
    }));
  };

  if (!isSuperAdmin) return <div className="card text-center text-gray-500 py-12">Only Super Admin can manage users</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <button onClick={() => { setEditingUser(null); setForm({ name: '', email: '', mobile: '', password: '', role: 'employee', department: '', designation: '', permissions: { ...defaultPermissions } }); setShowForm(true); }} className="btn-primary">+ New User</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                <div><label className="label">Mobile</label><input className="input" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} required /></div>
                <div><label className="label">{editingUser ? 'New Password (leave blank)' : 'Password'}</label><input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editingUser} /></div>
                <div><label className="label">Role</label>
                  <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="hod">HOD</option>
                    <option value="storekeeper">Store Keeper</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div className="mb-4">
                <label className="label mb-2">Permissions</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(defaultPermissions).map(([module, actions]) => (
                    <div key={module} className="border rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">{module}</p>
                      <div className="space-y-1">
                        {Object.keys(actions).map(action => (
                          <label key={action} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={form.permissions[module]?.[action] || false} onChange={() => togglePermission(module, action)} className="rounded" />
                            {action}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Employee ID</th>
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Department</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-cell font-mono text-xs">{u.employeeId}</td>
                <td className="table-cell font-medium">{u.name}</td>
                <td className="table-cell text-gray-500">{u.email}</td>
                <td className="table-cell"><span className={`badge-${u.role === 'superadmin' ? 'red' : u.role === 'admin' ? 'blue' : u.role === 'hod' ? 'yellow' : u.role === 'storekeeper' ? 'green' : 'gray'}`}>{u.role}</span></td>
                <td className="table-cell">{u.department || '-'}</td>
                <td className="table-cell"><span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="table-cell">
                  <button onClick={() => handleEdit(u)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                  <button onClick={() => handleDelete(u._id)} className="text-red-600 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
