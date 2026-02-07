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

// Helper function to parse error messages
export const parseErrorMessage = (error, defaultMessage = 'Server error') => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') {
      return detail;
    } else if (Array.isArray(detail)) {
      // Pydantic validation error
      return detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
    } else if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
  }
  return defaultMessage;
};

// Request interceptor to add trailing slash and token
api.interceptors.request.use(
  (config) => {
    // Add token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add trailing slash if not present (prevents redirects)
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      config.url = config.url + '/';
    } else if (config.url && config.url.includes('?') && !config.url.split('?')[0].endsWith('/')) {
      const [path, query] = config.url.split('?');
      config.url = `${path}/?${query}`;
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
