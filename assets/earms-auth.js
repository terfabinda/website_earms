/*
 * EARMS IAM — Frontend auth client
 * Implements the auth flow from EARMS_IAM_API_Documentation_For_Frontend_Developers.docx
 *   - Centralized base URL (no hardcoding)
 *   - tokenService: storage / retrieval / replacement / removal of access + refresh tokens
 *   - apiFetch: attaches Bearer token and handles 401 -> refresh -> retry (Section 13)
 *
 * Exposes a single global: window.EARMS
 */

(function () {
  "use strict";

  // Base URL configuration (Section 1). Default to the production TLD. Developers can
  // override for local testing by setting window.EARMS_IAM_BASE_URL = "http://localhost:5005/"
  // before this script loads.
  const DEFAULT_BASE_URL =
    window.EARMS_IAM_BASE_URL || "https://iam.earmshub.com";

  const CONFIG = {
    baseUrl: DEFAULT_BASE_URL,
    accessTokenKey: "earms_accessToken",
    refreshTokenKey: "earms_refreshToken",
  };

  // tokenService — centralized token storage (Section 12).
  const tokenService = {
    getAccessToken() {
      return localStorage.getItem(CONFIG.accessTokenKey);
    },
    getRefreshToken() {
      return localStorage.getItem(CONFIG.refreshTokenKey);
    },
    // Replace BOTH tokens after a successful refresh (Section 3.2 / 13.6).
    setTokens(accessToken, refreshToken) {
      if (accessToken) localStorage.setItem(CONFIG.accessTokenKey, accessToken);
      if (refreshToken) localStorage.setItem(CONFIG.refreshTokenKey, refreshToken);
    },
    // Remove locally stored tokens after logout / failed refresh (Section 3.3 / 13.7).
    clear() {
      localStorage.removeItem(CONFIG.accessTokenKey);
      localStorage.removeItem(CONFIG.refreshTokenKey);
    },
    isAuthenticated() {
      return !!this.getAccessToken();
    },
  };

  // Refresh is in-flight guarded so concurrent 401s share one call.
  let refreshing = false;
  const waiters = [];

  async function doRefresh() {
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    const res = await fetch(CONFIG.baseUrl + "api/Auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Old refresh token invalid -> clear and force login (Section 13.7).
      tokenService.clear();
      throw new Error("Refresh failed");
    }

    const data = await res.json();
    tokenService.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  // Returns a fresh access token, sharing a single in-flight refresh.
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

  /*
   * apiFetch — core request helper.
   *   - Attaches Authorization: Bearer {accessToken} automatically (Section 15).
   *   - On 401, attempts one refresh + retry (Section 13.5-13.6).
   *   - On refresh failure, clears tokens and redirects to login (Section 13.7).
   */
  async function apiFetch(path, options = {}, _isRetry = false) {
    options.headers = options.headers || {};
    const token = tokenService.getAccessToken();
    if (token) options.headers["Authorization"] = "Bearer " + token;
    if (options.body && !(options.headers["Content-Type"] || options.headers["content-type"])) {
      options.headers["Content-Type"] = "application/json";
    }

    let res = await fetch(CONFIG.baseUrl + path, options);

    if (res.status === 401 && token && !_isRetry) {
      try {
        const newToken = await refreshAccessToken();
        options.headers["Authorization"] = "Bearer " + newToken;
        res = await fetch(CONFIG.baseUrl + path, options);
      } catch (e) {
        redirectToLogin();
        throw e;
      }
    }

    return res;
  }

  function redirectToLogin() {
    if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
      window.location.href = "index.html";
    }
  }

  function jsonOrText(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.indexOf("application/json") !== -1) return res.json();
    return res.text();
  }

  // authApi (Section 12).
  const authApi = {
    async login(userName, password) {
      const res = await fetch(CONFIG.baseUrl + "api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });
      if (!res.ok) {
        const data = await jsonOrText(res);
        const msg = (data && data.message) || "Invalid credentials";
        throw new Error(msg);
      }
      const data = await res.json();
      tokenService.setTokens(data.accessToken, data.refreshToken);
      return data;
    },

    async refreshToken() {
      const token = await refreshAccessToken();
      return { accessToken: token, refreshToken: tokenService.getRefreshToken() };
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
      const res = await fetch(CONFIG.baseUrl + "api/Auth/request-password-reset", {
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
      const res = await fetch(CONFIG.baseUrl + "api/Auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      if (!res.ok) {
        const data = await jsonOrText(res);
        if (data && data.errors && data.errors.length) {
          throw new Error(data.errors.join(" "));
        }
        throw new Error((data && data.message) || "Password reset failed");
      }
      return jsonOrText(res);
    },

    async confirmEmail(userId, code) {
      const res = await fetch(
        CONFIG.baseUrl + "api/Auth/confirm-email?userId=" + encodeURIComponent(userId) + "&code=" + encodeURIComponent(code),
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

  // mailApi / userApi / ownerApi / roleApi placeholders for later pages.
  const mailApi = {
    async sendEmail(toEmail, subject, message) {
      const res = await fetch(CONFIG.baseUrl + "api/Mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, subject, message }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      return jsonOrText(res);
    },
    async sendVerification(email) {
      const res = await fetch(
        CONFIG.baseUrl + "api/Mail/send-verification?email=" + encodeURIComponent(email),
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to send verification email");
      return jsonOrText(res);
    },
    async resendVerification(email) {
      const res = await fetch(CONFIG.baseUrl + "api/usermgt/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to resend verification");
      return jsonOrText(res);
    },
  };

  window.EARMS = {
    CONFIG,
    tokenService,
    apiFetch,
    jsonOrText,
    authApi,
    mailApi,
  };
})();
