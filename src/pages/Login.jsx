
import { useState } from "react";
import { loginUser } from "../api/userApi";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const payload = { identifier, password };
      console.log("Login payload", payload);
      const response = await loginUser(payload);
      console.log('Login response status', response.status);
      console.log('Login response data', response.data);
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("userId", response.data.userId);
      localStorage.setItem("userName", response.data.name);
      localStorage.setItem("userProfile", response.data.profile || "NORMAL");
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
        API.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
      }
      navigate("/dashboard");
    } catch (error) {
      const serverError = error?.response?.data;
      console.error('Login error', serverError || error);
      setError(
        typeof serverError === "string"
          ? serverError
          : serverError?.message || error.message || "Erro no login"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <h1>moveBRT</h1>

      <Logo />


      <input
        placeholder="Email ou Telemóvel"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

      <button className="btn" onClick={handleLogin} disabled={loading}>
        {loading ? "A autenticar..." : "Login"}
      </button>

      <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5 }}>
        Se quiseres testar a página de horários em tempo real sem login, abre:
        <a href="/realtime-public" style={{ color: "#007bff", marginLeft: 6 }}>
          http://localhost:5173/realtime-public
        </a>
      </p>

      <p style={{ marginTop: "15px" }}>
        Ainda não tens conta?
        <span
          style={{ color: "#007bff", cursor: "pointer", marginLeft: "5px" }}
          onClick={() => navigate("/register")}
        >
          Criar conta
        </span>
      </p>
    </div>
  );
}

