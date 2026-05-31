import { useState, useEffect } from "react";
import { validateTicket, syncOfflineValidations } from "../api/validationApi";
import API from "../api/api";
import { toDataURL } from "qrcode";

const OFFLINE_TICKET_CACHE_KEY = "movebrt-offline-ticket-cache";
const OFFLINE_VALIDATION_QUEUE_KEY = "movebrt-offline-validation-queue";

export default function Validation() {
  const userId = localStorage.getItem("userId");
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [line, setLine] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [offlineCachedTickets, setOfflineCachedTickets] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncMessage, setSyncMessage] = useState("");
  const [scanMessage, setScanMessage] = useState("");

  useEffect(() => {
    if (!userId) return;

    loadOfflineCache();
    loadOfflineQueue();
    fetchTickets();

    const handleOnline = () => {
      setOnlineStatus(true);
      setSyncMessage("Reconectado. A sincronizar expedições offline...");
      syncQueuedValidations();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      setSyncMessage("Modo offline ativo. Validações serão guardadas localmente.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId]);

  useEffect(() => {
    if (selectedTicket) {
      generateQRCode(selectedTicket);
    }
  }, [selectedTicket]);

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const res = await API.get(`/api/tickets/user/${userId}`);
      const ativos = (res.data || []).filter((t) => t.status === "ATIVO");
      setTickets(ativos);
      saveOfflineCache(ativos);
      if (ativos.length > 0) {
        setSelectedTicket((prev) => prev || ativos[0].id);
      }
    } catch (err) {
      // fallback ao cache offline
      if (!offlineCachedTickets.length) {
        setError("Não foi possível carregar os bilhetes online e não há dados offline.");
      }
    } finally {
      setLoadingTickets(false);
    }
  }

  function loadOfflineCache() {
    try {
      const stored = localStorage.getItem(OFFLINE_TICKET_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOfflineCachedTickets(parsed || []);
        if (!tickets.length && parsed?.length) {
          setSelectedTicket((prev) => prev || parsed[0].id);
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar cache offline", err);
    }
  }

  function saveOfflineCache(items) {
    try {
      localStorage.setItem(OFFLINE_TICKET_CACHE_KEY, JSON.stringify(items || []));
      setOfflineCachedTickets(items || []);
    } catch (err) {
      console.warn("Falha ao gravar cache offline", err);
    }
  }

  function loadOfflineQueue() {
    try {
      const stored = localStorage.getItem(OFFLINE_VALIDATION_QUEUE_KEY);
      if (stored) {
        setOfflineQueue(JSON.parse(stored) || []);
      }
    } catch (err) {
      console.warn("Falha ao carregar validações offline", err);
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_VALIDATION_QUEUE_KEY, JSON.stringify(queue || []));
      setOfflineQueue(queue || []);
    } catch (err) {
      console.warn("Falha ao gravar fila offline", err);
    }
  }

  async function generateQRCode(ticketId) {
    try {
      const payload = `MOVE-BRT|ticket:${ticketId}|user:${userId}|ts:${new Date().toISOString()}`;
      const url = await toDataURL(payload);
      setQrPayload(payload);
      setQrDataUrl(url);
    } catch (err) {
      console.warn("Erro ao gerar QR code", err);
      setQrDataUrl("");
      setQrPayload("");
    }
  }

  async function handleValidate() {
    if (!selectedTicket) {
      setError("Seleciona um bilhete.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    setScanMessage("");
    setSyncMessage("");

    const ticketId = Number(selectedTicket);
    const vehicle = vehicleId || "N/A";
    const lineValue = line || "N/A";

    if (!navigator.onLine) {
      const cachedTicket = offlineCachedTickets.find((t) => Number(t.id) === ticketId);
      if (!cachedTicket) {
        setError("Sem conexão e sem dados offline para este bilhete.");
        setLoading(false);
        return;
      }

      const now = new Date();
      const validUntil = cachedTicket.validUntil ? new Date(cachedTicket.validUntil) : null;
      if (!validUntil || validUntil < now) {
        const message = "Bilhete expirado (modo offline).";
        queueOfflineValidation(ticketId, false, vehicle, lineValue, message);
        setResult({ accepted: false, message, timestamp: now.toISOString() });
        setLoading(false);
        return;
      }

      if (cachedTicket.type?.toUpperCase() === "SIMPLES" && cachedTicket.status?.toUpperCase() === "UTILIZADO") {
        const message = "Bilhete já utilizado (modo offline).";
        queueOfflineValidation(ticketId, false, vehicle, lineValue, message);
        setResult({ accepted: false, message, timestamp: now.toISOString() });
        setLoading(false);
        return;
      }

      const message = "Validação aceita (modo offline). Será sincronizada quando estiver online.";
      const accepted = true;
      queueOfflineValidation(ticketId, accepted, vehicle, lineValue, message);

      const updatedCache = offlineCachedTickets.map((t) =>
        Number(t.id) === ticketId ? { ...t, status: "UTILIZADO" } : t
      );
      saveOfflineCache(updatedCache);
      setResult({ accepted, message, timestamp: now.toISOString() });
      setLoading(false);
      return;
    }

    try {
      const response = await validateTicket(ticketId, vehicle, lineValue);
      setResult(response.data);
      await fetchTickets();
      if (offlineQueue.length > 0) {
        await syncQueuedValidations();
      }
    } catch (err) {
      setError(err.response?.data || "Erro na validação");
    } finally {
      setLoading(false);
    }
  }

  function queueOfflineValidation(ticketId, accepted, vehicle, lineValue, message) {
    const nextQueue = [
      ...offlineQueue,
      {
        ticketId,
        vehicleId: vehicle,
        line: lineValue,
        accepted,
        timestamp: new Date().toISOString(),
      },
    ];
    saveOfflineQueue(nextQueue);
    setSyncMessage(message);
  }

  async function syncQueuedValidations() {
    if (offlineQueue.length === 0) {
      setSyncMessage("Nenhuma validação offline em fila para sincronizar.");
      return;
    }

    try {
      await syncOfflineValidations(offlineQueue);
      setSyncMessage("Validações offline sincronizadas com sucesso.");
      saveOfflineQueue([]);
      await fetchTickets();
    } catch (err) {
      setSyncMessage("Falha ao sincronizar validações offline. Tente novamente mais tarde.");
    }
  }

  async function handleSimulateNfc() {
    setError("");
    setScanMessage("");

    if (!navigator.clipboard) {
      setError("O navegador não suportou a simulação NFC.");
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError("O clipboard está vazio. Copia o payload do QR ou um ticket para simular NFC.");
        return;
      }

      const match = text.match(/ticket:(\d+)/);
      if (match) {
        setSelectedTicket(match[1]);
        setScanMessage("Leitura NFC simulada com sucesso. Bilhete selecionado.");
        return;
      }

      setError("O conteúdo do NFC não é válido. Use um payload gerado pelo QR code.");
    } catch (err) {
      console.warn(err);
      setError("Falha ao ler dados NFC do clipboard.");
    }
  }

  function copyQrPayload() {
    if (!qrPayload) return;
    navigator.clipboard.writeText(qrPayload).then(() => {
      setScanMessage("Payload do QR code copiado para o clipboard. Pode usar para simular NFC.");
    });
  }

  const displayTickets = tickets.length > 0 ? tickets : offlineCachedTickets;

  return (
    <div className="container">
      <h1>Validar Bilhete</h1>

      <p style={{ color: onlineStatus ? "#2e7d32" : "#d32f2f" }}>
        Status da ligação: {onlineStatus ? "Online" : "Offline"}
      </p>

      {loadingTickets && <p>A carregar bilhetes...</p>}

      {!loadingTickets && displayTickets.length === 0 && (
        <p style={{ color: "#888" }}>Não tens bilhetes ativos para validar.</p>
      )}

      {displayTickets.length > 0 && (
        <div className="validation-layout">
          <section className="card validation-panel">
            <h3>Seleciona o bilhete</h3>
            <div className="validation-ticket-list">
              {displayTickets.map((t) => (
                <div
                  key={t.id}
                  className={`card validation-ticket ${String(selectedTicket) === String(t.id) ? "selected" : ""}`}
                  onClick={() => setSelectedTicket(t.id)}
                >
                  <div>
                    <strong>{t.type}</strong>
                    <p className="ticket-validity">
                      Válido até: {t.validUntil ? new Date(t.validUntil).toLocaleString("pt-PT") : "-"}
                    </p>
                  </div>
                  <span className="ticket-id">#{t.id}</span>
                </div>
              ))}
            </div>

            <div className="validation-form">
              <input
                placeholder="ID do Veículo (opcional)"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              />
              <input
                placeholder="Linha (opcional)"
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
            </div>

            <button className="btn" onClick={handleValidate} disabled={loading}>
              {loading ? "A validar..." : "Validar Bilhete"}
            </button>

            <div className="validation-action-row">
              <button className="btn btn-secondary" type="button" onClick={handleSimulateNfc}>
                Simular NFC (clipboard)
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={syncQueuedValidations}
                disabled={offlineQueue.length === 0 || !onlineStatus}
              >
                Sincronizar validações offline ({offlineQueue.length})
              </button>
            </div>
          </section>

          <section className="card validation-panel">
            <div className="validation-status-card">
              <h3>Status da ligação</h3>
              <p className={onlineStatus ? "status-online" : "status-offline"}>
                {onlineStatus ? "Online" : "Offline"}
              </p>
            </div>

            {qrDataUrl && (
              <div className="card validation-qr-card">
                <h3>QR Code do bilhete</h3>
                <img src={qrDataUrl} alt="QR code do bilhete" className="qr-image" />
                <p className="qr-copy-note">
                  Copia o payload abaixo para simular a leitura NFC ou QR.
                </p>
                <pre className="qr-payload">{qrPayload}</pre>
                <button className="btn" type="button" onClick={copyQrPayload}>
                  Copiar payload para o clipboard
                </button>
              </div>
            )}

            {syncMessage && <p className="validation-message validation-info">{syncMessage}</p>}
            {scanMessage && <p className="validation-message validation-success">{scanMessage}</p>}
            {error && <p className="validation-message validation-error">{error}</p>}

            {result && (
              <div className="card validation-result-card">
                <h3 className={result.accepted ? "result-success" : "result-fail"}>
                  {result.accepted ? "✔ Bilhete Válido" : "✘ Bilhete Inválido"}
                </h3>
                <p>{result.message}</p>
                {result.timestamp && (
                  <p className="result-timestamp">
                    {new Date(result.timestamp).toLocaleString("pt-PT")}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
