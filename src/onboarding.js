// EARMS Onboarding API client (React/ESM build)
// Docs: Onboarding_API_Frontend_Documentation.docx
//   - Base path /api/onboarding/ ; all calls require Bearer token (apiFetch attaches it)
//   - Common envelope: { success, message, errorCode, data }
//   - Send numeric enum values for StaffCategory (1 Academic,2 Technologist,3 Admin)
//     and StudentCategory (1 Non_Degree,2 Undergraduate,3 Postgraduate)
//   - Institution registration is multipart/form-data (logoFile), everything else JSON

import { apiFetch, BASE_URL, decodeToken, ownerApi } from "./iam";
import { ONBOARDING_BASE_URL as SHARED_ONB_BASE } from "./api-config";

const ONB_BASE = SHARED_ONB_BASE;

const OB = "api/onboarding/";

async function obFetch(path, options = {}) {
  const res = await apiFetch(OB + path, options, false, ONB_BASE);
  let body = null;
  let rawText = "";
  try {
    rawText = await res.text();
    body = rawText ? JSON.parse(rawText) : null;
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const errs = body && (body.errors || body.Errors);
    const errsText = Array.isArray(errs) && errs.length ? " — " + errs.join(" ") : "";
    const serverMsg =
      (body && (body.message || body.Message || body.errorCode || body.ErrorCode)) ||
      (rawText && rawText.length < 500 ? rawText : "");
    let msg =
      (serverMsg || "Onboarding request failed") + " (" + res.status + ")" + errsText;
    if (res.status === 401) {
      // 401 from onboarding almost always means: missing/expired JWT,
      // failed silent refresh, or JWT without the institution claim the
      // controller reads (get_student_by_institution uses JWT, not query).
      // Keep the status prefix so callers matching "(401)" still work.
      msg +=
        " — unauthorized. Re-login; if it persists the access token is rejected or lacks institution (ownerId) claim.";
    }
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (body && body.success === false) {
    const errs2 = body.errors || body.Errors;
    const errs2Text = Array.isArray(errs2) && errs2.length ? " — " + errs2.join(" ") : "";
    const err2 = new Error((body.message || body.Message || body.errorCode || body.ErrorCode || "Operation failed") + errs2Text);
    err2.status = res.status;
    err2.body = body;
    throw err2;
  }
  if (body && Array.isArray(body)) return caseAlias(body);
  if (body && typeof body === "object") {
    // Envelope casing is inconsistent across controllers: data / Data / result / items.
    const isEnvelope = "success" in body || "errorCode" in body || "data" in body || "Data" in body || "message" in body;
    if (isEnvelope) {
      const data = body.data ?? body.Data ?? body.result ?? body.Result ?? body.items ?? body.Items;
      return caseAlias(data === undefined ? null : data);
    }
    return caseAlias(body);
  }
  return null;
}

// Matric numbers look like UGK/CMS/24/44210. A single-encoded %2F inside a path segment is
// rejected by the Apache front end (404), which makes get_student / update_student /
// get_student_department unreachable for every real matric. Double-encoding (%252F) survives
// Apache and is decoded once by the API router, so the controller still receives the raw
// matric number. Values without a slash are encoded normally.
// Staff IDs hit the same Apache 404 (e.g. "UST/STF/001"), so getStaff uses it too.
function pathSeg(v) {
  const s = String(v ?? "");
  return s.includes("/") ? encodeURIComponent(encodeURIComponent(s)) : encodeURIComponent(s);
}
function pathMatric(matricNo) {
  return pathSeg(matricNo);
}

function qs(params) {
  const us = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v);
  });
  const s = us.toString();
  return s ? "?" + s : "";
}

