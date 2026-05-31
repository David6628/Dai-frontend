import API from "./api";

export function purchaseTicket(data) {
  return API.post("/api/tickets/purchase", data);
}
