import { useState, useEffect } from "react";
import { purchaseTicket } from "../api/ticketsApi";
import { getBalance } from "../api/walletApi";
import { processPayment } from "../api/walletApi";

const TICKET_TYPES = [
  { value: "SIMPLES", label: "Bilhete Simples", desc: "Válido 2 horas", price: 1.50 },
  { value: "DIARIO", label: "Bilhete Diário", desc: "Válido 24 horas", price: 3.00 },
  { value: "PASSE_MENSAL", label: "Passe Mensal", desc: "Válido 30 dias", price: 30.00 },
];

const PAYMENT_METHODS = [
  { value: "WALLET", label: "Saldo da Carteira" },
  { value: "CARD", label: "Cartão" },
  { value: "MB_WAY", label: "MBWay" },
  { value: "PAYPAL", label: "PayPal" },
];

function Tickets() {
  const userId = localStorage.getItem("userId");
  const [selectedType, setSelectedType] = useState("SIMPLES");
  const [method, setMethod] = useState("WALLET");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      getBalance(userId).then((res) => setBalance(res.data)).catch(() => {});
    }
  }, [userId]);

  const ticket = TICKET_TYPES.find((t) => t.value === selectedType);

  async function handleComprar() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (method === "WALLET") {
        // Compra direta com saldo da carteira
        const res = await purchaseTicket({ userId: parseInt(userId), type: selectedType });
        setSuccess(res.data);
        // Atualizar saldo
        const balRes = await getBalance(userId);
        setBalance(balRes.data);
      } else {
        // Pagamento externo
        const res = await processPayment({
          userId: parseInt(userId),
          amount: ticket.price,
          method,
          ticketType: selectedType,
          cardToken: "mock-token",
          idempotencyKey: `${userId}-${selectedType}-${Date.now()}`,
        });
        setSuccess(`Pagamento ${res.data.status}. Bilhete emitido!`);
        const balRes = await getBalance(userId);
        setBalance(balRes.data);
      }
    } catch (e) {
      setError(e.response?.data || "Erro ao comprar bilhete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Comprar Bilhete</h1>

      {balance !== null && (
        <p style={{ color: "#0d47a1", marginBottom: 8 }}>Saldo disponível: <strong>{Number(balance).toFixed(2)} €</strong></p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <div style={{ width: "100%", maxWidth: 420 }}>
        <h3 style={{ marginBottom: 12 }}>Tipo de bilhete</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {TICKET_TYPES.map((t) => (
            <div
              key={t.value}
              className="card"
              onClick={() => setSelectedType(t.value)}
              style={{
                padding: "16px 20px",
                cursor: "pointer",
                border: selectedType === t.value ? "2px solid #0d47a1" : "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{t.label}</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#888" }}>{t.desc}</p>
              </div>
              <span style={{ fontWeight: 700, color: "#0d47a1", fontSize: "1.1rem" }}>{t.price.toFixed(2)} €</span>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 12 }}>Método de pagamento</h3>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{ width: "100%", marginBottom: 20, padding: "12px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f7f8fa", fontSize: "1rem" }}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <button className="btn" onClick={handleComprar} disabled={loading}>
          {loading ? "A processar..." : `Comprar por ${ticket.price.toFixed(2)} €`}
        </button>
      </div>
    </div>
  );
}

export default Tickets;
