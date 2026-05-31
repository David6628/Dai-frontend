import { useEffect, useMemo, useState, useRef } from "react";
import { getLines, getCombined, getStops } from "../api/realtimeApi";
import "../styles/realtime.css";
import L from 'leaflet'
import Logo from "../components/Logo";

function normalizeCoordinates(list) {
  const coords = list
      .filter((item) => item && item.latitude != null && item.longitude != null)
  if (coords.length === 0) return null;

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export default function Realtime() {
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [realtimeError, setRealtimeError] = useState("");
  const [linesError, setLinesError] = useState("");
  const [search, setSearch] = useState("");

  const filteredLines = useMemo(() => {
    if (!search.trim()) return lines;
    return lines.filter((line) => {
      const lineName = typeof line === "string" ? line : line.name || line.id || "";
      return lineName.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [lines, search]);

  const mapBounds = useMemo(() => normalizeCoordinates([...vehicles, ...stops]), [vehicles, stops]);

  async function fetchLines() {
    setLoadingLines(true);
    setScheduleError("");
    setRealtimeError("");
    setLinesError("");
    try {
      const response = await getLines();
      setLines(response.data || []);
    } catch (err) {
      setLinesError("Erro ao obter linhas. Verifique se está autenticado e se o servidor está disponível.");
    } finally {
      setLoadingLines(false);
    }
  }

  async function loadDataForLine(lineId) {
    if (!lineId) return;
    setLoadingData(true);
    setScheduleError("");
    setRealtimeError("");
    setSelectedVehicle(null);
    setSelectedStop(null);

    try {
      // Prefer combined endpoint that returns schedules + vehicle estimates + stops
      const res = await getCombined(lineId);
      const data = res.data || {};
      setSchedule(data.schedules || []);
      setVehicles(data.vehicles || []);
      setStops(data.stops || []);

      if (!Array.isArray(data.stops) || data.stops.length === 0) {
        await loadStopsForLine(lineId);
      }
    } catch (err) {
      const url = err.response?.config?.url || '';
      if (url.includes("/schedules")) {
        setScheduleError("Falha ao obter horários planeados.");
      } else if (url.includes("/vehicles")) {
        setRealtimeError("Falha ao obter localização em tempo real.");
      } else if (url.includes("/stops")) {
        setRealtimeError("Falha ao obter paragens.");
      } else {
        setScheduleError("Erro ao obter dados.");
      }
    } finally {
      setLoadingData(false);
    }
  }

  async function loadStopsForLine(lineId) {
    try {
      const res = await getStops(lineId);
      setStops(res.data || []);
    } catch (err) {
      setRealtimeError("Falha ao obter paragens.");
    }
  }

  function handleSelectLine(lineId) {
    setSelectedLine(lineId);
    loadDataForLine(lineId);
  }

  useEffect(() => {
    fetchLines();
  }, []);

  useEffect(() => {
    if (!selectedLine) return undefined;
    const interval = setInterval(() => loadDataForLine(selectedLine), 25000);
    return () => clearInterval(interval);
  }, [selectedLine]);

  const mapRef = useRef(null);

  useEffect(() => {
    // initialize map when we have vehicles or stops
    const mapDiv = document.getElementById('leaflet-map');
    if (!mapDiv) return;

    if (!mapRef.current && (vehicles.length > 0 || stops.length > 0)) {
      const first = vehicles.find(v => v.latitude && v.longitude) || stops.find(s => s.latitude && s.longitude);
      const center = first ? [first.latitude, first.longitude] : [0, 0];
      mapRef.current = L.map(mapDiv, { center, zoom: 13, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    if (!mapRef.current) return;

    // remove previous markers layer if exists
    if (mapRef.current._vehiclesLayer) {
      mapRef.current.removeLayer(mapRef.current._vehiclesLayer);
    }
    if (mapRef.current._stopsLayer) {
      mapRef.current.removeLayer(mapRef.current._stopsLayer);
    }
    if (mapRef.current._routeLine) {
      mapRef.current.removeLayer(mapRef.current._routeLine);
    }

    const vehicleLayer = L.layerGroup();
    const stopLayer = L.layerGroup();
    const latlngs = [];

    stops.forEach((stop) => {
      const lat = Number(stop.latitude);
      const lng = Number(stop.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        latlngs.push([lat, lng]);
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#2563eb',
          fillColor: '#bfdbfe',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(stopLayer);
        marker.bindTooltip(stop.name, { permanent: false, direction: 'top' });
        marker.on('click', () => setSelectedStop(stop));
      }
    });

    vehicles.forEach((vehicle) => {
      const lat = Number(vehicle.latitude);
      const lng = Number(vehicle.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        latlngs.push([lat, lng]);
        const label = vehicle.vehicleId || vehicle.id || '';
        const icon = L.divIcon({
          html: `<div style="background:#c8102e;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff">${label}</div>`,
          className: ''
        });
        const m = L.marker([lat, lng], { icon }).addTo(vehicleLayer);
        const popupHtml = `<div style="font-weight:700;margin-bottom:6px">Veículo ${label}</div>
          <div style=\"font-size:0.9rem;color:#333\">Última: ${vehicle.lastUpdated ? new Date(vehicle.lastUpdated).toLocaleString() : '-'}<br/>Est.: ${vehicle.estimatedArrival ? new Date(vehicle.estimatedArrival).toLocaleTimeString() : '-'} ${vehicle.delaySeconds ? '(' + Math.round(vehicle.delaySeconds/60) + ' min)' : ''}</div>`;
        m.bindPopup(popupHtml);
        m.on('click', () => {
          setSelectedVehicle(vehicle);
          try { m.openPopup(); } catch (e) {}
        });
      }
    });

    const routeCoords = stops
      .filter((stop) => stop.latitude != null && stop.longitude != null)
      .sort((a,b)=> (a.positionOrder || 0) - (b.positionOrder || 0))
      .map((stop) => [stop.latitude, stop.longitude]);
    if (routeCoords.length > 1) {
      mapRef.current._routeLine = L.polyline(routeCoords, { color: '#0284c7', weight: 4, opacity: 0.7 }).addTo(mapRef.current);
    }

    stopLayer.addTo(mapRef.current);
    vehicleLayer.addTo(mapRef.current);
    mapRef.current._vehiclesLayer = vehicleLayer;
    mapRef.current._stopsLayer = stopLayer;
    if (routeCoords.length > 0) {
      latlngs.push(...routeCoords);
    }

    if (latlngs.length > 0) {
      try { mapRef.current.fitBounds(latlngs, { padding: [40, 40] }); } catch (e) {}
    }

    return () => {
      // cleanup markers on unmount
      if (mapRef.current && mapRef.current._vehiclesLayer) {
        mapRef.current.removeLayer(mapRef.current._vehiclesLayer);
        mapRef.current._vehiclesLayer = null;
      }
      if (mapRef.current && mapRef.current._stopsLayer) {
        mapRef.current.removeLayer(mapRef.current._stopsLayer);
        mapRef.current._stopsLayer = null;
      }
      if (mapRef.current && mapRef.current._routeLine) {
        mapRef.current.removeLayer(mapRef.current._routeLine);
        mapRef.current._routeLine = null;
      }
    };
  }, [vehicles, stops]);

  useEffect(() => {
    if (!selectedVehicle || !mapRef.current) return;
    const lat = Number(selectedVehicle.latitude);
    const lng = Number(selectedVehicle.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      try { mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 13), { animate: true }); } catch (e) {}
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (!selectedStop || !mapRef.current) return;
    const lat = Number(selectedStop.latitude);
    const lng = Number(selectedStop.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      try { mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14), { animate: true }); } catch (e) {}
    }
  }, [selectedStop]);

  return (
    <div className="container">
      <h1>Consultar Horários e Localização</h1>
      <Logo />

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 280px", minWidth: 280 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
            Pesquisa de linha
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome da linha"
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #dcdcdc" }}
          />
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 280 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
            Selecionar linha
          </label>
          <select
            value={selectedLine}
            onChange={(e) => handleSelectLine(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #dcdcdc" }}
          >
            <option value="">-- Escolha uma linha --</option>
            {filteredLines.map((line) => {
              const lineId = typeof line === "string" ? line : line.id;
              const lineName = typeof line === "string" ? line : line.name || line.id;
              return (
                <option key={lineId} value={lineId}>
                  {lineName}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loadingLines && <p>A carregar linhas...</p>}
      {linesError && <p style={{ color: "#c8102e" }}>{linesError}</p>}
      {scheduleError && <p style={{ color: "#c8102e" }}>{scheduleError}</p>}
      {realtimeError && <p style={{ color: "#c8102e" }}>{realtimeError}</p>}
      {selectedLine && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Horários Planeados</h2>
              <span style={{ color: "#888", fontSize: "0.9rem" }}>
                Atualiza a cada 25s
              </span>
            </div>
            {loadingData && <p>A carregar dados...</p>}
            {!loadingData && schedule.length === 0 && (
              <p style={{ color: "#888" }}>Nenhum horário disponível para esta linha.</p>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {schedule.map((item, index) => (
                <li key={index} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e5e5" }}>
                  <div style={{ fontWeight: 700 }}>{item.stopId || item.stop || item.paragem || item.station || "Paragem"}</div>
                  <div style={{ color: "#555", marginTop: 4 }}>
                    {item.scheduledArrival ? new Date(item.scheduledArrival).toLocaleTimeString() : (item.time || item.departureTime || item.arrivalTime || item.hora || "—")}
                  </div>
                  {item.status && (
                    <div style={{ marginTop: 8, color: item.status === "Atraso" ? "#c8102e" : "#2d7a33" }}>
                      {item.status}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Localização dos Veículos</h2>
              <span style={{ color: "#888", fontSize: "0.9rem" }}>Tempo real</span>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e5e5", overflow: "hidden", minHeight: 320 }}>
              <div style={{ position: "relative", background: "linear-gradient(180deg, #eef4fb 0%, #ffffff 100%)", height: 320 }}>
                <div style={{ position: "absolute", inset: 0, padding: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, marginBottom: 12, alignItems: "center" }}>
                    <div style={{ padding: 8, background: "rgba(200,16,46,0.15)", borderRadius: 12, fontWeight: 700, color: "#c8102e", fontSize: "0.9rem", whiteSpace: "nowrap" }}>Veículos: {vehicles.length}</div>
                    <div style={{ padding: 8, background: "rgba(0,0,0,0.04)", borderRadius: 12, fontSize: "0.9rem", textAlign: "center" }}>Linha: {selectedLine}</div>
                    <div style={{ padding: 8, background: "rgba(0,0,0,0.04)", borderRadius: 12, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{new Date().toLocaleTimeString()}</div>
                  </div>
                  <div style={{ position: "relative", width: "100%", height: 220, background: "linear-gradient(135deg, #d9e7ff 0%, #f6f9ff 100%)", borderRadius: 16, overflow: "hidden", border: "1px solid #c0d6ff" }}>
                    {(vehicles.length === 0 && stops.length === 0) ? (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                        Sem dados de localização ou paragens disponíveis.
                      </div>
                    ) : (
                      <div id="leaflet-map" style={{ width: '100%', height: '100%' }} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid #e5e5e5" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Lista de veículos</div>
                {vehicles.length === 0 ? (
                  <p style={{ color: "#666", margin: 0 }}>Sem veículos registados.</p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                    {vehicles.map((vehicle) => (
                      <li key={vehicle.id ?? vehicle.vehicleId}>
                        <button
                          onClick={() => setSelectedVehicle(vehicle)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 12,
                            borderRadius: 12,
                            border: (selectedVehicle?.id === vehicle.id || selectedVehicle?.vehicleId === vehicle.vehicleId) ? "1.5px solid #c8102e" : "1px solid #e0e0e0",
                            background: (selectedVehicle?.id === vehicle.id || selectedVehicle?.vehicleId === vehicle.vehicleId) ? "#fff0f1" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <strong>Veículo {vehicle.vehicleId || vehicle.id}</strong>
                          <div style={{ color: "#666", marginTop: 4 }}>
                            {`${vehicle.latitude ?? "?"}, ${vehicle.longitude ?? "?"}`}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid #e5e5e5" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Lista de paragens</div>
                {stops.length === 0 ? (
                  <p style={{ color: "#666", margin: 0 }}>Sem paragens disponíveis para esta linha.</p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                    {stops.map((stop) => (
                      <li key={stop.stopId}>
                        <button
                          onClick={() => setSelectedStop(stop)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 12,
                            borderRadius: 12,
                            border: selectedStop?.stopId === stop.stopId ? "1.5px solid #2563eb" : "1px solid #e0e0e0",
                            background: selectedStop?.stopId === stop.stopId ? "#eff6ff" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <strong>{stop.name || stop.stopId}</strong>
                          <div style={{ color: "#666", marginTop: 4 }}>
                            {stop.stopId}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedVehicle && (
                <div style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid #e5e5e5" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Detalhes do Veículo</div>
                  <div>ID: {selectedVehicle.vehicleId || selectedVehicle.id}</div>
                  <div>Posição: {`${selectedVehicle.latitude ?? "?"}, ${selectedVehicle.longitude ?? "?"}`}</div>
                  <div>Latitude: {selectedVehicle.latitude ?? "-"}</div>
                  <div>Longitude: {selectedVehicle.longitude ?? "-"}</div>
                  <div>Última atualização: {selectedVehicle.lastUpdated || selectedVehicle.timestamp || "-"}</div>
                </div>
              )}

              {selectedStop && (
                <div style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid #e5e5e5" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Detalhes da Paragem</div>
                  <div>Nome: {selectedStop.name}</div>
                  <div>ID: {selectedStop.stopId}</div>
                  <div>Latitude: {selectedStop.latitude}</div>
                  <div>Longitude: {selectedStop.longitude}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedLine && (
        <div style={{ marginTop: 18, color: "#666" }}>
          Selecione uma linha para ver horários planeados e localização dos veículos.
        </div>
      )}
    </div>
  );
}
