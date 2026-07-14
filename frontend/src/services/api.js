import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.token) req.headers.Authorization = `Bearer ${user.token}`;
  return req;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  resetPassword: (data) => API.put('/auth/reset-password', data),
  changePassword: (data) => API.put('/auth/change-password', data)
};

export const userAPI = {
  getAll: () => API.get('/users'),
  getById: (id) => API.get(`/users/${id}`),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`)
};

export const departmentAPI = {
  getAll: () => API.get('/departments'),
  create: (data) => API.post('/departments', data),
  update: (id, data) => API.put(`/departments/${id}`, data),
  delete: (id) => API.delete(`/departments/${id}`)
};

export const inventoryAPI = {
  getAll: (params) => API.get('/inventory', { params }),
  getStats: () => API.get('/inventory/stats'),
  create: (data) => API.post('/inventory', data),
  update: (id, data) => API.put(`/inventory/${id}`, data),
  delete: (id) => API.delete(`/inventory/${id}`),
  addTransaction: (id, data) => API.post(`/inventory/${id}/transaction`, data)
};

export const gateAPI = {
  getAll: (params) => API.get('/gate', { params }),
  create: (data) => API.post('/gate', data),
  approve: (id, data) => API.put(`/gate/${id}/approve`, data),
  checkout: (id) => API.put(`/gate/${id}/checkout`)
};

export const ambulanceAPI = {
  getAll: (params) => API.get('/ambulance', { params }),
  create: (data) => API.post('/ambulance', data),
  update: (id, data) => API.put(`/ambulance/${id}`, data),
  updateLocation: (id, data) => API.put(`/ambulance/${id}/location`, data),
  dispatch: (id, data) => API.put(`/ambulance/${id}/dispatch`, data),
  complete: (id) => API.put(`/ambulance/${id}/complete`)
};

export const taskAPI = {
  getAll: (params) => API.get('/tasks', { params }),
  create: (data) => API.post('/tasks', data),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  delete: (id) => API.delete(`/tasks/${id}`)
};

export const patientAPI = {
  getAll: (params) => API.get('/patients', { params }),
  getById: (id) => API.get(`/patients/${id}`),
  create: (data) => API.post('/patients', data),
  update: (id, data) => API.put(`/patients/${id}`, data)
};

export const complaintAPI = {
  getAll: (params) => API.get('/complaints', { params }),
  create: (data) => API.post('/complaints', data),
  update: (id, data) => API.put(`/complaints/${id}`, data),
  delete: (id) => API.delete(`/complaints/${id}`)
};

export const roomAPI = {
  getAll: (params) => API.get('/rooms', { params }),
  create: (data) => API.post('/rooms', data),
  update: (id, data) => API.put(`/rooms/${id}`, data),
  updateItems: (id, data) => API.put(`/rooms/${id}/items`, data)
};

export const lostFoundAPI = {
  getAll: (params) => API.get('/lostfound', { params }),
  create: (data) => API.post('/lostfound', data),
  update: (id, data) => API.put(`/lostfound/${id}`, data),
  claim: (id, data) => API.put(`/lostfound/${id}/claim`, data)
};

export const projectAPI = {
  getAll: (params) => API.get('/projects', { params }),
  getById: (id) => API.get(`/projects/${id}`),
  create: (data) => API.post('/projects', data),
  update: (id, data) => API.put(`/projects/${id}`, data),
  addMilestone: (id, data) => API.put(`/projects/${id}/milestone`, data),
  addCost: (id, data) => API.put(`/projects/${id}/cost`, data)
};

export const problemAPI = {
  getAll: (params) => API.get('/problems', { params }),
  create: (data) => API.post('/problems', data),
  update: (id, data) => API.put(`/problems/${id}`, data)
};

export const floorChecklistAPI = {
  getAll: (params) => API.get('/floor-checklist', { params }),
  create: (data) => API.post('/floor-checklist', data),
  update: (id, data) => API.put(`/floor-checklist/${id}`, data),
  updateItems: (id, data) => API.put(`/floor-checklist/${id}/items`, data)
};

export const dashboardAPI = {
  getStats: () => API.get('/dashboard')
};

export default API;
