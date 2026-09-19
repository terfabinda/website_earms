// EARMS Admin Onboarding module — wired to /api/onboarding endpoints.
// Renders inside the shared DashShell (sidebar/header) from main.jsx.
import React, { useState, useEffect, useCallback } from "react";
import { onboardingApi, STAFF_CATEGORIES, STUDENT_CATEGORIES } from "./onboarding";
import { decodeToken } from "./iam";

/* ---------- small shared field primitives ---------- */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const inputCls =
  "w-full px-3 py-2 text-sm rounded-md border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none";
function TextInput(props) {
  return <input {...props} className={inputCls + " " + (props.className || "")} />;
}
function SelectInput(props) {
  return (
    <select {...props} className={inputCls + " " + (props.className || "")}>
      {props.children}
    </select>
  );
}
function Msg({ kind, text }) {
  if (!text) return null;
  const cls =
    kind === "err"
      ? "bg-error-container text-on-error-container"
      : "bg-primary-container text-on-primary-container";
  return (
    <div className={"w-full rounded-lg text-body-sm font-body-sm px-3 py-2 " + cls}>
      {text}
    </div>
  );
}
function Card({ children, className = "" }) {
  return (
    <div className={"glass-card ambient-shadow rounded-xl border border-surface-container " + className}>
      {children}
    </div>
  );
}

/* ---------- top-level Admin Onboarding ---------- */
const TABS = [
  "overview", "departments", "programs", "staff", "students",
  "colleges", "levels", "postgraduate", "lookup",
];

function tabFromHash() {
  const q = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const t = q.get("tab");
  return TABS.includes(t) ? t : "overview";
}

