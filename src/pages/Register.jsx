import { useState } from "react";
import { registerUser } from "../api/userApi";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function validateFields() {
    if (!name || !email || !phone || !password || !dob) {
      setError("Preencha todos os campos obrigatórios.");
      return false;
    }
    // Email simples
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Email inválido.");
      return false;
    }
    // Telefone simples
    if (!/^\d{9,15}$/.test(phone)) {
      setError("Telefone inválido.");
      return false;
    }
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return false;
    }
    if (!terms) {
      setError("É necessário aceitar os termos e consentimento RGPD.");
      return false;
    }
    setError("");
    return true;
  }

  async function handleRegister() {
    setError("");
    setSuccess("");
    if (!validateFields()) return;
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        phone,
        password,
        birthDate: dob,
        termsAccepted: terms,
        gdprAccepted: terms,
      };
      const response = await registerUser(payload);
      if (response?.data?.token) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("userId", response.data.userId);
        localStorage.setItem("userName", response.data.name);
        localStorage.setItem("userProfile", response.data.profile || "NORMAL");
        localStorage.setItem("authToken", response.data.token);
        API.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
      }
      setSuccess("Conta criada com sucesso! A redirecionar...");
      navigate("/dashboard");
    } catch (error) {
      const serverError = error?.response?.data;
      setError(
        typeof serverError === "string"
          ? serverError
          : serverError?.message || error.message || "Erro ao registar utilizador"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <h2>Registar</h2>
      <Logo />
      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="tel"
        placeholder="Telemóvel (apenas dígitos)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        type="password"
        placeholder="Palavra-passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="date"
        placeholder="Data de nascimento"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
      />
      <div style={{ margin: "10px 0" }}>
        <input
          type="checkbox"
          checked={terms}
          onChange={() => setTerms((v) => !v)}
          id="terms"
        />
        <label htmlFor="terms" style={{ marginLeft: 8 }}>
          Aceito os termos de utilização e consentimento RGPD
        </label>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
      <button className="btn" onClick={handleRegister} disabled={loading}>
        {loading ? "A registar..." : "Registar"}
      </button>
    </div>
  );
}

