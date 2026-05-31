import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  withCredentials: true,
});
// Debug: log outgoing requests (only in dev)
if (import.meta.env.MODE !== 'production') {
  API.interceptors.request.use((config) => {
    try {
      // Avoid logging large binary payloads
      const logged = { url: config.url, method: config.method, data: config.data };
      // eslint-disable-next-line no-console
      console.debug('[API request]', logged);
    } catch (e) {
      // ignore
    }
    return config;
  });
}
// Attach token from localStorage if present
const token = localStorage.getItem("authToken");
if (token) {
  API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}
// Response interceptor to refresh token on 401
API.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[API response]', { url: response.config?.url, status: response.status, data: response.data });
      } catch (e) {}
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[API response error]', { url: originalRequest?.url, status: error.response?.status, data: error.response?.data });
      } catch (e) {}
    }
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // call refresh endpoint using cookie (withCredentials true)
        const res = await axios.post(`${API.defaults.baseURL}/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.token;
        const newRefresh = res.data.refreshToken;
        if (newToken) {
          localStorage.setItem("authToken", newToken);
          API.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          if (newRefresh) localStorage.setItem("refreshToken", newRefresh);
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return API(originalRequest);
        }
      } catch (err) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        // optional: redirect to login
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default API;

