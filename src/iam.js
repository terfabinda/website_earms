// EARMS IAM — Frontend auth client (React/ESM build)
// Implements the auth flow from EARMS_IAM_API_Documentation_For_Frontend_Developers.docx
//   - Centralized base URL (no hardcoding)
//   - tokenService: storage / retrieval / replacement / removal of access + refresh tokens
//   - apiFetch: attaches Bearer token and handles 401 -> refresh -> retry (Section 13)

const BASE_URL =
  ((typeof window !== "undefined" && window.EARMS_IAM_BASE_URL) || "https://iam.earmshub.com").replace(/\/?$/, "/");

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
export async function apiFetch(path, options = {}, _isRetry = false) {
  options.headers = options.headers || {};
  const token = tokenService.getAccessToken();
  if (token) options.headers["Authorization"] = "Bearer " + token;
  if (options.body && !(options.headers["Content-Type"] || options.headers["content-type"])) {
    options.headers["Content-Type"] = "application/json";
  }

  let res = await fetch(BASE_URL + path, options);

  if (res.status === 401 && token && !_isRetry) {
    try {
      const newToken = await refreshAccessToken();
      options.headers["Authorization"] = "Bearer " + newToken;
      res = await fetch(BASE_URL + path, options);
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
