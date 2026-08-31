// EARMS Onboarding API client (React/ESM build)
// Docs: Onboarding_API_Frontend_Documentation.docx
//   - Base path /api/onboarding/ ; all calls require Bearer token (apiFetch attaches it)
//   - Common envelope: { success, message, errorCode, data }
//   - Send numeric enum values for StaffCategory (1 Academic,2 Technologist,3 Admin)
//     and StudentCategory (1 Non_Degree,2 Undergraduate,3 Postgraduate)
//   - Institution registration is multipart/form-data (logoFile), everything else JSON

import { apiFetch, BASE_URL } from "./iam";

const ONB_BASE =
  ((typeof window !== "undefined" && window.EARMS_ONBOARDING_BASE_URL) || "/api/onb").replace(/\/?$/, "/");

const OB = "api/onboarding/";

async function obFetch(path, options = {}) {
  const res = await apiFetch(OB + path, options, false, ONB_BASE);
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const msg =
      (body && (body.message || body.errorCode)) ||
      "Onboarding request failed (" + res.status + ")";
    throw new Error(msg);
  }
  if (body && body.success === false) {
    throw new Error(body.message || body.errorCode || "Operation failed");
  }
  if (body && Array.isArray(body)) return caseAlias(body);
  return caseAlias(body ? body.data : null);
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
    return obFetch("create-college", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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
  async getStaffList(departmentId) {
    return obFetch("departments/" + encodeURIComponent(departmentId) + "/stafflist");
  },
  async getStaff(staffId, institutionId) {
    return obFetch("staff/" + encodeURIComponent(staffId) + "/" + encodeURIComponent(institutionId));
  },
  async updateStaff(staffId, payload) {
    return obFetch("staff/" + encodeURIComponent(staffId), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async getStudent(matricNo) {
    return obFetch("get_student/" + encodeURIComponent(matricNo));
  },
  async getStudentIam(matricNo) {
    return obFetch("get_student_iam" + qs({ matricNo }));
  },
  async getStaffIam(staffId) {
    return obFetch("get_staff_iam" + qs({ staffId }));
  },
  async getStudentsByInstitution(institutionId) {
    return obFetch("get_student_by_institution" + qs({ institutionId }));
  },
  async getDepartmentStudents(departmentId, institutionId) {
    return obFetch(
      "get_department_student/" + encodeURIComponent(departmentId) + "/" + encodeURIComponent(institutionId)
    );
  },
  async getStudentDepartment(matricNo, institutionId) {
    return obFetch(
      "get_student_department/" + encodeURIComponent(matricNo) + "/" + encodeURIComponent(institutionId)
    );
  },
  async updateStudent(matricNo, payload) {
    return obFetch("update_student/" + encodeURIComponent(matricNo), {
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
  async createDepartment(institutionId, { code, name }) {
    return obFetch(institutionId + "/departments", {
      method: "POST",
      body: JSON.stringify({ Code: code, Name: name, InstitutionId: institutionId }),
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
