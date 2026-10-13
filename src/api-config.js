// EARMS API base URL resolution — single source of truth.
//
// Why this exists:
//   - On Vercel, relative bases ("/api/iam", "/api/onb", ...) work because
//     vercel.json rewrites them to the backend hosts. The proxy also dodges
//     CORS (backends do NOT allow Vercel origins directly).
//   - On https://earmshub.com (Apache static hosting) there is NO /api proxy,
//     so the same relative bases 404 ("The requested URL was not found on
//     this server"). The backends DO allow Origin https://earmshub.com via
//     CORS, so the fix is to call them directly (absolute https URLs) there.
//   - Local `vite dev` keeps working via vite.config.js proxy (relative bases).
//
// Priority (highest first):
//   1. window.EARMS_*_BASE_URL runtime override (set in public/earms-config.js
//      or inline <script> — editable on the server without a rebuild).
//   2. VITE_EARMS_*_BASE_URL build-time env (e.g. Vercel env vars / .env file).
//   3. Hostname sniff: earmshub.com (apex + www) -> direct absolute backend.
//   4. Fallback: relative /api/* proxy (Vercel rewrites + vite dev proxy).

function withSlash(u) {
  return String(u || "").replace(/\/?$/, "/");
}

function readViteEnv(key) {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return String(import.meta.env[key]);
    }
  } catch {
    // import.meta may not exist outside Vite — ignore.
  }
  return "";
}

function readWindow(key) {
  try {
    if (typeof window !== "undefined" && window[key]) return String(window[key]);
  } catch {
    // ignore
  }
  return "";
}

function hostname() {
  try {
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      return String(window.location.hostname).toLowerCase();
    }
  } catch {
    // ignore
  }
  return "";
}

// Hosts served as plain static files with no /api reverse-proxy.
// Backends CORS-allow https://earmshub.com, so call them directly there.
function isDirectBackendHost(h) {
  const host = String(h || "").toLowerCase();
  return host === "earmshub.com" || host === "www.earmshub.com";
}

export function resolveBase({ windowKey, viteKey, proxyPath, directBase }) {
  const win = readWindow(windowKey);
  if (win) return withSlash(win);
  const env = viteKey ? readViteEnv(viteKey) : "";
  if (env) return withSlash(env);
  if (isDirectBackendHost(hostname())) return withSlash(directBase);
  return withSlash(proxyPath);
}

export const IAM_DIRECT_BASE = "https://iam.earmshub.com";
export const ONBOARDING_DIRECT_BASE = "https://onboarding.earmshub.com";
export const BILLING_DIRECT_BASE = "https://billing.earmshub.com";
export const PROJECT_DIRECT_BASE = "https://project.earmshub.com";

export const IAM_BASE_URL = resolveBase({
  windowKey: "EARMS_IAM_BASE_URL",
  viteKey: "VITE_EARMS_IAM_BASE_URL",
  proxyPath: "/api/iam",
  directBase: IAM_DIRECT_BASE,
});

export const ONBOARDING_BASE_URL = resolveBase({
  windowKey: "EARMS_ONBOARDING_BASE_URL",
  viteKey: "VITE_EARMS_ONBOARDING_BASE_URL",
  proxyPath: "/api/onb",
  directBase: ONBOARDING_DIRECT_BASE,
});

export const BILLING_BASE_URL = resolveBase({
  windowKey: "EARMS_BILLING_BASE_URL",
  viteKey: "VITE_EARMS_BILLING_BASE_URL",
  proxyPath: "/api/billing",
  directBase: BILLING_DIRECT_BASE,
});

export const PROJECT_BASE_URL = resolveBase({
  windowKey: "EARMS_PROJECT_BASE_URL",
  viteKey: "VITE_EARMS_PROJECT_BASE_URL",
  proxyPath: "/api/project",
  directBase: PROJECT_DIRECT_BASE,
});
