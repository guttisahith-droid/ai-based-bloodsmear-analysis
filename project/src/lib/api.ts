import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging with more details
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      baseURL: error.config?.baseURL,
      data: error.response?.data,
      code: error.code
    };
    
    // Log detailed error information
    console.error('API Error Details:', errorDetails);
    
    // Specific handling for 404 errors
    if (error.response?.status === 404) {
      console.error(
        `❌ Endpoint not found: ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url}\n` +
        `   This usually means:\n` +
        `   1. The backend server is not running\n` +
        `   2. The endpoint path is incorrect\n` +
        `   3. The backend is running on a different port\n` +
        `   Check: http://${error.config?.baseURL?.replace(/^https?:\/\//, '')}/api/debug-cors`
      );
    }
    
    // Handle CORS errors
    if (
      error.message?.includes('CORS') ||
      error.message?.includes('Access-Control') ||
      (error.code === 'ERR_NETWORK' && !error.response && error.config)
    ) {
      console.error(
        `❌ CORS Error: Request blocked by CORS policy\n` +
        `   Frontend origin: ${window.location.origin}\n` +
        `   Backend URL: ${error.config?.baseURL}\n` +
        `   Solution: The backend needs to allow requests from ${window.location.origin}\n` +
        `   Check backend CORS configuration in app.py`
      );
    }
    
    // Handle network errors (server not reachable)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      // Only show network error if it's not a CORS issue
      if (error.response !== undefined || !error.config) {
        console.error(
          `❌ Network Error: Cannot connect to backend server at ${error.config?.baseURL}\n` +
        `   Please ensure the backend is running on ${error.config?.baseURL || 'http://localhost:5000'}`
        );
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
