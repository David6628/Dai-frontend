import { useEffect, useState } from "react";
import API from "../api/api";

function Notifications() {
  const userId = localStorage.getItem("userId");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    API.get(`/api/notifications/user/${userId}`)
      .then((res) => {
        setNotifications(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar notificações.");
        setLoading(false);
      });
  }, [userId]);

  return (
    <div className="container">
      <h1>Notificações</h1>
      {loading && <p>A carregar...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <p style={{ color: "#888" }}>Sem notificações.</p>
      )}
      {!loading && !error && (
        <ul style={{ padding: 0, listStyle: "none", width: "100%", maxWidth: 400 }}>
          {notifications.map((n, i) => (
            <li key={n.id || i} className="card" style={{ marginBottom: 12, padding: "16px 20px" }}>
              <strong>{n.title || n.tipo || "Notificação"}</strong>
              <p style={{ margin: "6px 0 0", color: "#555", fontSize: "0.95rem" }}>{n.message || n.mensagem || ""}</p>
              {n.createdAt && (
                <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
                  {new Date(n.createdAt).toLocaleString("pt-PT")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Notifications;
