import API from "./api";

export function validateTicket(ticketId, vehicleId, line) {
  return API.post(`/api/validation/${ticketId}?vehicleId=${vehicleId}&line=${line}`);
}

export function syncOfflineValidations(validations) {
  return API.post(`/api/validation/sync`, validations);
}
