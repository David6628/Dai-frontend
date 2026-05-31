import { useEffect, useState } from "react";
import { getBalance, getWallet, addBalance, processPayment, getPaymentHistory } from "../api/walletApi";

const PAYMENT_METHODS = [
  { value: "CARD", label: "Cartão" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "MB_WAY", label: "MBWay" },
  { value: "BANK_TRANSFER", label: "Transferência Bancária" },
];

function Wallet() {
  const userId = localStorage.getItem("userId");
  const [balance, setBalance] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CARD");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [transactions, setTransactions] = useState([]);

  function loadWallet() {
    if (!userId) return;
    Promise.all([getBalance(userId), getWallet(userId), getPaymentHistory(userId)])
      .then(([balRes, walletRes, histRes]) => {
        setBalance(balRes.data);
        setTickets(walletRes.data.tickets || []);
        const hist = (histRes.data || []).map((p) => ({
          tipo: "Pagamento",
          metodo: p.method,
          valor: p.amount,
          data: p.createdAt ? new Date(p.createdAt).toLocaleString("pt-PT") : "",
          status: p.status,
        }));
        setTransactions(hist);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar carteira.");
        setLoading(false);
      });
  }

  useEffect(() => { loadWallet(); }, [userId]);

  async function handleAddBalance() {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Insere um valor válido.");
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await addBalance(userId, value);
      setBalance(res.data);
      setTransactions((prev) => [
        { tipo: "Depósito", metodo: PAYMENT_METHODS.find(m => m.value === method)?.label || method, valor: value, data: new Date().toLocaleString("pt-PT") },
        ...prev,
      ]);
      setSuccess("Saldo adicionado com sucesso!");
      setAmount("");
    } catch (e) {
      setError(e.response?.data || "Erro ao adicionar saldo.");
    } finally {
      setAdding(false);
    }
  }

  async function handlePayment() {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Insere um valor válido.");
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await processPayment({
        userId: parseInt(userId),
        amount: value,
        method,
        ticketType: "SIMPLES",
        cardToken: "mock-token",
        idempotencyKey: `${userId}-${Date.now()}`,
      });
      setTransactions((prev) => [
        { tipo: "Pagamento", metodo: PAYMENT_METHODS.find(m => m.value === method)?.label || method, valor: value, data: new Date().toLocaleString("pt-PT"), status: res.data.status },
        ...prev,
      ]);
      setSuccess(`Pagamento processado! Estado: ${res.data.status}`);
      setAmount("");
      loadWallet();
    } catch (e) {
      setError(e.response?.data || "Erro ao processar pagamento.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="container">
      <h1>Carteira</h1>

      {loading && <p>A carregar...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      {!loading && (
        <>
          {/* Saldo */}
          <div className="card" style={{ width: "100%", maxWidth: 400, textAlign: "center", marginBottom: 24 }}>
            <p style={{ fontSize: "1rem", color: "#888", margin: 0 }}>Saldo disponível</p>
            <h2 style={{ fontSize: "2.5rem", color: "#0d47a1", margin: "8px 0" }}>
              {balance !== null ? `${Number(balance).toFixed(2)} €` : "—"}
            </h2>
          </div>

          {/* Adicionar saldo / Pagar */}
          <div style={{ width: "100%", maxWidth: 400, marginBottom: 32 }}>
            <h3 style={{ marginBottom: 12 }}>Adicionar Saldo</h3>
            <input
              type="number"
              placeholder="Valor (€)"
              value={amount}
              min="0.01"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{ width: "100%", marginBottom: 12, padding: "12px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f7f8fa", fontSize: "1rem" }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn" onClick={handleAddBalance} disabled={adding} style={{ flex: 1 }}>
                {adding ? "A processar..." : "Adicionar"}
              </button>
              <button className="btn" onClick={handlePayment} disabled={adding} style={{ flex: 1 }}>
                {adding ? "A processar..." : "Pagar"}
              </button>
            </div>
          </div>

          {/* Histórico de Transações */}
          {transactions.length > 0 && (
            <div style={{ width: "100%", maxWidth: 400, marginBottom: 32 }}>
              <h3>Histórico de Transações</h3>
              <ul style={{ padding: 0, listStyle: "none" }}>
                {transactions.map((t, i) => (
                  <li key={i} className="card" style={{ marginBottom: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{t.tipo}</strong> — {t.metodo}
                      <div style={{ fontSize: "0.85rem", color: "#888" }}>{t.data}</div>
                    </div>
                    <div style={{ color: t.tipo === "Depósito" ? "green" : "#0d47a1", fontWeight: 600 }}>
                      {t.tipo === "Depósito" ? "+" : "-"}{Number(t.valor).toFixed(2)} €
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bilhetes */}
          <div style={{ width: "100%", maxWidth: 400 }}>
            <h3>Bilhetes</h3>
            {tickets.length === 0 ? (
              <p style={{ color: "#888" }}>Nenhum bilhete encontrado.</p>
            ) : (
              <ul style={{ padding: 0, listStyle: "none" }}>
                {tickets.map((t, i) => (
                  <li key={t.id || i} className="card" style={{ marginBottom: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>
                    <strong>{t.type || t.ticketType || "Bilhete"}</strong>
                    <span style={{ color: "#0d47a1" }}>{t.status || ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Wallet;