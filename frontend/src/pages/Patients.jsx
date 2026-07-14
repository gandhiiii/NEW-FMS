import { useState, useEffect } from 'react';
import { patientAPI } from '../services/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', contactNo: '', emergencyContact: '', address: '', bloodGroup: '', department: '', wardNo: '', roomNo: '', bedNo: '', doctorAssigned: '', diagnosis: '', symptoms: '', admissionType: 'regular' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try { const { data } = await patientAPI.getAll({ search }); setPatients(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await patientAPI.create(form); setShowForm(false); setForm({ name: '', age: '', gender: 'male', contactNo: '', emergencyContact: '', address: '', bloodGroup: '', department: '', wardNo: '', roomNo: '', bedNo: '', doctorAssigned: '', diagnosis: '', symptoms: '', admissionType: 'regular' }); fetchPatients(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDischarge = async (id) => {
    const summary = prompt('Discharge summary:');
    if (summary === null) return;
    try { await patientAPI.update(id, { status: 'discharged', dischargeSummary: summary }); fetchPatients(); } catch (err) { alert('Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Patient Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Admission</button>
      </div>
      <div className="flex gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Search by name, phone, room..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={fetchPatients} className="btn-primary text-xs">Search</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">New Patient Admission</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Patient Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Age</label><input type="number" className="input" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                <div><label className="label">Gender</label>
                  <select className="select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div><label className="label">Blood Group</label><input className="input" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} /></div>
                <div><label className="label">Contact No</label><input className="input" value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} /></div>
                <div><label className="label">Emergency Contact</label><input className="input" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} /></div>
                <div><label className="label">Admission Type</label>
                  <select className="select" value={form.admissionType} onChange={e => setForm({ ...form, admissionType: e.target.value })}>
                    <option value="regular">Regular</option><option value="emergency">Emergency</option><option value="referral">Referral</option>
                  </select>
                </div>
                <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                <div><label className="label">Ward No</label><input className="input" value={form.wardNo} onChange={e => setForm({ ...form, wardNo: e.target.value })} /></div>
                <div><label className="label">Room No</label><input className="input" value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} /></div>
                <div><label className="label">Bed No</label><input className="input" value={form.bedNo} onChange={e => setForm({ ...form, bedNo: e.target.value })} /></div>
                <div><label className="label">Doctor Assigned</label><input className="input" value={form.doctorAssigned} onChange={e => setForm({ ...form, doctorAssigned: e.target.value })} /></div>
                <div className="col-span-2"><label className="label">Diagnosis</label><textarea className="input" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} rows={2} /></div>
                <div className="col-span-2"><label className="label">Symptoms</label><textarea className="input" value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} rows={2} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Admit Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewPatient && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-10 px-4" onClick={e => e.target === e.currentTarget && setViewPatient(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Patient Details</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-gray-500">Name</p><p className="font-medium">{viewPatient.name}</p></div>
                <div><p className="text-gray-500">Age/Gender</p><p className="font-medium">{viewPatient.age}/{viewPatient.gender}</p></div>
                <div><p className="text-gray-500">Contact</p><p className="font-medium">{viewPatient.contactNo}</p></div>
                <div><p className="text-gray-500">Blood Group</p><p className="font-medium">{viewPatient.bloodGroup}</p></div>
                <div><p className="text-gray-500">Room/Bed</p><p className="font-medium">{viewPatient.roomNo}/{viewPatient.bedNo}</p></div>
                <div><p className="text-gray-500">Doctor</p><p className="font-medium">{viewPatient.doctorAssigned}</p></div>
                <div><p className="text-gray-500">Admission</p><p className="font-medium">{new Date(viewPatient.admissionDate).toLocaleDateString()}</p></div>
                <div><p className="text-gray-500">Status</p><span className={viewPatient.status === 'admitted' ? 'badge-green' : 'badge-gray'}>{viewPatient.status}</span></div>
              </div>
              {viewPatient.diagnosis && <div><p className="text-gray-500">Diagnosis</p><p>{viewPatient.diagnosis}</p></div>}
              {viewPatient.dischargeSummary && <div><p className="text-gray-500">Discharge Summary</p><p>{viewPatient.dischargeSummary}</p></div>}
            </div>
            <button onClick={() => setViewPatient(null)} className="btn-secondary mt-6">Close</button>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Patient</th>
              <th className="table-header">Contact</th>
              <th className="table-header">Room/Bed</th>
              <th className="table-header">Doctor</th>
              <th className="table-header">Admission</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-cell">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.age}/{p.gender} | {p.bloodGroup}</p>
                </td>
                <td className="table-cell text-xs">{p.contactNo}</td>
                <td className="table-cell text-xs">{p.roomNo || '-'}/{p.bedNo || '-'}</td>
                <td className="table-cell text-xs">{p.doctorAssigned || '-'}</td>
                <td className="table-cell text-xs">{new Date(p.admissionDate).toLocaleDateString()}</td>
                <td className="table-cell"><span className={p.status === 'admitted' ? 'badge-green' : 'badge-gray'}>{p.status}</span></td>
                <td className="table-cell">
                  <button onClick={() => setViewPatient(p)} className="text-blue-600 hover:underline text-xs mr-2">View</button>
                  {p.status === 'admitted' && <button onClick={() => handleDischarge(p._id)} className="text-red-600 hover:underline text-xs">Discharge</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
