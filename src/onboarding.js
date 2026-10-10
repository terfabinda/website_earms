// EARMS Onboarding API client (React/ESM build)
// Docs: Onboarding_API_Frontend_Documentation.docx
//   - Base path /api/onboarding/ ; all calls require Bearer token (apiFetch attaches it)
//   - Common envelope: { success, message, errorCode, data }
//   - Send numeric enum values for StaffCategory (1 Academic,2 Technologist,3 Admin)
//     and StudentCategory (1 Non_Degree,2 Undergraduate,3 Postgraduate)
//   - Institution registration is multipart/form-data (logoFile), everything else JSON

import { apiFetch, BASE_URL, decodeToken } from "./iam";

const ONB_BASE =
  ((typeof window !== "undefined" && window.EARMS_ONBOARDING_BASE_URL) || "/api/onb").replace(/\/?$/, "/");

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
  async getMiniDepartments(id) {
    return obFetch("get-minidepts/" + encodeURIComponent(id));
  },
  async getMiniDepartment(id) {
    return obFetch("get-minidept/" + encodeURIComponent(id));
  },
  async getPrograms(institutionId, departmentId) {
    return obFetch("get-programs/" + institutionId + "/" + departmentId);
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
};

// Resolve the real onboarding institution id for the current JWT.
// NEVER use token ownerId as institution id (owner 5 vs institution 4 for JST).
// Order: institutionCode -> get-institution/{code}, then dropdown/list match.
export async function resolveInstitutionId() {
  let tok = null;
  try { tok = decodeToken(); } catch { tok = null; }
  const code = String(tok?.institutionCode ?? tok?.InstitutionCode ?? "").trim();
  const name = String(tok?.institutionName ?? tok?.InstitutionName ?? "").trim();
  if (code) {
    try {
      const rec = await onboardingApi.getInstitutionByCode(code);
      const id = rec?.Id ?? rec?.id ?? rec?.ID;
      if (id !== undefined && id !== null && String(id) !== "") return String(id);
    } catch {}
  }
  try {
    const list = await onboardingApi.getInstitutionsDropdown().catch(() => []);
    const arr = Array.isArray(list) ? list : [];
    const match = (r) => {
      const c = String(r?.Code ?? r?.code ?? "").toLowerCase();
      const n = String(r?.Name ?? r?.name ?? "").toLowerCase();
      return (code && c === code.toLowerCase()) || (name && n === name.toLowerCase());
    };
    const hit = arr.find(match);
    if (hit) {
      const id = hit?.Id ?? hit?.id;
      if (id !== undefined && id !== null) return String(id);
    }
  } catch {}
  return "";
}

export const STAFF_CATEGORIES = [
  { value: 1, label: "Academic" },
  { value: 2, label: "Technologist" },
  { value: 3, label: "Admin" },
];

export const STUDENT_CATEGORIES = [
  { value: 1, label: "Non-Degree" },
  { value: 2, label: "Undergraduate" },
  { value: 3, label: "Postgraduate" },
];
