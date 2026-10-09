// EARMS RegulatorAdmin API client (read-only aggregation layer)
// Source: regulator-api-guide.md (now git-ignored, internal reference only)
//   - Base path /api/onboarding/regulator ; all calls require Bearer token with RegulatorAdmin role
//   - Endpoints are read-only: dashboard, institutions (paginated), institution details,
//     colleges, departments, programmes, staff/student statistics, programme details.

import { apiFetch } from "./iam";

const ONB_BASE =
  ((typeof window !== "undefined" && window.EARMS_ONBOARDING_BASE_URL) || "/api/onb").replace(/\/?$/, "/");

const REG = "api/onboarding/regulator/";

function qs(params) {
  const us = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v);
  });
  const s = us.toString();
  return s ? "?" + s : "";
}

// Deployed API uses inconsistent casing; alias keys to both cases like onboarding.js
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

async function regFetch(path, options = {}) {
  const res = await apiFetch(REG + path, options, false, ONB_BASE);
  let body = null;
  let rawText = "";
  try {
    rawText = await res.text();
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const errs = body && (body.errors || body.Errors);
    const errsText = Array.isArray(errs) && errs.length ? " — " + errs.join(" ") : "";
    const serverMsg =
      (body && (body.message || body.Message || body.errorCode || body.ErrorCode)) ||
      (rawText && rawText.length < 500 ? rawText : "");
    let msg = (serverMsg || "Regulator request failed") + " (" + res.status + ")" + errsText;
    if (res.status === 401) {
      msg += " — unauthorized. Re-login; token missing/expired.";
    } else if (res.status === 403) {
      msg += " — forbidden. This account does not have the RegulatorAdmin role.";
    }
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  // Paginated institutions endpoint returns { items, totalCount, page, pageSize, totalPages }
  // (not a ServiceResult envelope) — return as-is with aliased items.
  if (body && typeof body === "object" && !Array.isArray(body) && ("items" in body || "Items" in body)) {
    const items = body.items ?? body.Items ?? [];
    return {
      ...caseAlias(body),
      items: caseAlias(Array.isArray(items) ? items : []),
      totalCount: body.totalCount ?? body.TotalCount ?? 0,
      page: body.page ?? body.Page ?? 1,
      pageSize: body.pageSize ?? body.PageSize ?? 20,
      totalPages: body.totalPages ?? body.TotalPages ?? 1,
    };
  }
  if (body && typeof body === "object") return caseAlias(body);
  if (Array.isArray(body)) return caseAlias(body);
  return body;
}

export const regulatorApi = {
  // #1 GET /dashboard — aggregate counts across all institutions
  async getDashboard() {
    return regFetch("dashboard");
  },
  // #2 GET /institutions?institutionType&search&page&pageSize — paginated list
  async getInstitutions({ institutionType, search, page = 1, pageSize = 20 } = {}) {
    return regFetch("institutions" + qs({ institutionType, search, page, pageSize }));
  },
  // #3 GET /institutions/{id} — details with counts
  async getInstitution(id) {
    return regFetch("institutions/" + encodeURIComponent(id));
  },
  // #4 GET /institutions/{id}/colleges
  async getColleges(institutionId) {
    return regFetch("institutions/" + encodeURIComponent(institutionId) + "/colleges");
  },
  // #5 GET /institutions/{id}/departments
  async getDepartments(institutionId) {
    return regFetch("institutions/" + encodeURIComponent(institutionId) + "/departments");
  },
  // #6 GET /institutions/{id}/programmes
  async getProgrammes(institutionId) {
    return regFetch("institutions/" + encodeURIComponent(institutionId) + "/programmes");
  },
  // #7 GET /institutions/{id}/staff/statistics
  async getStaffStatistics(institutionId) {
    return regFetch("institutions/" + encodeURIComponent(institutionId) + "/staff/statistics");
  },
  // #8 GET /institutions/{id}/students/statistics
  async getStudentStatistics(institutionId) {
    return regFetch("institutions/" + encodeURIComponent(institutionId) + "/students/statistics");
  },
  // #9 GET /programmes/{id}
  async getProgramme(programmeId) {
    return regFetch("programmes/" + encodeURIComponent(programmeId));
  },
};

// Regulator mandate definitions — which institutionType values each body oversees.
// Matching is case-insensitive + substring-tolerant because deployed data uses
// variants ("University", "Polytechnic", "Monotechnic", "College", "College of Education").
export const REGULATORS = {
  nuc: {
    key: "nuc",
    route: "nuc",
    short: "NUC",
    name: "National Universities Commission",
    scope: "Universities",
    description: "Regulatory oversight of Nigerian universities — enrolment, staffing and programme spread.",
    icon: "account_balance",
    accent: "#1e3a8a",
    // institutionType values that belong to NUC
    types: ["university", "universities"],
    primaryType: "University",
  },
  nbte: {
    key: "nbte",
    route: "nbte",
    short: "NBTE",
    name: "National Board for Technical Education",
    scope: "Polytechnics & Monotechnics",
    description: "Regulatory oversight of polytechnics, monotechnics and technical institutions.",
    icon: "precision_manufacturing",
    accent: "#0f766e",
    types: ["polytechnic", "monotechnic", "monotechnics", "polytechnics", "technical"],
    primaryType: "Polytechnic",
  },
  ncce: {
    key: "ncce",
    route: "ncce",
    short: "NCCE",
    name: "National Commission for Colleges of Education",
    scope: "Colleges of Education",
    description: "Regulatory oversight of colleges of education — teacher-training capacity nationwide.",
    icon: "school",
    accent: "#7c3aed",
    types: ["college", "colleges", "college of education", "colleges of education", "coe"],
    primaryType: "College",
  },
};

export function matchesRegulatorType(institutionType, regulatorKey) {
  const reg = REGULATORS[regulatorKey];
  if (!reg) return true;
  const t = String(institutionType ?? "").toLowerCase().trim();
  if (!t) return false;
  // NBTE and NCCE scopes overlap on the word "college"/"technical" — disambiguate:
  // NCCE owns anything mentioning education/coe; NBTE owns poly/mono/technical.
  if (reg.key === "ncce") {
    if (t.includes("polytechnic") || t.includes("monotechnic") || t.includes("technical")) return false;
    return reg.types.some((x) => t.includes(x));
  }
  if (reg.key === "nbte") {
    if (t.includes("university")) return false;
    // "College of Education" belongs to NCCE, not NBTE
    if (t.includes("education") || (t.includes("college") && t.includes("education"))) return false;
    if (t === "college" || t === "colleges") return false;
    return reg.types.some((x) => t.includes(x));
  }
  return reg.types.some((x) => t.includes(x));
}
