import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDiscounts, getTariffs, approveUserProfile } from "../api/adminPricingApi";

const TICKET_META = {
  SIMPLES: { label: "Bilhete Simples", desc: "Valido para uma viagem", color: "#4e6eea" },
  DIARIO: { label: "Passe Diario", desc: "Viagens ilimitadas durante 24h", color: "#2ecc71" },
  PASSE_MENSAL: { label: "Passe Mensal", desc: "Viagens ilimitadas durante 30 dias", color: "#e67e22" },
};

const PROFILE_META = {
  ESTUDANTE: { label: "Estudante", color: "#6c5ce7" },
  SENIOR: { label: "Senior", color: "#00b894" },
  NORMAL: { label: "Normal", color: "#636e72" },
  PENDENTE_VALIDACAO: { label: "Aguarda Validacao", color: "#fdcb6e" },
};

function calcDiscounted(price, percent) {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

export default function Tarifas() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const userProfile = localStorage.getItem("userProfile") || "NORMAL";

  const [tariffs, setTariffs] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestProfile, setRequestProfile] = useState("ESTUDANTE");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    Promise.all([getTariffs(), getDiscounts()])
      .then(([t, d]) => { setTariffs(t.data || []); setDiscounts(d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const discountMap = {};
  discounts.forEach((d) => { discountMap[d.profile] = d.discountPercent; });

  const myDiscount = discountMap[userProfile] || 0;
  const profileMeta = PROFILE_META[userProfile] || PROFILE_META.NORMAL;
  const canRequest = userProfile === "NORMAL";
  const isPending = userProfile === "PENDENTE_VALIDACAO";

  async function handleRequest() {
    setMsg({ type: "", text: "" });
    try {
      await approveUserProfile(Number(userId), requestProfile, userId);
      localStorage.setItem("userProfile", requestProfile);
      setMsg({ type: "ok", text: "Desconto ativado com sucesso!" });
      setRequesting(false);
      window.location.reload();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data || "Erro ao solicitar desconto." });
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#888" }}>A carregar tarifas...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", paddingBottom: 60 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <h1 style={{ color: "#3b6eea", fontWeight: 700, fontSize: "2rem", margin: "0 0 8px" }}>Tarifas e Descontos</h1>
          <p style={{ color: "#666", fontSize: "1.05rem", margin: 0 }}>Conheca os nossos bilhetes e os descontos disponiveis para o seu perfil.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", borderRadius: 14, padding: "18px 24px", border: "2px solid " + profileMeta.color, boxShadow: "0 2px 10px rgba(31,38,135,0.06)" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#23243a" }}>
              O seu perfil: <span style={{ color: profileMeta.color }}>{profileMeta.label}</span>
            </div>
            {myDiscount > 0 && <div style={{ color: profileMeta.color, fontWeight: 600, fontSize: "0.92rem" }}>Desconto de {myDiscount}% aplicado automaticamente</div>}
            {myDiscount === 0 && !isPending && <div style={{ color: "#888", fontSize: "0.9rem" }}>Sem desconto aplicado</div>}
            {isPending && <div style={{ color: "#e67e22", fontSize: "0.9rem" }}>A aguardar validacao do desconto</div>}
          </div>
        </div>

        {msg.text && (
          <div style={{ padding: "12px 18px", borderRadius: 10, fontWeight: 500, background: msg.type === "err" ? "#fff0f0" : "#f0fff4", color: msg.type === "err" ? "#c0392b" : "#1a7a40", border: "1px solid " + (msg.type === "err" ? "#f5c6c6" : "#b2dfcc"), textAlign: "center" }}>
            {msg.text}
          </div>
        )}

        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#3b6eea", textTransform: "uppercase", letterSpacing: "1px" }}>Bilhetes Disponiveis</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {tariffs.map((t) => {
            const meta = TICKET_META[t.ticketType] || { label: t.ticketType, color: "#3b6eea" };
            const discounted = myDiscount > 0 ? calcDiscounted(t.price, myDiscount) : null;
            return (
              <div key={t.ticketType} style={{ background: "#fff", borderRadius: 16, padding: "24px 20px", boxShadow: "0 2px 10px rgba(31,38,135,0.06)", border: "1px solid #edf0f7", borderTop: "4px solid " + meta.color, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#23243a", textAlign: "center" }}>{meta.label}</div>
                <div style={{ color: "#888", fontSize: "0.85rem", textAlign: "center" }}>{meta.desc}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {discounted !== null ? (
                    <>
                      <span style={{ textDecoration: "line-through", color: "#bbb", fontSize: "0.95rem" }}>{t.price.toFixed(2)} euro</span>
                      <span style={{ fontWeight: 800, fontSize: "1.6rem", color: meta.color }}>{discounted.toFixed(2)} euro</span>
                    </>
                  ) : (
                    <span style={{ fontWeight: 800, fontSize: "1.6rem", color: meta.color }}>{t.price.toFixed(2)} euro</span>
                  )}
                </div>
                {myDiscount > 0 && (
                  <div style={{ background: meta.color + "18", color: meta.color, borderRadius: 20, padding: "3px 12px", fontSize: "0.8rem", fontWeight: 700 }}>-{myDiscount}% desconto</div>
                )}
                <button style={{ color: "#fff", border: "none", borderRadius: 10, padding: "10px 28px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginTop: 8, width: "100%", background: meta.color }} onClick={() => navigate("/wallet")}>
                  Comprar
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#3b6eea", textTransform: "uppercase", letterSpacing: "1px" }}>Descontos por Perfil</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          {discounts.filter((d) => d.discountPercent > 0).map((d) => {
            const pm = PROFILE_META[d.profile] || { label: d.profile, color: "#3b6eea" };
            return (
              <div key={d.profile} style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 10px rgba(31,38,135,0.06)", border: "1px solid #edf0f7", borderLeft: "4px solid " + pm.color, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#23243a", fontSize: "1rem" }}>{pm.label}</div>
                    <div style={{ color: pm.color, fontWeight: 700, fontSize: "1.3rem" }}>{d.discountPercent}% desconto</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                  {tariffs.map((t) => {
                    const meta = TICKET_META[t.ticketType] || { label: t.ticketType };
                    return (
                      <div key={t.ticketType} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                        <span style={{ color: "#666" }}>{meta.label}</span>
                        <span style={{ fontWeight: 600, color: pm.color }}>{calcDiscounted(t.price, d.discountPercent).toFixed(2)} euro</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {canRequest && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px", boxShadow: "0 2px 10px rgba(31,38,135,0.06)", border: "1px solid #edf0f7" }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#23243a", marginBottom: 8 }}>Tem direito a desconto?</div>
            <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: 18, lineHeight: 1.5 }}>
              Se for estudante ou senior, pode ativar o seu desconto aqui. O desconto sera aplicado imediatamente em todas as compras.
            </p>
            {!requesting ? (
              <button style={{ background: "#3b6eea", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }} onClick={() => setRequesting(true)}>
                Solicitar Desconto
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontWeight: 600, color: "#23243a", fontSize: "0.95rem" }}>Selecione o seu perfil</label>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {["ESTUDANTE", "SENIOR"].map((p) => {
                    const pm = PROFILE_META[p];
                    const selected = requestProfile === p;
                    return (
                      <button key={p} onClick={() => setRequestProfile(p)}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 24px", borderRadius: 12, cursor: "pointer", border: selected ? "2px solid " + pm.color : "2px solid #e0e0e0", background: selected ? pm.color + "12" : "#f7f8fa" }}>
                        <span style={{ fontWeight: 600 }}>{pm.label}</span>
                        <span style={{ color: "#888", fontSize: "0.85rem" }}>-{discountMap[p] || "?"}% desconto</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={{ background: "#3b6eea", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }} onClick={handleRequest}>Confirmar</button>
                  <button style={{ background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }} onClick={() => setRequesting(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
