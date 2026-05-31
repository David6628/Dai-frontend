import API from "./api";

export function getLines() {
  return API.get("/api/realtime/lines");
}

export function getVehicles(line) {
  return API.get(`/api/realtime/vehicles?lineId=${encodeURIComponent(line)}`);
}

export function getSchedule(lineId) {
  return API.get(`/api/realtime/schedules?lineId=${encodeURIComponent(lineId)}`);
}

export function getCombined(lineId) {
  return API.get(`/api/realtime/line/${encodeURIComponent(lineId)}`);
}

export function getStops(lineId) {
  return API.get(`/api/realtime/stops?lineId=${encodeURIComponent(lineId)}`);
}

export function getNearby(lat, lng) {
  return API.get(`/api/realtime/nearby?lat=${lat}&lng=${lng}`);
}
