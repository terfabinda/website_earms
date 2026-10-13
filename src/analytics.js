// Project_Flow Regulator Analytics API client.
// Source: RegulatorAnalyticsApi.md (git-ignored, internal reference only)
//   - Base https://project.earmshub.com, prefix /api/project-analytics (relative
//     /api/project proxy locally + on Vercel; direct backend on earmshub.com
//     — see src/api-config.js).
//   - Scope is server-side from the JWT (nucadmin/nbteadmin/ncceadmin). NEVER send
//     an InstitutionId outside the caller's scope (401). Omit it for full scope.
//   - StartDate/EndDate must be sent together or not at all (400 otherwise).
//   - Error envelope differs here: { success:false, error } (not message/errorCode).

import { apiFetch } from "./iam";
import { PROJECT_BASE_URL } from "./project";

const PA = "api/project-analytics/";

function qs(params) {
  const us = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v);
  });
  const s = us.toString();
  return s ? "?" + s : "";
}

function caseAlias(v) {
  if (Array.isArray(v)) return v.map(caseAlias);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const lower = k.charAt(0).toLowerCase() + k.slice(1);
      const upper = k.charAt(0).toUpperCase() + k.slice(1);
      const child = caseAlias(val);
      out[lower] = child;
      out[upper] = child;
    }
    return out;
  }
  return v;
}

async function paFetch(path, options = {}) {
  const res = await apiFetch(PA + path, options, false, PROJECT_BASE_URL);
  let body = null;
  let rawText = "";
  try {
    rawText = await res.text();
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const serverMsg =
      (body && (body.error || body.Error || body.message || body.Message || body.errorCode)) ||
      (rawText && rawText.length < 500 ? rawText : "");
    let msg = (serverMsg || "Analytics request failed") + " (" + res.status + ")";
    if (res.status === 401) msg += " — unauthorized or InstitutionId outside your scope. Re-login; omit InstitutionId for full scope.";
    else if (res.status === 403) msg += " — forbidden. This account holds no analytics role.";
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (body && body.success === false) {
    const err = new Error(body.error || body.Error || body.message || "Operation failed");
    err.body = body;
    throw err;
  }
  return caseAlias(body);
}

export const analyticsApi = {
  // §3.1 Regulator dashboard summary. Filters: InstitutionId, DepartmentId,
  // ProgramId, Session, StartDate+EndDate (paired).
  async getSummary(filters = {}) {
    return paFetch("summary" + qs(filters));
  },
  // §3.2 Status distribution (always all four statuses).
  async getStatusDistribution(filters = {}) {
    return paFetch("status-distribution" + qs(filters));
  },
  // §3.3 Session analytics.
  async getSessions(filters = {}) {
    return paFetch("sessions" + qs(filters));
  },
  // §3.4 Units comparison. groupBy: institution (default) | department | program.
  async getUnits({ groupBy = "institution", ...filters } = {}) {
    return paFetch("units" + qs({ groupBy, ...filters }));
  },
  // §3.5 Monthly trends (yyyy-MM buckets).
  async getTrends(filters = {}) {
    return paFetch("trends" + qs(filters));
  },
  // §3.6 Topic analytics (counts + average AI scores + scoreNote).
  async getTopics(filters = {}) {
    return paFetch("topics" + qs(filters));
  },
};

export const ANALYTICS_STATUS_COLORS = {
  Initiated: "#0284c7",
  Approved: "#0b6639",
  Ongoing: "#b45309",
  Completed: "#166534",
};
