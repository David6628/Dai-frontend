import API from "./api";

export function loginUser(data) {
  // Send login with credentials so the refresh token cookie is stored by the browser
  return API.post("/api/auth/login", data, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
}

export function registerUser(data) {
  return API.post("/api/auth/register", data, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
}
