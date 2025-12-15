import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API methods
export const authService = {
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

export const analysisService = {
  analyzeImage: async (file: File, onUploadProgress: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
    
    return response.data;
  },
  
  getAnalysis: async (id: string) => {
    const response = await api.get(`/analyses/${id}`);
    return response.data;
  },
  
  getAnalyses: async (page = 1, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      ...filters,
    });
    
    const response = await api.get(`/analyses?${params}`);
    return response.data;
  },
};

export const statsService = {
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

export const modelService = {
  getStatus: async () => {
    const response = await api.get('/model/status');
    return response.data;
  },
  
  getClasses: async () => {
    const response = await api.get('/model/classes');
    return response.data;
  },
};

export default api;
