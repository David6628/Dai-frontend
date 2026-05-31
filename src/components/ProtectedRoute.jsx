import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api/api";

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setStatus('ok');
      return;
    }

    // try to refresh token using httpOnly cookie
    (async () => {
      try {
        const res = await API.post('/api/auth/refresh', {});
        if (res.data?.token) {
          localStorage.setItem('authToken', res.data.token);
          API.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          setStatus('ok');
          return;
        }
      } catch (e) {
        // ignore
      }
      setStatus('denied');
    })();
  }, [navigate]);

  if (status === 'checking') return null;
  if (status === 'denied') return <Navigate to="/" replace />;
  return children;
}
