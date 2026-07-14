import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const statCards = [
  { key: 'patients', label: 'Total Patients', sub: 'admitted', subLabel: 'Admitted', icon: '👨‍⚕️', color: 'blue' },
  { key: 'inventory', label: 'Inventory Items', sub: 'lowStock', subLabel: 'Low Stock', icon: '📦', color: 'green' },
  { key: 'tasks', label: 'Pending Tasks', sub: 'inProgress', subLabel: 'In Progress', icon: '✅', color: 'yellow' },
  { key: 'complaints', label: 'Complaints', sub: 'resolved', subLabel: 'Resolved', icon: '📝', color: 'red' },
  { key: 'ambulances', label: 'Ambulances', sub: 'onDuty', subLabel: 'On Duty', icon: '🚑', color: 'purple' },
  { key: 'gate', label: 'Gate Entries', sub: 'approved', subLabel: 'Approved', icon: '🚧', color: 'indigo' },
  { key: 'projects', label: 'Active Projects', sub: 'planning', subLabel: 'Planning', icon: '📋', color: 'orange' },
  { key: 'problems', label: 'Reported Problems', sub: 'resolved', subLabel: 'Resolved', icon: '⚠️', color: 'pink' }
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchStats = async () => {
    try {
      const { data } = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('dashboard:refresh', fetchStats);
    return () => socket.off('dashboard:refresh');
  }, [socket]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => {
          const main = stats?.[card.key];
          return (
            <div key={card.key} className="card card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{main?.total ?? main?.pending ?? main?.available ?? main?.active ?? main ?? 0}</p>
                </div>
                <span className="text-2xl">{card.icon}</span>
              </div>
              {main && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{card.subLabel}: <strong>{main[card.sub] ?? 0}</strong></span>
                  <span>Total: <strong>{main?.total ?? main?.pending + main?.inProgress ?? 0}</strong></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-medium mb-4">Recent Activity</h3>
          <div className="text-sm text-gray-500">
            <p>Dashboard shows real-time stats from all modules.</p>
            <p className="mt-2">Use the sidebar to navigate between modules.</p>
          </div>
        </div>
        <div className="card">
          <h3 className="font-medium mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Patient', path: '/patients', icon: '👨‍⚕️' },
              { label: 'Add Inventory', path: '/inventory', icon: '📦' },
              { label: 'Gate Entry', path: '/gate', icon: '🚧' },
              { label: 'Assign Task', path: '/tasks', icon: '✅' }
            ].map(action => (
              <a key={action.label} href={action.path}
                className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
