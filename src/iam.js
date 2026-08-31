// EARMS IAM — Frontend auth client (React/ESM build)
// Implements the auth flow from EARMS_IAM_API_Documentation_For_Frontend_Developers.docx
//   - Centralized base URL (no hardcoding)
//   - tokenService: storage / retrieval / replacement / removal of access + refresh tokens
//   - apiFetch: attaches Bearer token and handles 401 -> refresh -> retry (Section 13)

export const BASE_URL =
  ((typeof window !== "undefined" && window.EARMS_IAM_BASE_URL) || "/api/iam").replace(/\/?$/, "/");

export const tokenService = {
  accessTokenKey: "earms_accessToken",
  refreshTokenKey: "earms_refreshToken",
  getAccessToken() {
    return localStorage.getItem(this.accessTokenKey);
  },
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  },
  // Replace BOTH tokens after a successful refresh (Section 3.2 / 13.6).
  setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) localStorage.setItem(this.refreshTokenKey, refreshToken);
  },
  // Remove locally stored tokens after logout / failed refresh (Section 3.3 / 13.7).
  clear() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  },
  isAuthenticated() {
    return !!this.getAccessToken();
  },
};

let refreshing = false;
const waiters = [];

async function doRefresh() {
  const refreshToken = tokenService.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(BASE_URL + "api/Auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    tokenService.clear();
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  tokenService.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function refreshAccessToken() {
  if (refreshing) {
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }
  refreshing = true;
  return doRefresh()
    .then((token) => {
      waiters.forEach((w) => w.resolve(token));
      return token;
    })
    .catch((err) => {
      waiters.forEach((w) => w.reject(err));
      throw err;
    })
    .finally(() => {
      refreshing = false;
      waiters.length = 0;
    });
}

async function jsonOrText(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.indexOf("application/json") !== -1) return res.json();
  return res.text();
}

// Attaches Authorization: Bearer {accessToken} automatically (Section 15).
// On 401, attempts one refresh + retry (Section 13.5-13.6); on failure clears tokens + throws.
export async function apiFetch(path, options = {}, _isRetry = false, base = BASE_URL) {
  options.headers = options.headers || {};
  const token = tokenService.getAccessToken();
  if (token) options.headers["Authorization"] = "Bearer " + token;
  if (options.body && !(options.headers["Content-Type"] || options.headers["content-type"])) {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (!isFormData) options.headers["Content-Type"] = "application/json";
  }

  let res = await fetch(base + path, options);

  if (res.status === 401 && token && !_isRetry) {
    try {
      const newToken = await refreshAccessToken();
      options.headers["Authorization"] = "Bearer " + newToken;
      res = await fetch(base + path, options);
    } catch (e) {
      throw e;
    }
  }
  return res;
}

export const authApi = {
  async login(userName, password) {
    const res = await fetch(BASE_URL + "api/Auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, password }),
    });
    if (!res.ok) {
      const data = await jsonOrText(res);
      throw new Error((data && data.message) || "Invalid credentials");
    }
    const data = await res.json();
    tokenService.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async logout() {
    const refreshToken = tokenService.getRefreshToken();
    try {
      if (refreshToken) {
        await apiFetch("api/Auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      tokenService.clear();
    }
  },

  async requestPasswordReset(email) {
    const res = await fetch(BASE_URL + "api/Auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await jsonOrText(res);
      throw new Error((data && data.message) || "Could not send reset email");
    }
    return jsonOrText(res);
  },

  async resetPassword(email, token, newPassword) {
    const res = await fetch(BASE_URL + "api/Auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword }),
    });
    if (!res.ok) {
      const data = await jsonOrText(res);
      if (data && data.errors && data.errors.length) throw new Error(data.errors.join(" "));
      throw new Error((data && data.message) || "Password reset failed");
    }
    return jsonOrText(res);
  },

  async confirmEmail(userId, code) {
    const res = await fetch(
      BASE_URL + "api/Auth/confirm-email?userId=" + encodeURIComponent(userId) + "&code=" + encodeURIComponent(code),
      { method: "GET" }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Email confirmation failed");
    }
    return res.text();
  },

  async getEntitlements() {
    const res = await apiFetch("api/Auth/entitlements", { method: "GET" });
    if (!res.ok) throw new Error("Could not load entitlements");
    return res.json();
  },
};

// ---- User Management (IAM Section 6) ----
export const userApi = {
  async getUser(id) {
    const res = await apiFetch("api/usermgt/get-user/" + encodeURIComponent(id), { method: "GET" });
    if (!res.ok) throw new Error("Could not get user");
    return res.json();
  },
  async createUser(payload) {
    const res = await apiFetch("api/usermgt/create-user", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseSimple(res, "User created");
  },
  async updateUser(id, payload) {
    const res = await apiFetch("api/usermgt/update-user/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return parseSimple(res, "User updated");
  },
  async deleteUser(id) {
    const res = await apiFetch("api/usermgt/delete-user/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    return parseSimple(res, "User deleted");
  },
  // createOwner needs ownerType enum (Institution=1, Personal=2)
  async createOwner(payload) {
    const res = await apiFetch("api/usermgt/create-owner", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseSimple(res, "Owner created");
  },
};

// ---- Owner Management (IAM Section 7) ----
export const ownerApi = {
  async getAllOwners() {
    const res = await apiFetch("api/usermgt/get-all-owners", { method: "GET" });
    if (!res.ok) throw new Error("Could not load owners");
    return res.json();
  },
  async getOwnerByName(username) {
    const res = await apiFetch(
      "api/usermgt/get-owner-by-name" + qs({ username }),
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Could not find owner");
    return res.json();
  },
  async getOwnerByCode(code) {
    const res = await apiFetch(
      "api/usermgt/get-owner-by-code" + qs({ code }),
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Could not find owner");
    return res.json();
  },
  async getMiniOwnerByCode(ownerCode) {
    const res = await apiFetch(
      "api/usermgt/get-miniowner-by-code/" + encodeURIComponent(ownerCode),
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Could not find owner");
    return res.json();
  },
  async getActiveOwners() {
    const res = await apiFetch("api/usermgt/get-active-owners", { method: "GET" });
    if (!res.ok) throw new Error("Could not load active owners");
    return res.json();
  },
};

// ---- Role Management (IAM Section 9) ----
export const roleApi = {
  async getRoles() {
    const res = await apiFetch("api/usermgt/get-app-roles", { method: "GET" });
    if (!res.ok) throw new Error("Could not load roles");
    return res.json();
  },
  async assignRoles(userName, roles) {
    const res = await apiFetch("api/usermgt/assign-roles", {
      method: "POST",
      body: JSON.stringify({ userName, roles }),
    });
    return parseSimple(res, "Roles assigned");
  },
};

// ---- Mail (IAM Section 5.2-5.3, 8) ----
export const mailApi = {
  async sendEmail({ toEmail, subject, message }) {
    const res = await apiFetch("api/Mail/send", {
      method: "POST",
      body: JSON.stringify({ toEmail, subject, message }),
    });
    return parseSimple(res, "Email sent");
  },
  async sendVerification(email) {
    const res = await apiFetch(
      "api/Mail/send-verification" + qs({ email }),
      { method: "POST" }
    );
    return parseSimple(res, "Verification email sent");
  },
  async resendVerificationEmail(email) {
    const res = await apiFetch("api/usermgt/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return parseSimple(res, "Verification email resent");
  },
};

// Small helper: parse ServiceResult-ish envelope (message may be in {message})
async function parseSimple(res, fallback) {
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const msg =
      (body && (body.message || body.errorCode || (body.errors && body.errors.join(" ")))) ||
      "Request failed (" + res.status + ")";
    throw new Error(msg);
  }
  if (body && body.success === false) {
    throw new Error(body.message || body.errors?.join(" ") || "Operation failed");
  }
  if (body && typeof body === "object" && body.message) return body.message;
  return body || fallback;
}

function qs(params) {
  const us = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v);
  });
  const s = us.toString();
  return s ? "?" + s : "";
}

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function decodeToken(token) {
  const t = token || tokenService.getAccessToken();
  if (!t) return null;
  try {
    const part = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.prototype.map
        .call(window.atob(part), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function getRoleFromToken(token) {
  const p = decodeToken(token);
  if (!p) return null;
  const raw = p[ROLE_CLAIM] || p.role;
  if (Array.isArray(raw)) return raw[0];
  return raw || null;
}

export function routeForRole(role) {
  if (!role) return "dashboard";
  const r = String(role).toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("faculty") || r.includes("supervisor")) return "faculty";
  if (r.includes("student")) return "student";
  return "dashboard";
}
