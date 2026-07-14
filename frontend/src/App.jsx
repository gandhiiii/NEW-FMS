import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Departments from './pages/Departments';
import Inventory from './pages/Inventory';
import Gate from './pages/Gate';
import Ambulance from './pages/Ambulance';
import Tasks from './pages/Tasks';
import Patients from './pages/Patients';
import Complaints from './pages/Complaints';
import Rooms from './pages/Rooms';
import LostFound from './pages/LostFound';
import Projects from './pages/Projects';
import Problems from './pages/Problems';
import FloorChecklist from './pages/FloorChecklist';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="departments" element={<Departments />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="gate" element={<Gate />} />
        <Route path="ambulance" element={<Ambulance />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="patients" element={<Patients />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="lost-found" element={<LostFound />} />
        <Route path="projects" element={<Projects />} />
        <Route path="problems" element={<Problems />} />
        <Route path="floor-checklist" element={<FloorChecklist />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
