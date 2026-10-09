// Regulator dashboards — NUC (Universities), NBTE (Polytechnics/Monotechnics), NCCE (Colleges of Education)
// Read-only aggregation over /api/onboarding/regulator (see regulator-api-guide.md, git-ignored).
// Shared <RegulatorDashboard regulatorKey> + thin wrappers for routing.
import React, { useState, useEffect, useCallback } from "react";
import { regulatorApi, REGULATORS, matchesRegulatorType } from "./regulator";

const fmtNum = (v) => Number(v || 0).toLocaleString("en-NG");
const PALETTE = ["#1e3a8a", "#0f766e", "#7c3aed", "#b45309", "#0e7490", "#be123c", "#4d7c0f", "#6b7280"];

/* ---------- tiny primitives (match app styling) ---------- */
function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="glass-card ambient-shadow rounded-xl p-4 border border-surface-container flex items-start justify-between">
      <div>
        <p className="font-label-md text-on-surface-variant text-[11px] uppercase tracking-wide">{label}</p>
        <p className="font-headline-lg font-bold text-primary leading-none mt-1">{value}</p>
        {sub && <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: accent || "#1e3a8a" }}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={"glass-card ambient-shadow rounded-xl border border-surface-container bg-surface-container-lowest " + className}>{children}</div>;
}

function ErrBar({ err }) {
  if (!err) return null;
  return <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>;
}

function Bars({ data, height = 190, format = (v) => fmtNum(v) }) {
  if (!data || !data.length) return <p className="font-body-sm text-on-surface-variant text-sm">No data.</p>;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.slice(0, 10).map((d, i) => (
        <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${d.label}: ${fmtNum(d.value)}`}>
          <span className="font-label-md text-on-surface-variant text-[11px] mb-1">{format(d.value)}</span>
          <div className="w-full max-w-[44px] rounded-t-md" style={{ height: `${Math.max((Number(d.value) / max) * 68, 3)}%`, background: d.color || PALETTE[i % PALETTE.length] }} />
          <span className="font-label-md text-on-surface-variant text-[11px] mt-1.5 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ segments, size = 168, thickness = 26, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          {segments.map((seg, i) => {
            const frac = (Number(seg.value) || 0) / total;
            const dash = frac * circ;
            const off = -(acc * circ);
            acc += frac;
            return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color || PALETTE[i % PALETTE.length]} strokeWidth={thickness} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={off} />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && <span className="font-headline-md font-bold text-on-surface">{centerLabel}</span>}
          {centerSub && <span className="font-body-sm text-on-surface-variant text-[12px] px-3">{centerSub}</span>}
        </div>
      </div>
      <div className="space-y-2 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color || PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-on-surface">{s.label}</span>
            <span className="font-bold text-on-surface">{fmtNum(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBar({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 sm:w-52 truncate text-[13px] text-on-surface" title={label}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max((Number(value) / Math.max(max, 1)) * 100, 2)}%`, background: color || "#1e3a8a" }} />
      </div>
      <span className="w-14 text-right text-[13px] font-bold text-on-surface">{fmtNum(value)}</span>
    </div>
  );
}

