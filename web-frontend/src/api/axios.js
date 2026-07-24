import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/auth/refresh/', { refresh });
          localStorage.setItem('access_token', res.data.access);
          err.config.headers.Authorization = `Bearer ${res.data.access}`;
          return axios(err.config);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
