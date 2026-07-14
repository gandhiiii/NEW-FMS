import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';
  const hasPermission = (module, action) => {
    if (isSuperAdmin) return true;
    return user?.permissions?.[module]?.[action] === true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isSuperAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
