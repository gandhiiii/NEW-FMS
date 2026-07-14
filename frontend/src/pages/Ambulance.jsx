import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ambulanceAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ambulanceIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

function LiveTracker({ ambulances }) {
  const map = useMap();
  useEffect(() => {
    if (ambulances.length > 0) {
      const bounds = L.latLngBounds(ambulances.filter(a => a.currentLocation?.lat).map(a => [a.currentLocation.lat, a.currentLocation.lng]));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
    }
  }, [ambulances, map]);
  return null;
}

export default function Ambulance() {
  const [ambulances, setAmbulances] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [dispatchForm, setDispatchForm] = useState(null);
  const [form, setForm] = useState({ vehicleNo: '', driverName: '', driverContact: '', attendantName: '', attendantContact: '', ambulanceType: 'basic' });
  const [dispatch, setDispatch] = useState({ destination: { lat: '', lng: '', address: '' }, patientName: '', patientCondition: '' });
  const socket = useSocket();

  useEffect(() => { fetchAmbulances(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('ambulance:location', (data) => {
      setAmbulances(prev => prev.map(a => a._id === data._id ? { ...a, currentLocation: data.currentLocation } : a));
    });
    socket.on('ambulance:status', (data) => {
      setAmbulances(prev => prev.map(a => a._id === data._id ? { ...a, status: data.status } : a));
    });
    return () => { socket.off('ambulance:location'); socket.off('ambulance:status'); };
  }, [socket]);

  const fetchAmbulances = async () => {
    try { const { data } = await ambulanceAPI.getAll(); setAmbulances(data); } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await ambulanceAPI.create(form); setShowForm(false); setForm({ vehicleNo: '', driverName: '', driverContact: '', attendantName: '', attendantContact: '', ambulanceType: 'basic' }); fetchAmbulances(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    try {
      await ambulanceAPI.dispatch(dispatchForm._id, {
        destination: { lat: +dispatch.destination.lat, lng: +dispatch.destination.lng, address: dispatch.destination.address },
        patientName: dispatch.patientName, patientCondition: dispatch.patientCondition
      });
      setDispatchForm(null);
      setDispatch({ destination: { lat: '', lng: '', address: '' }, patientName: '', patientCondition: '' });
      fetchAmbulances();
    } catch (err) { alert('Dispatch error'); }
  };

  const handleComplete = async (id) => {
    try { await ambulanceAPI.complete(id); fetchAmbulances(); } catch (err) { alert('Error'); }
  };

  const handleLocationUpdate = async (id) => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Current Location' };
      try {
        const { data } = await ambulanceAPI.updateLocation(id, location);
        if (socket) socket.emit('ambulance:location', data);
        fetchAmbulances();
      } catch (err) { alert('Error updating location'); }
    });
  };

  const simulateMovement = (id) => {
    let lat = 28.6139, lng = 77.209;
    const interval = setInterval(async () => {
      lat += (Math.random() - 0.5) * 0.01;
      lng += (Math.random() - 0.5) * 0.01;
      const location = { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, address: 'In Transit' };
      try {
        const { data } = await ambulanceAPI.updateLocation(id, location);
        if (socket) socket.emit('ambulance:location', data);
      } catch (err) { clearInterval(interval); }
    }, 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Ambulance Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Ambulance</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {ambulances.map(a => (
          <div key={a._id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{a.vehicleNo}</h3>
                <p className="text-xs text-gray-500">{a.ambulanceType.toUpperCase()} | Driver: {a.driverName}</p>
              </div>
              <span className={`badge-${a.status === 'available' ? 'green' : a.status === 'on_duty' ? 'red' : a.status === 'maintenance' ? 'yellow' : 'gray'}`}>{a.status}</span>
            </div>
            {a.currentLocation?.lat ? (
              <p className="text-xs text-gray-400 mt-2">📍 {a.currentLocation.lat.toFixed(4)}, {a.currentLocation.lng.toFixed(4)}</p>
            ) : <p className="text-xs text-gray-400 mt-2">📍 Location not set</p>}
            {a.patientName && <p className="text-xs text-blue-600 mt-1">Patient: {a.patientName}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleLocationUpdate(a._id)} className="btn-secondary text-xs !px-2 !py-1">📍 Update Location</button>
              {a.status === 'available' && <button onClick={() => { setDispatchForm(a); }} className="btn-primary text-xs !px-2 !py-1">Dispatch</button>}
              {a.status === 'on_duty' && <button onClick={() => handleComplete(a._id)} className="btn-success text-xs !px-2 !py-1">Complete</button>}
              <button onClick={() => simulateMovement(a._id)} className="btn-secondary text-xs !px-2 !py-1">Simulate</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card h-[400px] overflow-hidden">
        <h3 className="font-medium mb-3">Live Ambulance Tracking</h3>
        <MapContainer center={[28.6139, 77.209]} zoom={12} className="h-[340px] rounded-lg" scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LiveTracker ambulances={ambulances} />
          {ambulances.filter(a => a.currentLocation?.lat).map(a => (
            <Marker key={a._id} position={[a.currentLocation.lat, a.currentLocation.lng]} icon={ambulanceIcon}>
              <Popup>
                <strong>{a.vehicleNo}</strong><br />
                Driver: {a.driverName}<br />
                Status: {a.status}<br />
                {a.patientName && <>Patient: {a.patientName}</>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Add Ambulance</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Vehicle No</label><input className="input" value={form.vehicleNo} onChange={e => setForm({ ...form, vehicleNo: e.target.value })} required /></div>
                <div><label className="label">Type</label>
                  <select className="select" value={form.ambulanceType} onChange={e => setForm({ ...form, ambulanceType: e.target.value })}>
                    <option value="basic">Basic</option><option value="advanced">Advanced</option><option value="icu">ICU</option>
                  </select>
                </div>
                <div><label className="label">Driver Name</label><input className="input" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} required /></div>
                <div><label className="label">Driver Contact</label><input className="input" value={form.driverContact} onChange={e => setForm({ ...form, driverContact: e.target.value })} /></div>
                <div><label className="label">Attendant Name</label><input className="input" value={form.attendantName} onChange={e => setForm({ ...form, attendantName: e.target.value })} /></div>
                <div><label className="label">Attendant Contact</label><input className="input" value={form.attendantContact} onChange={e => setForm({ ...form, attendantContact: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dispatchForm && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20 px-4" onClick={e => e.target === e.currentTarget && setDispatchForm(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Dispatch: {dispatchForm.vehicleNo}</h3>
            <form onSubmit={handleDispatch}>
              <div className="space-y-4">
                <div><label className="label">Patient Name</label><input className="input" value={dispatch.patientName} onChange={e => setDispatch({ ...dispatch, patientName: e.target.value })} required /></div>
                <div><label className="label">Patient Condition</label><textarea className="input" value={dispatch.patientCondition} onChange={e => setDispatch({ ...dispatch, patientCondition: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Destination Lat</label><input type="number" step="any" className="input" value={dispatch.destination.lat} onChange={e => setDispatch({ ...dispatch, destination: { ...dispatch.destination, lat: e.target.value } })} /></div>
                  <div><label className="label">Destination Lng</label><input type="number" step="any" className="input" value={dispatch.destination.lng} onChange={e => setDispatch({ ...dispatch, destination: { ...dispatch.destination, lng: e.target.value } })} /></div>
                </div>
                <div><label className="label">Destination Address</label><input className="input" value={dispatch.destination.address} onChange={e => setDispatch({ ...dispatch, destination: { ...dispatch.destination, address: e.target.value } })} /></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setDispatchForm(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
