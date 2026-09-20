// EARMS Project Flow API — Frontend client
// Docs: EARMS Project Flow API.docx  (Base route /api/Project)
//  - JWT Bearer required for most endpoints (apiFetch attaches it)
//  - Envelope: { success, message, errorCode, data }
//  - File uploads: use FormData; do NOT set Content-Type manually (browser sets boundary)
//  - Multi-tenant: frontend should derive matricNo/staffNo/institutionId/departmentId from token claims where possible

import { apiFetch } from "./iam"

export const PROJECT_BASE_URL =
  ((typeof window !== "undefined" && window.EARMS_PROJECT_BASE_URL) || "/api/project").replace(/\/?$/, "/")

const P = "api/Project/"

// internal helpers

function qs(params) {
  const us = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v)
  })
  const s = us.toString()
  return s ? "?" + s : ""
}

async function parseEnvelope(res) {
  let body = null
  const ct = res.headers.get("content-type") || ""
  try {
    if (ct.includes("application/json")) body = await res.json()
    else {
      const text = await res.text()
      try { body = text ? JSON.parse(text) : null } catch { body = text }
    }
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg = (body && (body.message || body.errorCode || (body.errors && body.errors.join(" ")))) || `Project request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.body = body
    throw err
  }
  if (body && body.success === false) {
    const msg = body.message || body.errorCode || body.errors?.join(" ") || "Operation failed"
    const err = new Error(msg)
    err.body = body
    throw err
  }
  // Some endpoints return { success, data } ; others return raw
  if (body && typeof body === "object" && "data" in body) return body.data
  return body
}

// Alias casing like onboardingApi: normalize keys to lower/upper first letter
function caseAlias(v) {
  if (Array.isArray(v)) return v.map(caseAlias)
  if (v && typeof v === "object" && !(v instanceof FormData) && !(v instanceof Blob)) {
    const out = {}
    for (const [k, val] of Object.entries(v)) {
      const lower = k.charAt(0).toLowerCase() + k.slice(1)
      const upper = k.charAt(0).toUpperCase() + k.slice(1)
      const child = caseAlias(val)
      out[lower] = child
      out[upper] = child
    }
    return out
  }
  return v
}

async function projectFetch(path, options = {}) {
  const res = await apiFetch(P + path, options, false, PROJECT_BASE_URL)
  const data = await parseEnvelope(res)
  return caseAlias(data)
}

// Wrap FormData uploads via projectFetch but ensure apiFetch doesn't set JSON content-type
async function projectFetchForm(path, formData, method = "POST") {
  const res = await apiFetch(P + path, { method, body: formData }, false, PROJECT_BASE_URL)
  const data = await parseEnvelope(res)
  return caseAlias(data)
}

// ---- Enumerations (Section 12) ----
export const ProjectStatus = { Initiated: 1, Approved: 2, Ongoing: 3, Completed: 4 }
export const ProjectStatusLabel = { 1: "Initiated", 2: "Approved", 3: "Ongoing", 4: "Completed" }

export const ChapterStatus = { Pending: 1, UnderReview: 2, Approved: 3, Rejected: 4 }
export const ChapterStatusLabel = { 1: "Pending", 2: "Under Review", 3: "Approved", 4: "Rejected" }

export const VersionStatus = { Submitted: 1, UnderReview: 2, Approved: 3, NeedsCorrection: 4, Rejected: 5 }
export const VersionStatusLabel = { 1: "Submitted", 2: "Under Review", 3: "Approved", 4: "Needs Correction", 5: "Rejected" }

export const TopicStatus = { Pending: 1, Approved: 2, Rejected: 3 }
export const TopicStatusLabel = { 1: "Pending", 2: "Approved", 3: "Rejected" }

export const SupervisorRole = { Supervisor: 1, Cosupervisor: 2 }
export const VersionReviewDecision = { NeedsCorrection: 1, Approved: 2, Rejected: 3 }
export const VersionReviewDecisionLabel = { 1: "Needs Correction", 2: "Approved", 3: "Rejected" }

// ---- API ----
export const projectApi = {
  // 1. Project Management

  /** POST /api/Project/create  Auth: Required */
  async createProject(payload) {
    // payload: { matricNo, supervisors:[{staffNo, role}], session, programId, departmentId, institutionId, assignedBy, startDate, endDate, chapterTemplateId, projectStatus }
    return projectFetch("create", { method: "POST", body: JSON.stringify(payload) })
  },

  /** POST /api/Project/autocreate  (currently no [Authorize]) */
  async autocreateProjects(payload) {
    // { programId, departmentId, institutionId, session, assignedBy, useSpecialization }
    return projectFetch("autocreate", { method: "POST", body: JSON.stringify(payload) })
  },

  /** GET /api/Project/geta_all_projects  (note typo: geta_all_projects) */
  async getAllProjects() {
    return projectFetch("geta_all_projects", { method: "GET" })
  },

  /** GET /api/Project/get-project-by-matric?MatricNo=STU001 */
  async getProjectByMatric(matricNo) {
    return projectFetch("get-project-by-matric" + qs({ MatricNo: matricNo }), { method: "GET" })
  },

  /** GET /api/Project/getprojectbyId?Id=1 */
  async getProjectById(id) {
    return projectFetch("getprojectbyId" + qs({ Id: id }), { method: "GET" })
  },

  /** GET /api/Project/GetTopicsByProjectId/{ProjectId} */
  async getTopicsByProjectId(projectId) {
    return projectFetch(`GetTopicsByProjectId/${encodeURIComponent(projectId)}`, { method: "GET" })
  },

  /** GET /api/Project/get-project-details?MatricNo=STU001&InstitutionId=1 */
  async getProjectDetails({ matricNo, institutionId }) {
    return projectFetch("get-project-details" + qs({ MatricNo: matricNo, InstitutionId: institutionId }), { method: "GET" })
  },

  /** GET /api/Project/getprojectbysession?session=...&DepartmentId=...&InstitutionId=... */
  async getProjectsBySession({ session, departmentId, institutionId }) {
    return projectFetch("getprojectbysession" + qs({ session, DepartmentId: departmentId, InstitutionId: institutionId }), { method: "GET" })
  },

  /** GET /api/Project/getprojectbydept?DepartmentId=...&InstitutionId=...&session=... */
  async getProjectsByDept({ departmentId, institutionId, session }) {
    return projectFetch("getprojectbydept" + qs({ DepartmentId: departmentId, InstitutionId: institutionId, session }), { method: "GET" })
  },

  /** PUT /api/Project/updateproject */
  async updateProject(payload) {
    // payload must include id + same fields as create
    return projectFetch("updateproject", { method: "PUT", body: JSON.stringify(payload) })
  },

  /** PUT /api/Project/update-project-status?projectId=1&projectStatus=3  Auth: Required Role: ProjectSupervisor */
  async updateProjectStatus({ projectId, projectStatus }) {
    return projectFetch("update-project-status" + qs({ projectId, projectStatus }), { method: "PUT" })
  },

  // 2. Research Topics

  /** POST /api/Project/create-topic  Auth: Required  { matricNo, topic }  Max 3 per project */
  async createTopic({ matricNo, topic }) {
    return projectFetch("create-topic", { method: "POST", body: JSON.stringify({ matricNo, topic }) })
  },

  // 3. Chapter Management

  /** POST /api/Project/{projectId}/chapters  multipart/form-data  { chapterNumber, supervisorNote?, file? }  Auth: Required */
  async createChapter(projectId, { chapterNumber, supervisorNote, file }) {
    const fd = new FormData()
    fd.append("chapterNumber", String(chapterNumber))
    if (supervisorNote !== undefined && supervisorNote !== null) fd.append("supervisorNote", String(supervisorNote))
    if (file) fd.append("file", file)
    return projectFetchForm(`${encodeURIComponent(projectId)}/chapters`, fd, "POST")
  },

  /** GET /api/Project/chapters/{chapterId}  Auth: Required */
  async getChapter(chapterId) {
    return projectFetch(`chapters/${encodeURIComponent(chapterId)}`, { method: "GET" })
  },

  /** GET /api/Project/{projectId}/chapters  Auth: Required */
  async getChaptersByProject(projectId) {
    return projectFetch(`${encodeURIComponent(projectId)}/chapters`, { method: "GET" })
  },

  /** PUT /api/Project/chapters/{chapterId}  Auth: Required  { chapterStatus } */
  async updateChapter(chapterId, { chapterStatus }) {
    return projectFetch(`chapters/${encodeURIComponent(chapterId)}`, { method: "PUT", body: JSON.stringify({ chapterStatus }) })
  },

  // 4. Chapter Versions

  /** POST /api/Project/chapters/{chapterId}/versions  Auth: Required  { fileUrl, supervisorNote } */
  async submitChapterVersion(chapterId, { fileUrl, supervisorNote }) {
    return projectFetch(`chapters/${encodeURIComponent(chapterId)}/versions`, {
      method: "POST",
      body: JSON.stringify({ fileUrl, supervisorNote }),
    })
  },

  /** POST /api/Project/version-review  multipart  { chapterVersionId, reviewer, reviewComment, reviewDecision, correctionFile? } */
  async reviewVersion({ chapterVersionId, reviewer, reviewComment, reviewDecision, correctionFile }) {
    const fd = new FormData()
    fd.append("chapterVersionId", String(chapterVersionId))
    if (reviewer) fd.append("reviewer", String(reviewer))
    if (reviewComment) fd.append("reviewComment", String(reviewComment))
    if (reviewDecision !== undefined && reviewDecision !== null) fd.append("reviewDecision", String(reviewDecision))
    if (correctionFile) fd.append("correctionFile", correctionFile)
    return projectFetchForm("version-review", fd, "POST")
  },

  // 5. Supervisor Pending Actions

  /** GET /api/Project/awaiting-action?StaffNo=STAFF001&institutionId=1  Auth: Required */
  async getAwaitingAction({ staffNo, institutionId }) {
    return projectFetch("awaiting-action" + qs({ StaffNo: staffNo, institutionId }), { method: "GET" })
  },

  /** GET /api/Project/get-projects-by-supervisor?staffNo=&status=&pageNumber=&pageSize= */
  async getProjectsBySupervisor({ staffNo, status, pageNumber, pageSize }) {
    return projectFetch("get-projects-by-supervisor" + qs({ staffNo, status, pageNumber, pageSize }), { method: "GET" })
  },

  // 6-9 Dashboards

  /** GET /api/Project/student-dashboard?MatricNo=...&institutionId=...  Auth: Required */
  async getStudentDashboard({ matricNo, institutionId }) {
    return projectFetch("student-dashboard" + qs({ MatricNo: matricNo, institutionId }), { method: "GET" })
  },

  /** GET /api/Project/statistics?StaffNo=...&departmentId=...&institutionId=...  Auth: Required */
  async getSupervisorStatistics({ staffNo, departmentId, institutionId }) {
    return projectFetch("statistics" + qs({ StaffNo: staffNo, departmentId, institutionId }), { method: "GET" })
  },

  /** GET /api/Project/coordinator-dashboard?departmentId=...&institutionId=...  Auth: Required */
  async getCoordinatorDashboard({ departmentId, institutionId }) {
    return projectFetch("coordinator-dashboard" + qs({ departmentId, institutionId }), { method: "GET" })
  },

  /** GET /api/Project/uni-admin-dashboard?institutionId=...  Auth: Required */
  async getUniAdminDashboard({ institutionId }) {
    return projectFetch("uni-admin-dashboard" + qs({ institutionId }), { method: "GET" })
  },

  // 10. Student's Current Chapter Review

  /** GET /api/Project/get-current-chapter-review?ProjectId=1  Auth: Required */
  async getCurrentChapterReview(projectId) {
    return projectFetch("get-current-chapter-review" + qs({ ProjectId: projectId }), { method: "GET" })
  },

  // 11. Chapter Templates

  /** GET /api/Project/get-template?InstitutionId=...&DepartmentId=...  Auth: Required */
  async getTemplates({ institutionId, departmentId }) {
    return projectFetch("get-template" + qs({ InstitutionId: institutionId, DepartmentId: departmentId }), { method: "GET" })
  },

  /** POST /api/Project/create-chapter-template  Auth: Required */
  async createChapterTemplate(payload) {
    // { templateName, institutionId, departmentId, programId, isDefault, chapters:[{chapterNumber,title}] }
    return projectFetch("create-chapter-template", { method: "POST", body: JSON.stringify(payload) })
  },
}