// The deployed API uses inconsistent JSON casing (doc warns: lowercase field names).
// Alias every key to both lower-first and upper-first so UI code can use either case.
// Also alias semantic DTO mismatches: CollegeName <-> Name (doc CollegeDto) and LevelName <-> Name.
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
    // Semantic aliases for college/level DTOs so UI can use either CollegeName or Name
    const collegeVal = out.CollegeName ?? out.collegeName;
    if (collegeVal !== undefined && out.Name === undefined && out.name === undefined) {
      out.Name = collegeVal;
      out.name = collegeVal;
    }
    if ((out.Name !== undefined || out.name !== undefined) && collegeVal === undefined) {
      const nv = out.Name ?? out.name;
      out.CollegeName = nv;
      out.collegeName = nv;
    }
    const levelVal = out.LevelName ?? out.levelName;
    if (levelVal !== undefined && out.Name === undefined && out.name === undefined) {
      out.Name = levelVal;
      out.name = levelVal;
    }
    return out;
  }
  return v;
}

export const onboardingApi = {
  // ---- Dashboard / lookup ----
  async getDashboard(institutionId) {
    return obFetch("uni-admin-dash-onboard" + qs({ institutionId }));
  },
  async getInstitutionsDropdown() {
    return obFetch("get-institutions-dropdown");
  },
  async getInstitutions() {
    return obFetch("get-institution");
  },
  async getInstitutionByCode(code) {
    return obFetch("get-institution/" + encodeURIComponent(code));
  },
  async getMinInstitutions() {
    return obFetch("min-institutions");
  },
  async getMinInstitution(id) {
    return obFetch("get-mininstitution/" + encodeURIComponent(id));
  },
  async getInstitutionId() {
    return obFetch("get-institionid");
  },
  async getColleges(institutionId) {
    return obFetch("get-colleges" + qs({ institutionId }));
  },
  async createCollege(payload) {
    // Doc spec (TABLE 3): Code, CollegeName, InstitutionId
    // Previous frontend sent Name (docs: CollegeDto CollegeName) causing "College data is required."
    // Normalize to satisfy both PascalCase and case-insensitive backends.
    const p = payload || {};
    const nameVal = p.CollegeName ?? p.collegeName ?? p.Name ?? p.name ?? "";
    const codeVal = p.Code ?? p.code ?? "";
    const instVal = p.InstitutionId ?? p.institutionId ?? p.institutionID ?? 0;
    const body = {
      Code: String(codeVal),
      CollegeName: String(nameVal),
      // Keep Name alias for deployed variants that may still bind Name
      Name: String(nameVal),
      InstitutionId: Number(instVal),
      institutionId: Number(instVal),
    };
    return obFetch("create-college", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async updateCollege(id, payload) {
    // Backend currently exposes only POST create-college + GET get-colleges
    // (no update route in docs; PUT colleges/{id} etc. all 404 as probed).
    // Follow the programs convention (PUT programs/{id}) so this works
    // unchanged once backend adds it; until then the 404 surfaces clearly.
    const p = payload || {};
    const nameVal = p.CollegeName ?? p.collegeName ?? p.Name ?? p.name ?? "";
    const codeVal = p.Code ?? p.code ?? "";
    const instVal = p.InstitutionId ?? p.institutionId ?? 0;
    return obFetch("colleges/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify({
        Id: Number(id),
        Code: String(codeVal),
        CollegeName: String(nameVal),
        Name: String(nameVal),
        InstitutionId: Number(instVal),
      }),
    });
  },
  async deleteCollege(id) {
    // Same note as updateCollege: no delete route in docs/backend yet.
    // Canonical guess DELETE colleges/{id} (matches programs-style routing).
    return obFetch("colleges/" + encodeURIComponent(id), { method: "DELETE" });
  },
  async getLevels(institutionId) {
    return obFetch("get-levels/" + encodeURIComponent(institutionId));
  },
  async createLevel(payload) {
    return obFetch("create-level", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getDepartments(institutionId) {
    return obFetch(institutionId + "/get-depts");
  },
  // Robust list fetch: get-depts is currently returning empty for some tenants
  // while the records exist. Fall back to get-minidepts/{institutionId} (minimal
  // rows: Id/Name/InstitutionId) so listings + programme creation keep working
  // on whichever route the backend serves. Console logs which source won.
  async getDepartmentsRobust(institutionId) {
    const id = String(institutionId ?? "");
    if (!id) return [];
    try {
      const full = await onboardingApi.getDepartments(id);
      if (Array.isArray(full) && full.length) return full;
      try { console.log(`[departments] get-depts empty for institution ${id}; trying get-minidepts fallback`); } catch {}
    } catch (e) {
      try { console.warn(`[departments] get-depts failed for institution ${id} (${e?.message || e}); trying get-minidepts fallback`); } catch {}
    }
    try {
      const mini = await onboardingApi.getMiniDepartments(id);
      const arr = Array.isArray(mini) ? mini : [];
      try { console.log(`[departments] get-minidepts for institution ${id}: ${arr.length} rows`); } catch {}
      return arr;
    } catch (e) {
      try { console.warn(`[departments] get-minidepts also failed for institution ${id} (${e?.message || e})`); } catch {}
      return [];
    }
  },
  async getMiniDepartments(id) {
    return obFetch("get-minidepts/" + encodeURIComponent(id));
  },
  async getMiniDepartment(id) {
    return obFetch("get-minidept/" + encodeURIComponent(id));
  },
  async getPrograms(institutionId, departmentId) {
    return obFetch("get-programs/" + institutionId + "/" + departmentId);
  },
  // Robust programme listing: the scoped get-programs/{inst}/{dept} route is
  // currently returning empty backend-side even where rows exist, while the
  // direct record lookup still resolves. Return the scoped list when it has
  // rows; otherwise surface whatever the direct lookup returns (deduped) so
  // dropdowns list programmes that exist at all and the coordinator picks
  // whichever applies.
  async getProgramsRobust(institutionId, departmentId) {
    const inst = String(institutionId ?? "").trim();
    const dept = String(departmentId ?? "").trim();
    if (inst && dept) {
      try {
        const list = await onboardingApi.getPrograms(inst, dept);
        if (Array.isArray(list) && list.length) return list;
      } catch {}
    }
    const seen = new Map();
    for (const c of [dept, inst]) {
      const key = String(c ?? "").trim();
      if (!key) continue;
      try {
        const rec = await onboardingApi.getProgram(key);
        const row = Array.isArray(rec) ? rec[0] : rec;
        const pid = row?.Id ?? row?.id;
        if (row && pid !== undefined && pid !== null && String(pid) !== "" && !seen.has(String(pid))) {
          seen.set(String(pid), row);
        }
      } catch {}
    }
    return [...seen.values()];
  },
  async getProgram(id) {
    return obFetch("programs/" + encodeURIComponent(id));
  },
  async updateProgram(id, payload) {
    return obFetch("programs/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async getAcademicStaff({ programId, departmentId, institutionId }) {
    return obFetch(
      "academic-staff" + qs({ programId, departmentId, institutionId })
    );
  },
  async getUnassignedStudents({ programId, departmentId, institutionId }) {
    return obFetch(
      "unassigned-students" + qs({ programId, departmentId, institutionId })
    );
  },
  async getStaffList(departmentId, institutionId) {
    return obFetch("departments/" + encodeURIComponent(departmentId) + "/stafflist" + qs({ institutionId }));
  },
  async getStaff(staffId, institutionId) {
    return obFetch("staff/" + pathSeg(staffId) + "/" + encodeURIComponent(institutionId));
  },
  async updateStaff(staffId, payload) {
    return obFetch("staff/" + encodeURIComponent(staffId), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async getStudent(matricNo) {
    return obFetch("get_student/" + pathMatric(matricNo));
  },
  async getStudentIam(matricNo) {
    return obFetch("get_student_iam" + qs({ matricNo }));
  },
  async getStaffIam(staffId) {
    return obFetch("get_staff_iam" + qs({ staffId }));
  },
  async getStudentsByInstitution(_institutionId) {
    // Spec: GET /get_student_by_institution — Parameters: None.
    // Institution ID is read from JWT (ownerId claim). Do NOT send
    // ?institutionId= — the deployed controller ignores it and a stale /
    // cross-institution id in the query only confuses diagnostics.
    return obFetch("get_student_by_institution");
  },
  async getDepartmentStudents(departmentId, institutionId) {
    return obFetch(
      "get_department_student/" + encodeURIComponent(departmentId) + "/" + encodeURIComponent(institutionId)
    );
  },
  async getStudentDepartment(matricNo, institutionId) {
    return obFetch(
      "get_student_department/" + pathMatric(matricNo) + "/" + encodeURIComponent(institutionId)
    );
  },
  async updateStudent(matricNo, payload) {
    return obFetch("update_student/" + pathMatric(matricNo), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async getPostgraduates(id) {
    // API expects the institution as `id`, not `institutionId`
    return obFetch("GetPG" + qs({ id }));
  },
  async createPostgraduate(payload) {
    return obFetch("create-pg", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ---- Create ----
  async createInstitution(formData) {
    return obFetch("register-institution", { method: "POST", body: formData });
  },
  async createDepartment(institutionId, { code, name, collegeId, CollegeId }) {
    // Doc spec TABLE 12: POST /{institutionId}/departments, JSON { Code, Name, InstitutionId:int }
    // Previous version sent InstitutionId as string (callers pass String(id)) and dropped
    // collegeId collected by DepartmentPage — both cause 400/validation failures on strict backends.
    // Normalize like createCollege does.
    const instNum = Number(institutionId);
    if (!instNum) {
      throw new Error(
        "No institution record found for this account yet — complete Onboarding → Institution first."
      );
    }
    const rawCol = collegeId ?? CollegeId;
    const colNum = rawCol === undefined || rawCol === "" ? undefined : Number(rawCol);
    const body = {
      Code: String(code ?? "").trim(),
      Name: String(name ?? "").trim(),
      InstitutionId: instNum,
      institutionId: instNum,
    };
    if (colNum !== undefined && Number.isFinite(colNum) && colNum > 0) {
      body.CollegeId = colNum;
      body.collegeId = colNum;
    }
    return obFetch(instNum + "/departments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async createProgram(departmentId, { name, institutionId, departmentId: deptId }) {
    return obFetch("departments/" + departmentId + "/programs", {
      method: "POST",
      body: JSON.stringify({
        Name: name,
        InstitutionId: institutionId,
        DepartmentId: deptId,
      }),
    });
  },
  async createStaff(departmentId, payload) {
    return obFetch("departments/" + departmentId + "/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async registerStudent(payload) {
    return obFetch("register_student", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ---- Bulk Import (Onboarding_API_Documentation 08-10-2026.docx §8) ----
  // Flow: download template → POST bulkup-load (validate) → POST {id}/confirm
  // (execute) or POST {id}/cancel. InstitutionId is NEVER sent — derived from JWT.
  async downloadBulkTemplate(kind) {
    // kind: "staff" | "student" → .xlsx File (endpoint carries no [Authorize]
    // but the bearer token is attached anyway; Blob preserves it, unlike window.open).
    const k = String(kind || "").toLowerCase() === "student" ? "student" : "staff";
    const res = await apiFetch(OB + "bulk-import/templates/" + k, { method: "GET" }, false, ONB_BASE);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error((t && t.length < 300 ? t : "Template download failed") + " (" + res.status + ")");
    }
    return await res.blob();
  },
  async uploadBulkImport({ type, file, collegeId, departmentId }) {
    // multipart: Type = enum NAME ("Staff" | "Student"), File (.xlsx),
    // CollegeId + DepartmentId (both required). No InstitutionId (JWT-derived).
    const t = String(type || "").toLowerCase() === "student" ? "Student" : "Staff";
    if (!file) throw new Error("Select an .xlsx file first.");
    if (!collegeId || !departmentId) throw new Error("College and Department are required for bulk import.");
    const fd = new FormData();
    fd.append("Type", t);
    fd.append("File", file);
    fd.append("CollegeId", String(collegeId));
    fd.append("DepartmentId", String(departmentId));
    // Returns ImportValidationResult: { importId, totalRecords, validRecords,
    // invalidRecords, status, errors:[{rowNumber,columnName,value,errorCode,errorMessage,severity}] }
    return obFetch("bulkup-load", { method: "POST", body: fd });
  },
  async confirmBulkImport(importId) {
    // Returns BulkImportResult: { importId, totalRecords, importedRecords, failedRecords, status, errorMessage }
    return obFetch("bulk-import/" + encodeURIComponent(importId) + "/confirm", { method: "POST" });
  },
  async cancelBulkImport(importId) {
    const res = await apiFetch(OB + "bulk-import/" + encodeURIComponent(importId) + "/cancel", { method: "POST" }, false, ONB_BASE);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error((t && t.length < 300 ? t : "Cancel failed") + " (" + res.status + ")");
    }
    return true;
  },
};

// Resolve the real onboarding institution id for the current JWT.
// NEVER use token ownerId as institution id (owner 5 vs institution 4 for JST).
// Order: institutionCode -> get-institution/{code}; then the full institution
// list (Code + Name); then the dropdown (Id + Name only). Institution-admin
// tokens do not always carry institutionCode/institutionName, so recover both
// from the owner record created at signup before giving up.
export async function resolveInstitutionId() {
  let tok = null;
  try { tok = decodeToken(); } catch { tok = null; }
  let code = String(tok?.institutionCode ?? tok?.InstitutionCode ?? "").trim();
  let name = String(tok?.institutionName ?? tok?.InstitutionName ?? "").trim();

  if (!code || !name) {
    const ownerUser = String(
      tok?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      tok?.unique_name ?? tok?.preferred_username ?? tok?.preferredUsername ??
      tok?.email ?? tok?.Email ?? tok?.sub ?? ""
    ).trim();
    if (ownerUser) {
      try {
        const raw = await ownerApi.getOwnerByName(ownerUser);
        const d = raw?.data ?? raw?.Data;
        const owner = Array.isArray(raw)
          ? raw[0]
          : Array.isArray(d)
            ? (d[0] || null)
            : (d && typeof d === "object" ? { ...raw, ...d } : raw);
        code = code || String(owner?.institutionCode ?? owner?.InstitutionCode ?? "").trim();
        name = name || String(owner?.institutionName ?? owner?.InstitutionName ?? "").trim();
      } catch {}
    }
  }

  if (code) {
    try {
      const rec = await onboardingApi.getInstitutionByCode(code);
      const id = rec?.Id ?? rec?.id ?? rec?.ID;
      if (id !== undefined && id !== null && String(id) !== "") return String(id);
    } catch {}
  }

  if (!code && !name) return "";

  const pickId = (hit) => {
    const id = hit?.Id ?? hit?.id;
    return id !== undefined && id !== null && String(id) !== "" ? String(id) : "";
  };
  const lc = code.toLowerCase();
  const ln = name.toLowerCase();
  const matches = (r) => {
    const c = String(r?.Code ?? r?.code ?? "").trim().toLowerCase();
    const n = String(r?.Name ?? r?.name ?? "").trim().toLowerCase();
    return (lc && c === lc) || (ln && n === ln);
  };

  // Full list carries Code + Name (the dropdown DTO only has Id + Name).
  try {
    const list = await onboardingApi.getInstitutions();
    const arr = Array.isArray(list) ? list : [];
    const hit = arr.find(matches);
    const id = pickId(hit);
    if (id) return id;
  } catch {}

  try {
    const list = await onboardingApi.getInstitutionsDropdown().catch(() => []);
    const arr = Array.isArray(list) ? list : [];
    const hit = arr.find(matches);
    const id = pickId(hit);
    if (id) return id;
  } catch {}
  return "";
}

export const STAFF_CATEGORIES = [
  { value: 1, label: "Academic" },
  { value: 2, label: "Technologist" },
  { value: 3, label: "Admin" },
];

// Robust staff/coordinator profile fetch. The direct GET staff/{id}/{inst} route
// is finicky (slash IDs, string-vs-numeric ids, wrong institution scoping,
// incomplete staff records upstream), so fall back through IAM lookup +
// academic-staff scan + per-department stafflist scan. Returns the first
// record that looks like a staff profile, or null when nothing resolves.
// Never throws — callers treat null as "profile unavailable" and fall back
// to token claims / department list.
export async function getStaffRobust(staffNo, institutionId, departments) {
  const id = String(staffNo ?? "").trim();
  const inst = String(institutionId ?? "").trim();
  if (!id) return null;
  const looksFull = (r) =>
    r && (r.StaffId ?? r.staffId ?? r.FirstName ?? r.firstName ?? r.LastName ??
      r.lastName ?? r.Email ?? r.email ?? r.DepartmentId ?? r.departmentId);
  const matchRow = (x) => {
    if (!x || typeof x !== "object") return false;
    const sid = String(x.StaffId ?? x.staffId ?? "").trim().toLowerCase();
    if (sid && sid === id.toLowerCase()) return true;
    // numeric Id match (caller may pass a numeric user id as staffNo fallback)
    if (/^\d+$/.test(id) && String(x.Id ?? x.id ?? "") === id) return true;
    return false;
  };
  // 1) Direct record (double-encoded slash IDs handled in getStaff).
  if (inst) {
    try {
      const r = await onboardingApi.getStaff(id, inst);
      if (looksFull(r)) return r;
    } catch {}
  }
  // 2) IAM lookup — needs no institution id.
  try {
    const r = await onboardingApi.getStaffIam(id);
    if (looksFull(r)) return r;
  } catch {}
  // 3) Academic-staff aggregates (institution-wide, then department-scoped).
  const scanLists = [];
  if (inst) {
    try {
      const all = await onboardingApi.getAcademicStaff({ institutionId: inst });
      if (Array.isArray(all)) scanLists.push(all);
    } catch {}
  }
  let depts = Array.isArray(departments) ? departments : null;
  if (!depts && inst) {
    try {
      depts = await onboardingApi.getDepartmentsRobust(inst);
    } catch { depts = null; }
  }
  if (inst && Array.isArray(depts) && depts.length) {
    try {
      const perDept = await Promise.all(
        depts.map((d) =>
          onboardingApi
            .getAcademicStaff({ departmentId: String(d.Id ?? d.id), institutionId: inst })
            .catch(() => [])
        )
      );
      for (const l of perDept) if (Array.isArray(l)) scanLists.push(l);
    } catch {}
  }
  for (const list of scanLists) {
    const hit = (Array.isArray(list) ? list : []).find(matchRow);
    if (hit) return hit;
  }
  // 4) Full stafflist scan per department (full StaffDto rows carry DepartmentId).
  if (inst && Array.isArray(depts) && depts.length) {
    try {
      const scans = await Promise.all(
        depts.map((d) =>
          onboardingApi.getStaffList(String(d.Id ?? d.id), inst).catch(() => [])
        )
      );
      for (const list of scans) {
        const hit = (Array.isArray(list) ? list : []).find(matchRow);
        if (hit) return hit;
      }
    } catch {}
  }
  return null;
}

export const STUDENT_CATEGORIES = [
  { value: 1, label: "Non-Degree" },
  { value: 2, label: "Undergraduate" },
  { value: 3, label: "Postgraduate" },
];

// Bulk import enums (08-10-2026 doc §8). Type is sent as enum NAME ("Staff"/"Student").
export const BULK_IMPORT_STATUS = {
  1: "Uploaded",
  2: "Validating",
  3: "Awaiting Confirmation",
  4: "Processing",
  5: "Completed",
  6: "Completed With Errors",
  7: "Failed",
  8: "Cancelled",
};

export const BULK_IMPORT_ERROR_SEVERITY = { 1: "Warning", 2: "Error" };