export function AdminOnboarding({ go }) {
  const [institutions, setInstitutions] = useState([]);
  const [instId, setInstId] = useState("");
  const [instErr, setInstErr] = useState("");
  const [tab, setTab] = useState(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const tokenData = decodeToken()
    const tokenInstName = tokenData?.institutionName || tokenData?.InstitutionName || ""
    const tokenInstCode = tokenData?.institutionCode || tokenData?.InstitutionCode || ""
    const tokenOwnerId = tokenData?.ownerId || tokenData?.OwnerId || ""
    onboardingApi
      .getInstitutionsDropdown()
      .then((list) => {
        const arr = list || []
        // Try to find user's institution in the dropdown by id, code or name from token
        let match = null
        if (tokenOwnerId) match = arr.find((i) => String(i.Id ?? i.id) === String(tokenOwnerId))
        if (!match && tokenInstCode) match = arr.find((i) => (i.Code ?? i.code ?? i.code) === tokenInstCode || (i.code ?? i.Code) === tokenInstCode)
        if (!match && tokenInstName) match = arr.find((i) => (i.Name ?? i.name) === tokenInstName)
        // If user's institution not in dropdown (e.g. University of Gboko not yet onboarded), inject it so UI shows correct name instead of hardcoded first item
        if (!match && (tokenInstName || tokenInstCode)) {
          const synthetic = { Id: tokenOwnerId ? Number(tokenOwnerId) : 9999, id: tokenOwnerId ? Number(tokenOwnerId) : 9999, Name: tokenInstName || tokenInstCode, name: tokenInstName || tokenInstCode, Code: tokenInstCode, code: tokenInstCode }
          arr.unshift(synthetic)
          match = synthetic
        }
        setInstitutions(arr)
        if (match) setInstId(String(match.Id ?? match.id))
        else if (arr.length) setInstId(String(arr[0].Id ?? arr[0].id))
      })
      .catch((e) => setInstErr(e.message || "Could not load institutions"));
  }, []);

  const collegeTerm = (() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      const v = localStorage.getItem(key)
      if (v === "School" || v === "Faculty" || v === "College") return v
      return "College"
    } catch { return "College" }
  })()
  const collegeLabel = collegeTerm === "Faculty" ? "Faculties" : collegeTerm === "School" ? "Schools" : "Colleges"
  const tabs = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "departments", label: "Departments", icon: "account_tree" },
    { key: "programs", label: "Programs", icon: "menu_book" },
    { key: "staff", label: "Staff", icon: "group" },
    { key: "students", label: "Students", icon: "school" },
    { key: "colleges", label: collegeLabel, icon: "account_balance" },
    { key: "levels", label: "Levels", icon: "format_list_numbered" },
    { key: "postgraduate", label: "Postgraduate", icon: "workspaces" },
    { key: "lookup", label: "Lookup & Edit", icon: "travel_explore" },
  ];

  return (
    <div className="space-y-6">
      <Msg kind="err" text={instErr} />

      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <Field label="Active Institution">
          <SelectInput value={instId} onChange={(e) => setInstId(e.target.value)} className="max-w-xs">
            {institutions.length === 0 && <option value="">No institutions found</option>}
            {institutions.map((i) => (
              <option key={i.Id} value={String(i.Id)}>
                {i.Name || i.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md ${
              tab === t.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab instId={instId} />}
      {tab === "departments" && <DepartmentsTab instId={instId} />}
      {tab === "programs" && <ProgramsTab instId={instId} />}
      {tab === "staff" && <StaffTab instId={instId} />}
      {tab === "students" && <StudentsTab instId={instId} />}
      {tab === "colleges" && <CollegesTab instId={instId} />}
      {tab === "levels" && <LevelsTab instId={instId} />}
      {tab === "postgraduate" && <PostgraduateTab instId={instId} />}
      {tab === "lookup" && <LookupTab instId={instId} />}
    </div>
  );
}

/* ---------- Overview: real dashboard stats + supervisor/student glance ---------- */
function OverviewTab({ instId }) {
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState("");
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!instId) return;
    setStatsErr("");
    onboardingApi
      .getDashboard(instId)
      .then(setStats)
      .catch((e) => setStatsErr(e.message || "Could not load dashboard"));
    onboardingApi
      .getAcademicStaff({ institutionId: instId })
      .then((d) => setStaff(d || []))
      .catch(() => {});
    onboardingApi
      .getUnassignedStudents({ institutionId: instId })
      .then((d) => setStudents(d || []))
      .catch(() => {});
  }, [instId]);

  const cards = [
    { label: "Total Students", value: stats?.TotalStudents, icon: "school", color: "text-primary" },
    { label: "Total Supervisors", value: stats?.TotalSupervisors, icon: "supervisor_account", color: "text-secondary" },
    { label: "Total Departments", value: stats?.TotalDepartments, icon: "account_tree", color: "text-tertiary" },
    { label: "Total Programs", value: stats?.TotalPrograms, icon: "menu_book", color: "text-primary-fixed-dim" },
  ];

  return (
    <div className="space-y-6">
      <Msg kind="err" text={statsErr} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant mb-1">{c.label}</p>
              <p className={"font-headline-lg font-bold " + c.color}>{c.value ?? "—"}</p>
            </div>
            <div className="p-2 bg-surface-container-low rounded-lg">
              <span className={"material-symbols-outlined " + c.color}>{c.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary">supervisor_account</span> Academic Staff (Supervisors)
          </h3>
          {staff.length === 0 ? (
            <p className="font-body-sm text-on-surface-variant">No supervisors found for this institution.</p>
          ) : (
            <ul className="divide-y divide-surface-container text-sm">
              {staff.map((s) => (
                <li key={s.Id} className="py-2 flex justify-between">
                  <span className="font-medium text-on-surface">{s.staffId}</span>
                  <span className="text-on-surface-variant">{s.Specialization || s.HighestQualification || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined">person_search</span> Unassigned Students
          </h3>
          {students.length === 0 ? (
            <p className="font-body-sm text-on-surface-variant">No unassigned students for this institution.</p>
          ) : (
            <ul className="divide-y divide-surface-container text-sm">
              {students.map((s) => (
                <li key={s.Id} className="py-2 flex justify-between">
                  <span className="font-medium text-on-surface">{s.MatricNo}</span>
                  <span className="text-on-surface-variant">{s.AreaOfInterest || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- generic list+form helper pieces ---------- */
function useList(fetcher, instId) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reload = useCallback(() => {
    if (!instId) return;
    setLoading(true);
    fetcher()
      .then((d) => setItems(d || []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [instId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { items, error, loading, reload, setError };
}

function DepartmentsTab({ instId }) {
  const { items, error, reload } = useList(() => onboardingApi.getDepartments(instId), instId);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  function displayDeptName(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();
    return s.replace(/^(department\s+of\s+)/i, "").trim() || s;
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!code.trim() || !name.trim()) {
      setMsg("Code and Name are required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createDepartment(instId, { code: code.trim(), name: name.trim() });
      setMsg("Department created.");
      setCode("");
      setName("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleView = (s) => { setViewing(s); setError(""); setMsg(""); }
  const handleEdit = (s) => {
    setEditing(s); setError(""); setMsg("");
    setEditForm({
      staffId: s.StaffId ?? s.staffId ?? "",
      title: s.Title ?? s.title ?? "",
      firstName: s.FirstName ?? s.firstName ?? "",
      lastName: s.LastName ?? s.lastName ?? "",
      email: s.Email ?? s.email ?? "",
      phoneNo: s.PhoneNo ?? s.phoneNo ?? "",
      highestQualification: s.HighestQualification ?? s.highestQualification ?? s.Highestqualificattion ?? "",
      staffCategory: Number(s.StaffCategory ?? s.staffCategory ?? 1),
      specialization: s.Specialization ?? s.specialization ?? "",
      programId: s.ProgramId ?? s.programId ? String(s.ProgramId ?? s.programId) : "",
      departmentId: s.DepartmentId ?? s.departmentId ? String(s.DepartmentId ?? s.departmentId) : deptId,
    })
    if (s.DepartmentId ?? s.departmentId) {
      const did = String(s.DepartmentId ?? s.departmentId)
      setDeptId(did)
      onboardingApi.getPrograms(instId, did).then(p=>setPrograms(p||[])).catch(()=>{})
    }
  }
  const handleEditChange = (k) => (e) => setEditForm(f=>({...f, [k]: e.target.value}))
  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editing || !editForm) return
    setError(""); setMsg("")
    const numericId = editing.Id ?? editing.id
    if (!numericId) { setError("Staff numeric Id missing — cannot update"); return }
    if (!editForm.staffId.trim() || !editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) { setError("Staff ID, First/Last Name and Email are required."); return }
    setBusy(true)
    try {
      const payload = {
        StaffId: editForm.staffId.trim(),
        Title: editForm.title.trim(),
        FirstName: editForm.firstName.trim(),
        LastName: editForm.lastName.trim(),
        Email: editForm.email.trim(),
        PhoneNo: editForm.phoneNo.trim(),
        HighestQualification: editForm.highestQualification.trim(),
        StaffCategory: Number(editForm.staffCategory),
        Specialization: editForm.specialization.trim(),
        ProgramId: editForm.programId ? Number(editForm.programId) : 0,
        DepartmentId: Number(editForm.departmentId),
        InstitutionId: Number(instId),
      }
      await onboardingApi.updateStaff(String(numericId), payload)
      setMsg(`Staff ${editForm.staffId} updated.`)
      setEditing(null); setEditForm(null)
      reload()
    } catch (err) { setError(err.message || "Could not update staff") } finally { setBusy(false) }
  }
  const handleDelete = (s) => { setError("Delete not available — no DELETE endpoint per doc."); }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Departments</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No departments yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Code</th>
                <th className="py-2">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((d) => (
                <tr key={d.Id ?? d.id}>
                  <td className="py-2 font-medium text-on-surface">{d.Code ?? d.code}</td>
                  <td className="py-2 text-on-surface-variant">
                    <span className="font-label-md text-primary text-[11px] uppercase tracking-wide block">Department of</span>
                    <span>{displayDeptName(d.Name ?? d.name)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Department</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Code">
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CSC" />
          </Field>
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Computer Science" />
          </Field>
          <Msg kind="err" text={msg.startsWith("Department") ? "" : msg} />
          {msg.startsWith("Department") && <Msg kind="ok" text={msg} />}
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Department"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function ProgramsTab({ instId }) {
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [filterDeptId, setFilterDeptId] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onboardingApi.getDepartments(instId).then((d) => setDepts(d || [])).catch(() => {});
  }, [instId]);

  const loadPrograms = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (filterDeptId) {
        const data = await onboardingApi.getPrograms(instId, filterDeptId);
        setItems(Array.isArray(data) ? data : []);
      } else if (depts.length) {
        const results = await Promise.all(depts.map(d => onboardingApi.getPrograms(instId, String(d.Id ?? d.id)).catch(()=>[])));
        setItems(results.flat().filter(Boolean));
      } else {
        setItems([]);
      }
    } catch (e) { setError(e.message || "Could not load programmes"); }
    finally { setLoading(false); }
  }, [instId, filterDeptId, depts]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  const reload = loadPrograms;

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!deptId || !name.trim()) {
      setMsg("Select a department and enter a program name.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createProgram(deptId, {
        name: name.trim(),
        institutionId: instId,
        departmentId: deptId,
      });
      setMsg("Program created.");
      setName("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="font-headline-sm font-semibold text-primary">Available Programmes — {items.length}</h3>
          <div className="flex items-center gap-2">
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Filter</span>
            <select value={filterDeptId} onChange={e=>setFilterDeptId(e.target.value)} className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
              <option value="">All Departments</option>
              {depts.map(d=>(
                <option key={d.Id ?? d.id} value={String(d.Id ?? d.id)}>{d.Name ?? d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <Msg kind="err" text={error} />
        {loading ? (
          <p className="font-body-sm text-on-surface-variant">Loading programmes…</p>
        ) : items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No programmes {filterDeptId ? "for this department" : "for this institution"} — create one on the right.</p>
        ) : (
          <div className="space-y-3">
            {/* Exquisite card grid for quick glance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(p=>(
                <div key={p.Id ?? p.id} className="rounded-xl border border-surface-container bg-surface-container-lowest p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-label-md text-on-surface text-sm">{p.Name ?? p.name}</p>
                    <p className="font-body-sm text-on-surface-variant text-[12px]">{p.DepartmentName ?? p.departmentName ?? depts.find(x=> String(x.Id ?? x.id)===String(p.DepartmentId ?? p.departmentId))?.Name ?? `Dept ${p.DepartmentId ?? "—"}`}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">ID {p.Id ?? p.id}</span>
                </div>
              ))}
            </div>
            {/* Detailed table */}
            <table className="w-full text-left text-sm mt-3">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant">
                  <th className="py-2">Id</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {items.map((p) => (
                  <tr key={p.Id ?? p.id}>
                    <td className="py-2 font-medium text-on-surface">{p.Id ?? p.id}</td>
                    <td className="py-2 text-on-surface-variant">{p.Name ?? p.name}</td>
                    <td className="py-2 text-on-surface-variant">{p.DepartmentName ?? p.departmentName ?? depts.find(x=> String(x.Id ?? x.id)===String(p.DepartmentId ?? p.departmentId))?.Name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Program</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Department">
            <SelectInput value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Select department</option>
              {depts.map((d) => (
                <option key={d.Id} value={String(d.Id)}>
                  {d.Name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Program Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
          </Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Program"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function StaffTab({ instId }) {
  const [depts, setDepts] = useState([]);
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    staffId: "",
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    highestQualification: "",
    staffCategory: 1,
    specialization: "",
    programId: "",
  });
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [deptId, setDeptId] = useState("");

  useEffect(() => {
    onboardingApi.getDepartments(instId).then((d) => setDepts(d || [])).catch(() => {});
  }, [instId]);
  useEffect(() => {
    if (!depts.length) return;
    const id = deptId || String(depts[0].Id ?? depts[0].id);
    if (!deptId) setDeptId(id);
    if (id) onboardingApi.getPrograms(instId, id).then((p) => setPrograms(p || [])).catch(() => setPrograms([]));
  }, [depts, instId]);

  const loadStaff = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let all = []
      if (filterDeptId) {
        const [list, acad] = await Promise.all([
          onboardingApi.getStaffList(String(filterDeptId), String(instId)).catch(()=>[]),
          onboardingApi.getAcademicStaff({ institutionId: String(instId), departmentId: String(filterDeptId) }).catch(()=>[])
        ])
        all = [...(Array.isArray(list)?list:[]), ...(Array.isArray(acad)?acad:[])]
      } else if (depts.length) {
        const results = await Promise.all(depts.map(async d=>{
          const did = String(d.Id ?? d.id)
          const [list, acad] = await Promise.all([
            onboardingApi.getStaffList(did, String(instId)).catch(()=>[]),
            onboardingApi.getAcademicStaff({ departmentId: did, institutionId: String(instId) }).catch(()=>[])
          ])
          return [...(Array.isArray(list)?list:[]), ...(Array.isArray(acad)?acad:[])]
        }))
        all = results.flat()
      } else {
        const acad = await onboardingApi.getAcademicStaff({ institutionId: String(instId) }).catch(()=>[])
        all = Array.isArray(acad)? acad : []
      }
      const map = new Map()
      for (const s of all) {
        const key = String(s.staffId ?? s.StaffId ?? s.Id ?? s.id ?? s.Email ?? s.email ?? JSON.stringify(s))
        if (!map.has(key)) map.set(key, s)
      }
      let filtered = Array.from(map.values())
      if (filterCategory) filtered = filtered.filter(s=> String(s.StaffCategory ?? s.staffCategory) === String(filterCategory))
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        filtered = filtered.filter(s=>{
          const hay = [s.staffId, s.StaffId, s.FirstName, s.firstName, s.LastName, s.lastName, s.Email, s.email, s.Specialization, s.specialization].join(" ").toLowerCase()
          return hay.includes(q)
        })
      }
      setItems(filtered)
    } catch (e) { setError(e.message || "Could not load staff") } finally { setLoading(false) }
  }, [instId, filterDeptId, depts, filterCategory, search])

  useEffect(()=>{ loadStaff() }, [loadStaff])

  const reload = loadStaff

  const onDeptChangeForCreate = async (val) => {
    setDeptId(val)
    if (val) onboardingApi.getPrograms(instId, val).then((p) => setPrograms(p || [])).catch(() => setPrograms([]))
    else setPrograms([])
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setError("");
    const required = ["staffId", "firstName", "lastName", "email"];
    if (required.some((k) => !form[k].trim()) || !deptId) {
      setMsg("Staff ID, first name, last name, email and a department are required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createStaff(deptId, {
        StaffId: form.staffId.trim(),
        Title: form.title.trim(),
        FirstName: form.firstName.trim(),
        LastName: form.lastName.trim(),
        Email: form.email.trim(),
        PhoneNo: form.phoneNo.trim(),
        HighestQualification: form.highestQualification.trim(),
        StaffCategory: Number(form.staffCategory),
        Specialization: form.specialization.trim(),
        ProgramId: form.programId ? Number(form.programId) : 0,
        DepartmentId: Number(deptId),
        InstitutionId: Number(instId),
      });
      setMsg("Staff created.");
      setForm({
        staffId: "", title: "", firstName: "", lastName: "", email: "", phoneNo: "",
        highestQualification: "", staffCategory: 1, specialization: "", programId: "",
      });
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <h3 className="font-headline-sm font-semibold text-primary">Academic Staff — {items.length} {items.length===1?"member":"members"}</h3>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface font-label-md text-sm hover:bg-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button>
        </div>
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <label className="block flex-1">
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Department filter</span>
            <select value={filterDeptId} onChange={e=>setFilterDeptId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
              <option value="">All Departments</option>
              {depts.map(d=>(
                <option key={d.Id ?? d.id} value={String(d.Id ?? d.id)}>{d.Name ?? d.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Category</span>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
              <option value="">All</option>
              <option value="1">Academic</option>
              <option value="2">Technologist</option>
              <option value="3">Admin</option>
            </select>
          </label>
          <label className="block flex-1">
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Search</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Staff ID / name / email" className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </label>
        </div>
        <Msg kind="err" text={error} />
        {msg && !error && <Msg kind="ok" text={msg} />}
        {loading ? (
          <p className="font-body-sm text-on-surface-variant">Loading staff…</p>
        ) : items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No staff found {filterDeptId || filterCategory || search ? "for filters" : "for this institution"} — retrieved from stafflist + academic-staff.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(s=>(
                <div key={s.Id ?? s.id ?? s.staffId ?? s.StaffId} className="rounded-xl border border-surface-container bg-surface-container-lowest p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-label-md text-on-surface text-sm">{[s.Title ?? s.title, s.FirstName ?? s.firstName, s.LastName ?? s.lastName].filter(Boolean).join(" ")}</p>
                      <p className="font-body-sm text-on-surface-variant text-[12px]">{s.Email ?? s.email} {s.Specialization ? `· ${s.Specialization}` : s.specialization ? `· ${s.specialization}` : ""}</p>
                      <p className="font-body-sm text-outline text-[11px] mt-1">{s.DepartmentName ?? s.departmentName ?? depts.find(x=> String(x.Id??x.id)===String(s.DepartmentId??s.departmentId))?.Name ?? ""} {s.HighestQualification ?? s.highestQualification ? `· ${s.HighestQualification ?? s.highestQualification}` : ""}</p>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{s.staffId ?? s.StaffId ?? "—"}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>handleView(s)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-[12px] hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[14px]">visibility</span> View</button>
                    <button onClick={()=>handleEdit(s)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface font-label-md text-[12px] hover:bg-surface-variant"><span className="material-symbols-outlined text-[14px]">edit</span> Edit</button>
                    <button onClick={()=>handleDelete(s)} className="w-8 h-8 rounded-lg border border-error/30 text-error hover:bg-error-container flex items-center justify-center"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant">
                  <th className="py-2">Staff ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Dept</th>
                  <th className="py-2">Specialization</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {items.map((s) => (
                  <tr key={s.Id ?? s.id ?? s.staffId ?? s.StaffId}>
                    <td className="py-2 font-medium text-on-surface">{s.staffId ?? s.StaffId ?? "—"}</td>
                    <td className="py-2 text-on-surface-variant">{[s.Title ?? s.title, s.FirstName ?? s.firstName, s.LastName ?? s.lastName].filter(Boolean).join(" ")}</td>
                    <td className="py-2 text-on-surface-variant">{s.Email ?? s.email ?? "—"}</td>
                    <td className="py-2 text-on-surface-variant">{s.DepartmentName ?? s.departmentName ?? depts.find(x=> String(x.Id??x.id)===String(s.DepartmentId??s.departmentId))?.Name ?? "—"}</td>
                    <td className="py-2 text-on-surface-variant">{s.Specialization ?? s.specialization ?? "—"}</td>
                    <td className="py-2 text-on-surface-variant">{Number(s.StaffCategory ?? s.staffCategory)===1?"Academic":Number(s.StaffCategory ?? s.staffCategory)===2?"Technologist":Number(s.StaffCategory ?? s.staffCategory)===3?"Admin":"—"}</td>
                    <td className="py-2 flex gap-1">
                      <button onClick={()=>handleView(s)} className="px-2 py-1 rounded bg-primary text-on-primary text-[11px]">View</button>
                      <button onClick={()=>handleEdit(s)} className="px-2 py-1 rounded border border-outline-variant bg-surface text-[11px]">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Staff</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Department">
            <SelectInput value={deptId} onChange={(e) => onDeptChangeForCreate(e.target.value)}>
              <option value="">Select department</option>
              {depts.map((d) => (
                <option key={d.Id ?? d.id} value={String(d.Id ?? d.id)}>{d.Name ?? d.name}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Staff ID"><TextInput value={form.staffId} onChange={set("staffId")} /></Field>
            <Field label="Title"><TextInput value={form.title} onChange={set("title")} placeholder="Dr / Prof" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name"><TextInput value={form.firstName} onChange={set("firstName")} /></Field>
            <Field label="Last Name"><TextInput value={form.lastName} onChange={set("lastName")} /></Field>
          </div>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><TextInput value={form.phoneNo} onChange={set("phoneNo")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Highest Qualification"><TextInput value={form.highestQualification} onChange={set("highestQualification")} placeholder="PhD" /></Field>
            <Field label="Category">
              <SelectInput value={form.staffCategory} onChange={set("staffCategory")}>
                {STAFF_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Specialization"><TextInput value={form.specialization} onChange={set("specialization")} /></Field>
          <Field label="Program">
            <SelectInput value={form.programId} onChange={set("programId")}>
              <option value="">None</option>
              {programs.map((p) => (
                <option key={p.Id ?? p.id} value={String(p.Id ?? p.id)}>{p.Name ?? p.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Msg kind="err" text={msg && msg.includes("required") ? msg : ""} />
          {msg && !msg.includes("required") && <Msg kind={msg.includes("created")?"ok":"err"} text={msg} />}
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Staff"}
          </button>
        </form>
      </Card>
      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setViewing(null)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-xl shadow-elevated border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm font-bold text-primary">Staff Details</h3>
              <button onClick={()=>setViewing(null)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-label-md text-on-surface-variant">Staff ID:</span> {viewing.StaffId ?? viewing.staffId}</p>
              <p><span className="font-label-md text-on-surface-variant">Name:</span> {[viewing.Title ?? viewing.title, viewing.FirstName ?? viewing.firstName, viewing.LastName ?? viewing.lastName].filter(Boolean).join(" ")}</p>
              <p><span className="font-label-md text-on-surface-variant">Email:</span> {viewing.Email ?? viewing.email}</p>
              <p><span className="font-label-md text-on-surface-variant">Phone:</span> {viewing.PhoneNo ?? viewing.phoneNo ?? "—"}</p>
              <p><span className="font-label-md text-on-surface-variant">Qualification:</span> {viewing.HighestQualification ?? viewing.highestQualification ?? "—"}</p>
              <p><span className="font-label-md text-on-surface-variant">Category:</span> {Number(viewing.StaffCategory ?? viewing.staffCategory)===1?"Academic":Number(viewing.StaffCategory ?? viewing.staffCategory)===2?"Technologist":"Admin"}</p>
              <p><span className="font-label-md text-on-surface-variant">Specialization:</span> {viewing.Specialization ?? viewing.specialization ?? "—"}</p>
              <p><span className="font-label-md text-on-surface-variant">Department:</span> {viewing.DepartmentName ?? viewing.departmentName ?? ""}</p>
              <p><span className="font-label-md text-on-surface-variant">Program:</span> {viewing.ProgramId ?? viewing.programId ?? "—"}</p>
            </div>
            <button onClick={()=>setViewing(null)} className="mt-4 w-full bg-primary text-on-primary py-2 rounded font-label-md">Close</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>{setEditing(null); setEditForm(null)}}></div>
          <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-elevated border border-outline-variant p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm font-bold text-primary">Edit Staff — {editing.StaffId ?? editing.staffId}</h3>
              <button onClick={()=>{setEditing(null); setEditForm(null)}} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Staff ID</span><input value={editForm.staffId} onChange={handleEditChange("staffId")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
                <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Title</span><input value={editForm.title} onChange={handleEditChange("title")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">First Name</span><input value={editForm.firstName} onChange={handleEditChange("firstName")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
                <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Last Name</span><input value={editForm.lastName} onChange={handleEditChange("lastName")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              </div>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Email</span><input type="email" value={editForm.email} onChange={handleEditChange("email")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Phone</span><input value={editForm.phoneNo} onChange={handleEditChange("phoneNo")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Highest Qualification</span><input value={editForm.highestQualification} onChange={handleEditChange("highestQualification")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Category</span>
                <select value={editForm.staffCategory} onChange={handleEditChange("staffCategory")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm">
                  <option value={1}>Academic</option>
                  <option value={2}>Technologist</option>
                  <option value={3}>Admin</option>
                </select>
              </label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Specialization</span><input value={editForm.specialization} onChange={handleEditChange("specialization")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Program</span>
                <select value={editForm.programId} onChange={handleEditChange("programId")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm">
                  <option value="">None</option>
                  {programs.map(p=>(
                    <option key={p.Id ?? p.id} value={String(p.Id ?? p.id)}>{p.Name ?? p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Department</span>
                <select value={editForm.departmentId} onChange={handleEditChange("departmentId")} className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm">
                  {depts.map(d=>(
                    <option key={d.Id ?? d.id} value={String(d.Id ?? d.id)}>{d.Name ?? d.name}</option>
                  ))}
                </select>
              </label>
              <Msg kind="err" text={error} />
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="flex-1 bg-primary text-on-primary py-2 rounded font-label-md">{busy ? "Saving…" : "Update Staff"}</button>
                <button type="button" onClick={()=>{setEditing(null); setEditForm(null)}} className="flex-1 border border-outline-variant bg-surface py-2 rounded font-label-md">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


function StudentsTab({ instId }) {
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    matricNo: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    studentCategory: 2,
    areaOfInterest: "",
    level: "",
  });
  const { items, error, reload } = useList(
    () => onboardingApi.getUnassignedStudents({ institutionId: instId, departmentId: deptId || undefined }),
    instId + "|" + deptId
  );
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onboardingApi.getDepartments(instId).then((d) => setDepts(d || [])).catch(() => {});
  }, [instId]);
  useEffect(() => {
    if (!depts.length) return;
    const id = deptId || String(depts[0].Id);
    setDeptId(id);
    onboardingApi.getPrograms(instId, id).then((p) => setPrograms(p || [])).catch(() => setPrograms([]));
  }, [depts, instId]);

  const [programId, setProgramId] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const required = ["matricNo", "firstName", "lastName", "email", "level"];
    if (required.some((k) => !form[k].trim()) || !deptId || !programId) {
      setMsg("Matric No, name, email, level, department and program are required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.registerStudent({
        MatricNo: form.matricNo.trim(),
        FirstName: form.firstName.trim(),
        LastName: form.lastName.trim(),
        Email: form.email.trim(),
        PhoneNo: form.phoneNo.trim(),
        ProgramId: Number(programId),
        StudentCategory: Number(form.studentCategory),
        AreaOfInterest: form.areaOfInterest.trim(),
        DepartmentId: Number(deptId),
        InstitutionId: Number(instId),
        Level: form.level.trim(),
      });
      setMsg("Student registered.");
      setForm({
        matricNo: "", firstName: "", lastName: "", email: "", phoneNo: "",
        studentCategory: 2, areaOfInterest: "", level: "",
      });
      setProgramId("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Unassigned Students</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No unassigned students.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Matric No</th>
                <th className="py-2">Area of Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((s) => (
                <tr key={s.Id}>
                  <td className="py-2 font-medium text-on-surface">{s.MatricNo}</td>
                  <td className="py-2 text-on-surface-variant">{s.AreaOfInterest || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Register Student</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Department">
            <SelectInput value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Select department</option>
              {depts.map((d) => (
                <option key={d.Id} value={String(d.Id)}>{d.Name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Program">
            <SelectInput value={programId} onChange={setProgramId}>
              <option value="">Select program</option>
              {programs.map((p) => (
                <option key={p.Id} value={String(p.Id)}>{p.Name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Matric No"><TextInput value={form.matricNo} onChange={set("matricNo")} placeholder="CSC/2026/001" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name"><TextInput value={form.firstName} onChange={set("firstName")} /></Field>
            <Field label="Last Name"><TextInput value={form.lastName} onChange={set("lastName")} /></Field>
          </div>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><TextInput value={form.phoneNo} onChange={set("phoneNo")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <SelectInput value={form.studentCategory} onChange={set("studentCategory")}>
                {STUDENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Level"><TextInput value={form.level} onChange={set("level")} placeholder="400" /></Field>
          </div>
          <Field label="Area of Interest"><TextInput value={form.areaOfInterest} onChange={set("areaOfInterest")} /></Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Register Student"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function InstitutionTab() {
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    phoneNo: "",
    institutionType: "",
    address: "",
    website: "",
    facebookUrl: "",
    linkedinUrl: "",
  });
  const [logo, setLogo] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.code.trim() || !form.name.trim()) {
      setMsg("Code and Name are required.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("Code", form.code.trim());
      fd.append("Name", form.name.trim());
      fd.append("Email", form.email.trim());
      fd.append("PhoneNo", form.phoneNo.trim());
      fd.append("InstitutionType", form.institutionType.trim());
      fd.append("Address", form.address.trim());
      fd.append("Website", form.website.trim());
      fd.append("FacebookUrl", form.facebookUrl.trim());
      fd.append("LinkedinUrl", form.linkedinUrl.trim());
      if (logo) fd.append("logoFile", logo);
      await onboardingApi.createInstitution(fd);
      setMsg("Institution registered.");
      setForm({
        code: "", name: "", email: "", phoneNo: "", institutionType: "", address: "",
        website: "", facebookUrl: "", linkedinUrl: "",
      });
      setLogo(null);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 max-w-3xl">
      <h3 className="font-headline-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined">add_business</span> Register Institution
      </h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code"><TextInput value={form.code} onChange={set("code")} /></Field>
          <Field label="Name"><TextInput value={form.name} onChange={set("name")} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><TextInput value={form.phoneNo} onChange={set("phoneNo")} /></Field>
        </div>
        <Field label="Institution Type"><TextInput value={form.institutionType} onChange={set("institutionType")} placeholder="University" /></Field>
        <Field label="Address"><TextInput value={form.address} onChange={set("address")} /></Field>
        <Field label="Website"><TextInput value={form.website} onChange={set("website")} placeholder="https://" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Facebook URL"><TextInput value={form.facebookUrl} onChange={set("facebookUrl")} /></Field>
          <Field label="LinkedIn URL"><TextInput value={form.linkedinUrl} onChange={set("linkedinUrl")} /></Field>
        </div>
        <Field label="Logo">
          <input
            type="file"
            onChange={(e) => setLogo(e.target.files && e.target.files[0])}
            className="w-full text-sm text-on-surface-variant"
          />
        </Field>
        <Msg kind="err" text={msg} />
        <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
          {busy ? "Registering…" : "Register Institution"}
        </button>
      </form>
    </Card>
  );
}

/* ---------- Colleges (create + list) ---------- */
function CollegesTab({ instId }) {
  const collegeTerm = (() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      const v = localStorage.getItem(key)
      if (v === "School" || v === "Faculty" || v === "College") return v
      return "College"
    } catch { return "College" }
  })()
  const collegeLabel = collegeTerm === "Faculty" ? "Faculties" : collegeTerm === "School" ? "Schools" : "Colleges"
  const { items, error, reload } = useList(() => onboardingApi.getColleges(instId), instId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function displayName(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();
    const core = s.replace(/^(college|school|faculty)\s+of\s+/i, "").replace(/^(college|school|faculty)\s+/i, "").trim() || s;
    return `${collegeTerm} of ${core}`;
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!name.trim()) {
      setMsg(`${collegeTerm} name is required.`);
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createCollege({
        Code: code.trim(),
        CollegeName: name.trim(),
        Name: name.trim(),
        InstitutionId: Number(instId),
      });
      setMsg(`${collegeTerm} created.`);
      setName("");
      setCode("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">{collegeLabel}</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No {collegeLabel.toLowerCase()} found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Id</th>
                <th className="py-2">Name</th>
                <th className="py-2">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((c) => (
                <tr key={c.Id ?? c.id}>
                  <td className="py-2 font-medium text-on-surface">{c.Id ?? c.id}</td>
                  <td className="py-2 text-on-surface-variant">{displayName(c.CollegeName ?? c.collegeName ?? c.Name ?? c.name)}</td>
                  <td className="py-2 text-on-surface-variant">{c.Code ?? c.code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New {collegeTerm}</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={`${collegeTerm} of Medical Sciences`} /></Field>
          <Field label="Code"><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="COS" /></Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : `Create ${collegeTerm}`}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------- Levels (create + list) ---------- */
function LevelsTab({ instId }) {
  const { items, error, reload } = useList(() => onboardingApi.getLevels(instId), instId);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!name.trim()) {
      setMsg("Level name is required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createLevel({
        Name: name.trim(),
        Value: value.trim(),
        InstitutionId: Number(instId),
      });
      setMsg("Level created.");
      setName("");
      setValue("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Levels</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No levels found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Id</th>
                <th className="py-2">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((l) => (
                <tr key={l.Id}>
                  <td className="py-2 font-medium text-on-surface">{l.Id}</td>
                  <td className="py-2 text-on-surface-variant">{l.Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Level</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="400 Level" /></Field>
          <Field label="Value"><TextInput value={value} onChange={(e) => setValue(e.target.value)} placeholder="400" /></Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Level"}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------- Postgraduate (list + create) ---------- */
function PostgraduateTab({ instId }) {
  const { items, error, reload } = useList(() => onboardingApi.getPostgraduates(instId), instId);
  const [form, setForm] = useState({ matricNo: "", firstName: "", lastName: "", email: "", title: "", researchArea: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e2) => setForm((f) => ({ ...f, [k]: e2.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.matricNo.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setMsg("Matric No, first and last name are required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createPostgraduate({
        MatricNo: form.matricNo.trim(),
        FirstName: form.firstName.trim(),
        LastName: form.lastName.trim(),
        Email: form.email.trim(),
        Title: form.title.trim(),
        ResearchArea: form.researchArea.trim(),
        InstitutionId: Number(instId),
      });
      setMsg("Postgraduate created.");
      setForm({ matricNo: "", firstName: "", lastName: "", email: "", title: "", researchArea: "" });
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Postgraduate Students</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No postgraduate records found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Matric No</th>
                <th className="py-2">Name</th>
                <th className="py-2">Research Area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((p) => (
                <tr key={p.Id}>
                  <td className="py-2 font-medium text-on-surface">{p.MatricNo}</td>
                  <td className="py-2 text-on-surface-variant">{p.FirstName} {p.LastName}</td>
                  <td className="py-2 text-on-surface-variant">{p.ResearchArea || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Postgraduate</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Matric No"><TextInput value={form.matricNo} onChange={set("matricNo")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name"><TextInput value={form.firstName} onChange={set("firstName")} /></Field>
            <Field label="Last Name"><TextInput value={form.lastName} onChange={set("lastName")} /></Field>
          </div>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Title"><TextInput value={form.title} onChange={set("title")} placeholder="M.Sc / Ph.D" /></Field>
          <Field label="Research Area"><TextInput value={form.researchArea} onChange={set("researchArea")} /></Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Postgraduate"}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------- Lookup & Edit (staff / student detail + update) ---------- */
function LookupTab({ instId }) {
  const [kind, setKind] = useState("student");
  const [query, setQuery] = useState("");
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [records, setRecords] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!instId) return;
    onboardingApi.getDepartments(instId).then((d) => setDepts(d || [])).catch(() => {});
  }, [instId]);

  const search = async (e) => {
    e.preventDefault();
    setError(""); setMsg(""); setResult(null); setRecords([]);
    setBusy(true);
    try {
      if (kind === "student") {
        if (query.trim()) {
          const s = await onboardingApi.getStudent(query.trim());
          setResult(s);
        } else if (deptId) {
          const list = await onboardingApi.getDepartmentStudents(deptId, instId);
          setRecords(list || []);
        } else {
          const list = await onboardingApi.getStudentsByInstitution(instId);
          setRecords(list || []);
        }
      } else {
        if (query.trim()) {
          const s = await onboardingApi.getStaff(query.trim(), instId);
          setResult(s);
        } else if (deptId) {
          const list = await onboardingApi.getStaffList(deptId, instId);
          setRecords(list || []);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStudent = async (ev) => {
    ev.preventDefault();
    if (!result || !result.MatricNo) return;
    setMsg(""); setError("");
    setBusy(true);
    try {
      await onboardingApi.updateStudent(result.MatricNo, {
        MatricNo: result.MatricNo,
        FirstName: result.FirstName,
        LastName: result.LastName,
        Email: result.Email,
        PhoneNo: result.PhoneNo,
        AreaOfInterest: result.AreaOfInterest,
        Level: result.Level,
        DepartmentId: result.DepartmentId ? Number(result.DepartmentId) : Number(deptId || instId && 0),
        InstitutionId: Number(instId),
      });
      setMsg("Student updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pk = (r) => r.Id ?? r.id ?? r.MatricNo ?? r.staffId ?? JSON.stringify(r);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Lookup Staff / Student</h3>
        <form onSubmit={search} className="flex flex-col md:flex-row gap-3 md:items-end">
          <CustomField label="Type">
            <SelectInput value={kind} onChange={(e) => setKind(e.target.value)} className="max-w-[140px]">
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </SelectInput>
          </CustomField>
          <CustomField label="Matric / Staff ID">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID" />
          </CustomField>
          <CustomField label="Department (optional)">
            <SelectInput value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">All departments</option>
              {depts.map((d) => (
                <option key={d.Id} value={String(d.Id)}>{d.Name}</option>
              ))}
            </SelectInput>
          </CustomField>
          <button className="bg-primary text-on-primary px-5 py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="mt-2">
          <Msg kind="err" text={error} />
          {msg && <Msg kind="ok" text={msg} />}
        </div>
      </Card>

      {result && (
        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary mb-3">Edit {kind === "student" ? "Student" : "Staff"}</h3>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} className="mb-2 flex flex-col sm:flex-row sm:gap-3">
              <span className="font-label-md text-on-surface-variant w-48 shrink-0">{k}</span>
              <input
                className={inputCls}
                value={v ?? ""}
                onChange={(e) => setResult((r) => ({ ...r, [k]: e.target.value }))}
              />
            </div>
          ))}
          {kind === "student" && (
            <button className="mt-3 bg-primary text-on-primary px-5 py-2 rounded font-label-md" onClick={updateStudent} disabled={busy}>
              Update Student
            </button>
          )}
        </Card>
      )}

      {records.length > 0 && (
        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary mb-3">{kind === "student" ? "Students" : "Staff"} ({records.length})</h3>
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant">
                  <th className="py-2">{kind === "student" ? "Matric No" : "Staff ID"}</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {records.map((r) => (
                  <tr key={pk(r)}>
                    <td className="py-2 font-medium text-on-surface">{r.MatricNo ?? r.staffId ?? r.Id}</td>
                    <td className="py-2 text-on-surface-variant">{r.FirstName} {r.LastName}</td>
                    <td className="py-2 text-on-surface-variant">{r.DepartmentName || r.DepartmentId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CustomField({ label, children }) {
  return (
    <label className="block flex-1">
      <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
