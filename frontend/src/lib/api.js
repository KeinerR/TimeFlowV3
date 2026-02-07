import axios from 'axios';

// Ensure HTTPS is always used for API calls
const getBaseUrl = () => {
  let url = process.env.REACT_APP_BACKEND_URL || '';
  // Force HTTPS in production
  if (url && !url.startsWith('https://') && window.location.protocol === 'https:') {
    url = url.replace('http://', 'https://');
  }
  return url;
};

export const API_URL = `${getBaseUrl()}/api`;

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to ensure token is included
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
