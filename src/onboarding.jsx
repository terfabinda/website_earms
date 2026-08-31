// EARMS Admin Onboarding module — wired to /api/onboarding endpoints.
// Renders inside the shared DashShell (sidebar/header) from main.jsx.
import React, { useState, useEffect, useCallback } from "react";
import { onboardingApi, STAFF_CATEGORIES, STUDENT_CATEGORIES } from "./onboarding";

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
  "colleges", "levels", "postgraduate", "lookup", "institution",
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
    onboardingApi
      .getInstitutionsDropdown()
      .then((list) => {
        setInstitutions(list || []);
        if (list && list.length) setInstId(String(list[0].Id));
      })
      .catch((e) => setInstErr(e.message || "Could not load institutions"));
  }, []);

  const tabs = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "departments", label: "Departments", icon: "account_tree" },
    { key: "programs", label: "Programs", icon: "menu_book" },
    { key: "staff", label: "Staff", icon: "group" },
    { key: "students", label: "Students", icon: "school" },
    { key: "colleges", label: "Colleges", icon: "account_balance" },
    { key: "levels", label: "Levels", icon: "format_list_numbered" },
    { key: "postgraduate", label: "Postgraduate", icon: "workspaces" },
    { key: "lookup", label: "Lookup & Edit", icon: "travel_explore" },
    { key: "institution", label: "New Institution", icon: "add_business" },
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
      {tab === "institution" && <InstitutionTab />}
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
                <tr key={d.Id}>
                  <td className="py-2 font-medium text-on-surface">{d.Code}</td>
                  <td className="py-2 text-on-surface-variant">{d.Name}</td>
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
  const { items, error, reload } = useList(
    () => (deptId ? onboardingApi.getPrograms(instId, deptId) : Promise.resolve([])),
    instId + "|" + deptId
  );
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onboardingApi.getDepartments(instId).then((d) => setDepts(d || [])).catch(() => {});
  }, [instId]);

  useEffect(() => {
    setDeptId(depts.length ? String(depts[0].Id) : "");
  }, [depts]);

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
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Programs</h3>
        <Msg kind="err" text={error} />
        {!deptId ? (
          <p className="font-body-sm text-on-surface-variant">Select a department to view programs.</p>
        ) : items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No programs for this department.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Id</th>
                <th className="py-2">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((p) => (
                <tr key={p.Id}>
                  <td className="py-2 font-medium text-on-surface">{p.Id}</td>
                  <td className="py-2 text-on-surface-variant">{p.Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [deptId, setDeptId] = useState("");
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
  const { items, error, reload } = useList(
    () => onboardingApi.getAcademicStaff({ institutionId: instId, departmentId: deptId || undefined }),
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="p-5 xl:col-span-2">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Academic Staff</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No staff found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Staff ID</th>
                <th className="py-2">Name</th>
                <th className="py-2">Specialization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((s) => (
                <tr key={s.Id}>
                  <td className="py-2 font-medium text-on-surface">{s.staffId}</td>
                  <td className="py-2 text-on-surface-variant">
                    {s.Title} {s.FirstName} {s.LastName}
                  </td>
                  <td className="py-2 text-on-surface-variant">{s.Specialization || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New Staff</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Department">
            <SelectInput value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Select department</option>
              {depts.map((d) => (
                <option key={d.Id} value={String(d.Id)}>{d.Name}</option>
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
                <option key={p.Id} value={String(p.Id)}>{p.Name}</option>
              ))}
            </SelectInput>
          </Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Staff"}
          </button>
        </form>
      </Card>
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
  const { items, error, reload } = useList(() => onboardingApi.getColleges(instId), instId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!name.trim()) {
      setMsg("College name is required.");
      return;
    }
    setBusy(true);
    try {
      await onboardingApi.createCollege({
        Name: name.trim(),
        Code: code.trim(),
        InstitutionId: Number(instId),
      });
      setMsg("College created.");
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
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Colleges</h3>
        <Msg kind="err" text={error} />
        {items.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">No colleges found.</p>
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
                <tr key={c.Id}>
                  <td className="py-2 font-medium text-on-surface">{c.Id}</td>
                  <td className="py-2 text-on-surface-variant">{c.Name}</td>
                  <td className="py-2 text-on-surface-variant">{c.Code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">New College</h3>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="College of Science" /></Field>
          <Field label="Code"><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="COS" /></Field>
          <Msg kind="err" text={msg} />
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create College"}
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
          const list = await onboardingApi.getStaffList(deptId);
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