/* ---------- Overview tab (guide endpoint #1) ---------- */
function OverviewTab({ dash, reg, go, route }) {
  if (!dash) return null;
  const byType = Array.isArray(dash.institutionsByType) ? dash.institutionsByType : [];
  const scopedTypes = byType.filter((t) => matchesRegulatorType(t.institutionType, reg.key));
  const scopedCount = scopedTypes.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const topStudents = (Array.isArray(dash.studentsByInstitution) ? dash.studentsByInstitution : []).slice(0, 8);
  const topStaff = (Array.isArray(dash.staffByInstitution) ? dash.staffByInstitution : []).slice(0, 8);
  const bySpec = (Array.isArray(dash.staffBySpecialization) ? dash.staffBySpecialization : []).slice(0, 10);
  const maxSpec = Math.max(...bySpec.map((s) => Number(s.count) || 0), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={`${reg.short} Institutions`} value={fmtNum(scopedCount)} sub={`${reg.scope} under mandate`} icon={reg.icon} accent={reg.accent} />
        <StatCard label="Total Staff" value={fmtNum(dash.totalStaff)} sub="All regulated institutions" icon="supervisor_account" accent="#0f766e" />
        <StatCard label="Total Students" value={fmtNum(dash.totalStudents)} sub="All regulated institutions" icon="school" accent="#7c3aed" />
        <StatCard label="Total Programmes" value={fmtNum(dash.totalProgrammes)} sub={`${fmtNum(dash.totalDepartments)} depts · ${fmtNum(dash.totalColleges)} colleges`} icon="menu_book" accent="#b45309" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary mb-1">Institutions by Type</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Highlighted slice is this regulator's mandate ({reg.scope}).</p>
          {byType.length ? (
            <Donut
              segments={byType.map((t, i) => ({ label: t.institutionType, value: Number(t.count) || 0, color: matchesRegulatorType(t.institutionType, reg.key) ? reg.accent : "#d1d5db" }))}
              centerLabel={fmtNum(scopedCount)}
              centerSub={`${reg.short} mandate`}
            />
          ) : <p className="font-body-sm text-on-surface-variant text-sm">No data.</p>}
        </Card>
        <Card className="p-5">
          <h3 className="font-headline-sm font-semibold text-primary mb-1">Staff by Specialization</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Top specializations across regulated institutions.</p>
          <div className="space-y-2.5">
            {bySpec.length ? bySpec.map((s, i) => <HBar key={i} label={s.specialization || "—"} value={Number(s.count) || 0} max={maxSpec} color={PALETTE[i % PALETTE.length]} />) : <p className="font-body-sm text-on-surface-variant text-sm">No data.</p>}
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm font-semibold text-primary">Top Institutions by Students</h3>
            <button onClick={() => go(`${route}?view=institutions`)} className="text-primary text-[13px] font-label-md hover:underline">View all →</button>
          </div>
          <Bars data={topStudents.map((s, i) => ({ label: String(s.institutionName || "").split(" ").slice(0, 2).join(" "), value: Number(s.studentCount) || 0, color: PALETTE[i % PALETTE.length] }))} />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm font-semibold text-primary">Top Institutions by Staff</h3>
            <button onClick={() => go(`${route}?view=institutions`)} className="text-primary text-[13px] font-label-md hover:underline">View all →</button>
          </div>
          <Bars data={topStaff.map((s, i) => ({ label: String(s.institutionName || "").split(" ").slice(0, 2).join(" "), value: Number(s.staffCount) || 0, color: PALETTE[(i + 2) % PALETTE.length] }))} />
        </Card>
      </div>
    </div>
  );
}

