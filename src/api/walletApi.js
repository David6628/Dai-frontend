import API from "./api";

export function getWallet(userId) {
  return API.get(`/api/wallet/${userId}`);
}

export function getBalance(userId) {
  return API.get(`/api/wallet/${userId}/balance`);
}

export function addBalance(userId, amount) {
  return API.post(`/api/wallet/${userId}/add-balance`, { amount });
}

export function processPayment(data) {
  return API.post("/api/payments/process", data);
}

export function getPaymentHistory(userId) {
  return API.get(`/api/payments/user/${userId}`);
}
