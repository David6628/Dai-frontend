import API from "./api";

export function getTariffs() {
  return API.get("/api/admin/pricing/tariffs");
}

export function updateTariff(ticketType, price, adminUserId) {
  return API.put(`/api/admin/pricing/tariffs/${ticketType}?adminUserId=${adminUserId}`, { price });
}

export function getDiscounts() {
  return API.get("/api/admin/pricing/discounts");
}

export function updateDiscount(profile, discountPercent, adminUserId) {
  return API.put(`/api/admin/pricing/discounts/${profile}?adminUserId=${adminUserId}`, { discountPercent });
}

export function approveUserProfile(userId, profile, adminUserId) {
  return API.post(`/api/admin/pricing/profiles/${userId}/approve?profile=${profile}&adminUserId=${adminUserId}`);
}

export function getPricingAudit(userId) {
  const suffix = userId ? `?userId=${userId}` : "";
  return API.get(`/api/admin/pricing/audit${suffix}`);
}