/* ---------- Institutions list tab (guide endpoint #2, mandate-filtered) ---------- */
function InstitutionsTab({ reg, route, go, onOpen }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      // Fetch unfiltered (backend exact-match on institutionType would drop variants
      // like Monotechnic vs Polytechnic), then filter client-side to the mandate.
      const res = await regulatorApi.getInstitutions({ search: debounced || undefined, page, pageSize });
      const items = Array.isArray(res.items) ? res.items : [];
      const scoped = items.filter((it) => matchesRegulatorType(it.institutionType, reg.key));
      setData({ items: scoped, totalCount: res.totalCount || 0, totalPages: res.totalPages || 1, _global: items.length });
    } catch (e) { setErr(e.message || "Could not load institutions"); setData({ items: [], totalCount: 0, totalPages: 1 }); }
    finally { setLoading(false); }
  }, [debounced, page, reg.key]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${reg.scope.toLowerCase()} by name or code…`} className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <span className="text-[12px] text-on-surface-variant whitespace-nowrap">Mandate filter: <b>{reg.scope}</b> · page {page} of {data.totalPages || 1}</span>
      </Card>
      <ErrBar err={err} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant text-[12px] uppercase tracking-wide">
                <th className="py-2.5 px-4">Institution</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Colleges</th>
                <th className="py-2.5 px-4 text-right">Departments</th>
                <th className="py-2.5 px-4 text-right">Programmes</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {data.items.map((it) => (
                <tr key={it.id ?? it.Id} className="hover:bg-surface-container-low">
                  <td className="py-3 px-4">
                    <p className="font-medium text-on-surface">{it.name ?? it.Name}</p>
                    <p className="text-[12px] text-on-surface-variant">{it.code ?? it.Code}{it.address ?? it.Address ? ` · ${it.address ?? it.Address}` : ""}</p>
                  </td>
                  <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-label-md text-white" style={{ background: reg.accent }}>{it.institutionType ?? it.InstitutionType ?? "—"}</span></td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.collegeCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.departmentCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.programmeCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right"><button onClick={() => onOpen(it.id ?? it.Id)} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-label-md hover:opacity-90">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !data.items.length && <p className="p-6 text-center font-body-sm text-on-surface-variant">No {reg.scope.toLowerCase()} found{debounced ? ` for “${debounced}”` : ""} on this page.</p>}
        {loading && <p className="p-6 text-center font-body-sm text-on-surface-variant">Loading…</p>}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant">
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg border border-outline-variant text-sm disabled:opacity-50 hover:bg-surface-variant">← Prev</button>
          <span className="text-[13px] text-on-surface-variant">Page {page} of {data.totalPages || 1} · {fmtNum(data.totalCount)} total (all types)</span>
          <button disabled={page >= (data.totalPages || 1) || loading} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm disabled:opacity-50 hover:bg-surface-variant">Next →</button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Institution details (guide endpoints #3–#8) ---------- */
function InstitutionDetails({ id, reg, onBack }) {
  const [detail, setDetail] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [staffStats, setStaffStats] = useState(null);
  const [studStats, setStudStats] = useState(null);
  const [tab, setTab] = useState("colleges");
  const [progSearch, setProgSearch] = useState("");
  const [progDetail, setProgDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr("");
    (async () => {
      try {
        const d = await regulatorApi.getInstitution(id);
        if (cancelled) return;
        setDetail(d);
        const [c, dp, pr, ss, st] = await Promise.all([
          regulatorApi.getColleges(id).catch(() => []),
          regulatorApi.getDepartments(id).catch(() => []),
          regulatorApi.getProgrammes(id).catch(() => []),
          regulatorApi.getStaffStatistics(id).catch(() => null),
          regulatorApi.getStudentStatistics(id).catch(() => null),
        ]);
        if (cancelled) return;
        setColleges(Array.isArray(c) ? c : []);
        setDepts(Array.isArray(dp) ? dp : []);
        setProgs(Array.isArray(pr) ? pr : []);
        setStaffStats(ss);
        setStudStats(st);
      } catch (e) { if (!cancelled) setErr(e.message || "Could not load institution"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const openProgramme = async (pid) => {
    try { setProgDetail(await regulatorApi.getProgramme(pid)); }
    catch (e) { setProgDetail({ error: e.message }); }
  };

  if (loading) return <p className="font-body-sm text-on-surface-variant">Loading institution…</p>;
  if (err) return (<div className="space-y-3"><ErrBar err={err} /><button onClick={onBack} className="text-primary text-sm hover:underline">← Back to list</button></div>);
  if (!detail) return null;

  const tabs = [
    { key: "colleges", label: `Colleges (${colleges.length})`, icon: "account_balance" },
    { key: "departments", label: `Departments (${depts.length})`, icon: "account_tree" },
    { key: "programmes", label: `Programmes (${progs.length})`, icon: "menu_book" },
    { key: "staff", label: "Staff Statistics", icon: "supervisor_account" },
    { key: "students", label: "Student Statistics", icon: "school" },
  ];
  const filteredProgs = progs.filter((p) => {
    const q = progSearch.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.departmentName, p.collegeName].join(" ").toLowerCase().includes(q);
  });
  // group departments by college
  const deptGroups = {};
  depts.forEach((d) => { const k = d.collegeName || "Unassigned"; (deptGroups[k] = deptGroups[k] || []).push(d); });

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-primary text-sm hover:underline">← Back to institutions</button>
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-md font-bold text-primary">{detail.name}</h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-label-md text-white" style={{ background: reg.accent }}>{detail.institutionType}</span>
            </div>
            <p className="font-body-sm text-on-surface-variant text-sm mt-1">{detail.code}{detail.address ? ` · ${detail.address}` : ""}</p>
            <p className="font-body-sm text-on-surface-variant text-[12px]">{detail.email || ""}{detail.phoneNo ? ` · ${detail.phoneNo}` : ""}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
          {[["Colleges", detail.collegeCount, "account_balance"], ["Departments", detail.departmentCount, "account_tree"], ["Programmes", detail.programmeCount, "menu_book"], ["Staff", detail.staffCount, "supervisor_account"], ["Students", detail.studentCount, "school"]].map(([l, v, ic]) => (
            <div key={l} className="rounded-lg bg-surface-container-low p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-on-surface-variant font-label-md">{l}</p>
              <p className="font-headline-sm font-bold text-on-surface">{fmtNum(v)}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[13px] ${tab === t.key ? "text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant"}`} style={tab === t.key ? { background: reg.accent } : {}}>
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {tab === "colleges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colleges.length ? colleges.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h4 className="font-bold text-on-surface">{c.name}</h4><p className="text-[12px] text-on-surface-variant">{c.code}</p></div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-[11px] font-label-md">{fmtNum(c.departmentCount)} depts</span>
              </div>
            </Card>
          )) : <p className="font-body-sm text-on-surface-variant text-sm">No colleges.</p>}
        </div>
      )}
      {tab === "departments" && (
        <div className="space-y-5">
          {Object.keys(deptGroups).length ? Object.entries(deptGroups).map(([college, list]) => (
            <Card key={college} className="overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant bg-surface-container-low font-label-md text-[13px] text-on-surface-variant">{college} · {list.length}</div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-surface-container">
                  {list.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-4 font-medium text-on-surface">{d.name} <span className="text-on-surface-variant font-normal">({d.code})</span></td>
                      <td className="py-2.5 px-4 text-right"><span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[12px]">{fmtNum(d.programmeCount)} programmes</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )) : <p className="font-body-sm text-on-surface-variant text-sm">No departments.</p>}
        </div>
      )}
      {tab === "programmes" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-outline-variant">
            <input value={progSearch} onChange={(e) => setProgSearch(e.target.value)} placeholder="Filter programmes…" className="w-full max-w-sm px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm outline-none focus:border-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead><tr className="text-on-surface-variant border-b border-outline-variant text-[12px] uppercase tracking-wide"><th className="py-2.5 px-4">Programme</th><th className="py-2.5 px-4">Department</th><th className="py-2.5 px-4">College</th><th className="py-2.5 px-4"></th></tr></thead>
              <tbody className="divide-y divide-surface-container">
                {filteredProgs.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low">
                    <td className="py-2.5 px-4 font-medium text-on-surface">{p.name}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">{p.departmentName}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">{p.collegeName}</td>
                    <td className="py-2.5 px-4 text-right"><button onClick={() => openProgramme(p.id)} className="text-primary text-[13px] hover:underline">Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredProgs.length && <p className="p-6 text-center font-body-sm text-on-surface-variant">No programmes.</p>}
        </Card>
      )}
      {tab === "staff" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-headline-sm font-semibold text-primary mb-3">Total Staff: {fmtNum(staffStats?.totalStaff)}</h3>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By College</h4>
            <div className="space-y-2.5">{(staffStats?.byCollege || []).map((c, i) => <HBar key={i} label={c.collegeName} value={Number(c.count) || 0} max={Math.max(...(staffStats?.byCollege || []).map((x) => Number(x.count) || 0), 1)} color={PALETTE[i % PALETTE.length]} />) || <p className="text-sm text-on-surface-variant">No data.</p>}</div>
          </Card>
          <Card className="p-5">
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By Specialization</h4>
            <Bars data={(staffStats?.bySpecialization || []).slice(0, 8).map((s, i) => ({ label: String(s.specialization || "").split(" ").slice(0, 2).join(" "), value: Number(s.count) || 0, color: PALETTE[i % PALETTE.length] }))} />
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mt-5 mb-2">By Department</h4>
            <div className="space-y-2 max-h-56 overflow-auto">{(staffStats?.byDepartment || []).map((d, i) => <HBar key={i} label={d.departmentName} value={Number(d.count) || 0} max={Math.max(...(staffStats?.byDepartment || []).map((x) => Number(x.count) || 0), 1)} color={PALETTE[(i + 3) % PALETTE.length]} />)}</div>
          </Card>
        </div>
      )}
      {tab === "students" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-headline-sm font-semibold text-primary mb-3">Total Students: {fmtNum(studStats?.totalStudents)}</h3>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By College</h4>
            <div className="space-y-2.5">{(studStats?.byCollege || []).map((c, i) => <HBar key={i} label={c.collegeName} value={Number(c.count) || 0} max={Math.max(...(studStats?.byCollege || []).map((x) => Number(x.count) || 0), 1)} color={PALETTE[i % PALETTE.length]} />) || <p className="text-sm text-on-surface-variant">No data.</p>}</div>
          </Card>
          <Card className="p-5">
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By Department</h4>
            <Bars data={(studStats?.byDepartment || []).slice(0, 8).map((d, i) => ({ label: String(d.departmentName || "").split(" ").slice(0, 2).join(" "), value: Number(d.count) || 0, color: PALETTE[(i + 1) % PALETTE.length] }))} />
          </Card>
        </div>
      )}
      {progDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProgDetail(null)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-xl shadow-elevated border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-sm font-bold text-primary">Programme Details</h3>
              <button onClick={() => setProgDetail(null)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            {progDetail.error
              ? <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2">{progDetail.error}</p>
              : (<div className="space-y-1.5 text-sm">
                <p className="font-bold text-on-surface text-base">{progDetail.name}</p>
                <p className="text-on-surface-variant">{progDetail.collegeName} → {progDetail.departmentName}</p>
                <p className="text-on-surface-variant text-[12px]">Programme ID {progDetail.id} · Dept {progDetail.departmentId} · College {progDetail.collegeId}</p>
              </div>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Shell: header switcher + view routing ---------- */
export function RegulatorDashboard({ go, regulatorKey, query }) {
  const reg = REGULATORS[regulatorKey] || REGULATORS.nuc;
  const view = (query?.get("view") || "overview").toLowerCase();
  const institutionId = query?.get("institutionId") || "";
  const [dash, setDash] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr("");
    regulatorApi.getDashboard()
      .then((d) => { if (!cancelled) setDash(d); })
      .catch((e) => { if (!cancelled) setErr(e.message || "Could not load dashboard"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const nav = (v) => go(`${reg.route}?view=${v}`);
  const openInstitution = (id) => go(`${reg.route}?view=institution&institutionId=${encodeURIComponent(id)}`);

  return (
    <div className="space-y-6">
      {/* cross-regulator switcher */}
      <div className="flex flex-wrap gap-2">
        {Object.values(REGULATORS).map((r) => (
          <button key={r.key} onClick={() => go(`${r.route}?view=overview`)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[13px] border ${r.key === reg.key ? "text-white border-transparent" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-variant"}`} style={r.key === reg.key ? { background: r.accent } : {}}>
            <span className="material-symbols-outlined text-[18px]">{r.icon}</span>{r.short} · {r.scope}
          </button>
        ))}
      </div>
      <Card className="p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between" >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: reg.accent }}><span className="material-symbols-outlined text-[26px]">{reg.icon}</span></div>
          <div>
            <h2 className="font-headline-md font-bold text-primary">{reg.short} — {reg.name}</h2>
            <p className="font-body-sm text-on-surface-variant text-sm">{reg.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => nav("overview")} className={`px-4 py-2 rounded-lg text-[13px] font-label-md ${view === "overview" ? "text-white" : "border border-outline-variant hover:bg-surface-variant"}`} style={view === "overview" ? { background: reg.accent } : {}}>Overview</button>
          <button onClick={() => nav("institutions")} className={`px-4 py-2 rounded-lg text-[13px] font-label-md ${view === "institutions" || view === "institution" ? "text-white" : "border border-outline-variant hover:bg-surface-variant"}`} style={view === "institutions" || view === "institution" ? { background: reg.accent } : {}}>Institutions</button>
        </div>
      </Card>
      <ErrBar err={err} />
      {loading && !dash && !err ? <p className="font-body-sm text-on-surface-variant">Loading {reg.short} dashboard…</p> : (
        <>
          {(view === "overview") && <OverviewTab dash={dash} reg={reg} go={go} route={reg.route} />}
          {(view === "institutions") && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
          {(view === "institution" && institutionId) && <InstitutionDetails id={institutionId} reg={reg} onBack={() => nav("institutions")} />}
          {(view === "institution" && !institutionId) && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
        </>
      )}
      {!loading && !dash && err && (
        <Card className="p-6 text-sm text-on-surface-variant">
          Could not reach <code>/api/onboarding/regulator/dashboard</code> — {err} Ensure you are signed in with a <code>RegulatorAdmin</code> account and the onboarding proxy is configured.
        </Card>
      )}
    </div>
  );
}

export function NucDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="nuc" query={query} />; }
export function NbteDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="nbte" query={query} />; }
export function NcceDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="ncce" query={query} />; }
