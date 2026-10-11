// Regulator dashboards — NUC (Universities), NBTE (Polytechnics/Monotechnics), NCCE (Colleges of Education)
// Read-only aggregation over /api/onboarding/regulator (see regulator-api-guide.md, git-ignored).
// Shared <RegulatorDashboard regulatorKey> + thin wrappers for routing.
import React, { useState, useEffect, useCallback } from "react";
import { regulatorApi, REGULATORS, matchesRegulatorType, classifyOwnership } from "./regulator";
import { authApi } from "./iam";

const fmtNum = (v) => Number(v || 0).toLocaleString("en-NG");
// Stitch "Nigerian Education Admin Dashboards" palette (stitched from the screens).
const STITCH_BAR_COLORS = ["#0b6639", "#1d4ed8", "#eab308", "#0284c7", "#2563eb", "#7c3aed", "#ea580c", "#94a3b8"];
const OWN_COLORS = { Federal: "#166534", State: "#b45309", Private: "#1e3a8a" };
const CARD_ICON_BG = ["#0b6639", "#1d4ed8", "#b45309", "#4338ca", "#059669", "#ea580c", "#7c3aed", "#0d9488"];

/* ---------- Stitch metric card: colored header, big number, large icon floated right ---------- */
function StitchMetricCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
      <div className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0" style={{ background: color }}>
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color }}>{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{value}</h3>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
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
            return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={thickness} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={off} />;
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
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color || STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length] }} />
            <span className="flex-1 truncate text-slate-600 font-medium">{s.label}</span>
            <span className="font-bold text-slate-800">{fmtNum(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBarStitch({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-right text-slate-500 text-[11px] truncate" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
        <div className="h-full rounded-r-full" style={{ width: `${Math.max((Number(value) / Math.max(max, 1)) * 100, 2)}%`, background: color }} />
      </div>
      <span className="w-14 text-slate-800 font-semibold text-[11px] text-right">{fmtNum(value)}</span>
    </div>
  );
}

/* ---------- Overview tab: Stitch 8-card metrics + 3 analytics panels, live data ---------- */
function OverviewTab({ dash, reg, go, route }) {
  const [ownership, setOwnership] = useState(null);
  useEffect(() => {
    let cancelled = false;
    // Ownership (Federal/State/Private) is name-derived — classify the
    // mandate-filtered institutions list (first 100).
    regulatorApi.getInstitutions({ page: 1, pageSize: 100 }).then((res) => {
      if (cancelled) return;
      const items = (Array.isArray(res.items) ? res.items : []).filter((it) => matchesRegulatorType(it.institutionType, reg.key));
      const counts = { Federal: 0, State: 0, Private: 0 };
      items.forEach((it) => { counts[classifyOwnership(it.name)]++; });
      setOwnership({ counts, total: items.length });
    }).catch(() => { if (!cancelled) setOwnership(null); });
    return () => { cancelled = true; };
  }, [reg.key]);
  if (!dash) return null;
  const byType = Array.isArray(dash.institutionsByType) ? dash.institutionsByType : [];
  const scopedTypes = byType.filter((t) => matchesRegulatorType(t.institutionType, reg.key));
  const scopedCount = scopedTypes.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const topStudents = (Array.isArray(dash.studentsByInstitution) ? dash.studentsByInstitution : []).slice(0, 6);
  const bySpec = (Array.isArray(dash.staffBySpecialization) ? dash.staffBySpecialization : []).slice(0, 8);
  const maxSpec = Math.max(...bySpec.map((s) => Number(s.count) || 0), 1);
  const own = ownership?.counts || { Federal: 0, State: 0, Private: 0 };
  const cards = [
    { label: `Accredited ${reg.typePlural}`, value: fmtNum(scopedCount), icon: "account_balance", color: CARD_ICON_BG[0] },
    { label: "Colleges", value: fmtNum(dash.totalColleges), sub: "Colleges of Education under mandate", icon: "apartment", color: CARD_ICON_BG[1] },
    { label: "Departments", value: fmtNum(dash.totalDepartments), icon: "account_tree", color: CARD_ICON_BG[2] },
    { label: "Approved Programmes", value: fmtNum(dash.totalProgrammes), icon: "menu_book", color: CARD_ICON_BG[3] },
    { label: "Total Supervisors & Staff", value: fmtNum(dash.totalStaff), icon: "supervisor_account", color: CARD_ICON_BG[4] },
    { label: "Total Projects & Students", value: fmtNum(dash.totalStudents), icon: "school", color: CARD_ICON_BG[5] },
    { label: "Federal Institutions", value: fmtNum(own.Federal), icon: "flag", color: OWN_COLORS.Federal },
    { label: "State Institutions", value: fmtNum(own.State), icon: "location_city", color: OWN_COLORS.State },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StitchMetricCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} color={c.color} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-slate-700">bar_chart</span>
            <h4 className="text-sm font-bold text-slate-800">Academic Staff by Specialization</h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-5">Live figures across regulated institutions</p>
          <div className="space-y-3.5 text-xs">
            {bySpec.length ? bySpec.map((s, i) => (
              <HBarStitch key={i} label={s.specialization || "—"} value={Number(s.count) || 0} max={maxSpec} color={STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length]} />
            )) : <p className="text-xs text-slate-500">No specialization data.</p>}
          </div>
        </section>
        <section className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-slate-700">pie_chart</span>
              <h4 className="text-sm font-bold text-slate-800">Institutions by Ownership</h4>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Federal vs State vs Private</p>
            {ownership ? (
              <div className="relative flex items-center justify-center my-4">
                <Donut
                  segments={["Federal", "State", "Private"].map((k) => ({ label: k, value: own[k] || 0, color: OWN_COLORS[k] }))}
                  size={168} thickness={24}
                  centerLabel={fmtNum(ownership.total)}
                  centerSub="institutions"
                />
              </div>
            ) : <p className="text-xs text-slate-500">Loading…</p>}
          </div>
          {ownership && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {["Federal", "State", "Private"].map((k) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: OWN_COLORS[k] }}></span>
                    <span className="text-slate-600 font-medium">{k}</span>
                  </div>
                  <span className="font-bold text-slate-800">{fmtNum(own[k])}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-700">leaderboard</span>
                <h4 className="text-sm font-bold text-slate-800">Leading Institutions by Enrolment</h4>
              </div>
              <button onClick={() => go(`${route}?view=institutions`)} className="text-[11px] text-emerald-700 font-semibold hover:underline">View all →</button>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">Top institutions by student population</p>
            <div className="space-y-3.5 text-xs">
              {topStudents.length ? topStudents.map((s, i) => {
                const max = Math.max(...topStudents.map((x) => Number(x.studentCount) || 0), 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-32 text-right text-slate-500 text-[11px] truncate" title={s.institutionName}>{s.institutionName}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-[#0b6639] h-full rounded-r-full" style={{ width: `${Math.max((Number(s.studentCount) / max) * 100, 3)}%` }} />
                    </div>
                    <span className="w-14 text-slate-800 font-semibold text-[11px] text-right">{fmtNum(s.studentCount)}</span>
                  </div>
                );
              }) : <p className="text-xs text-slate-500">No enrolment data.</p>}
            </div>
          </div>
        </section>
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
            <div className="space-y-2.5">{(staffStats?.byCollege || []).map((c, i) => <HBarStitch key={i} label={c.collegeName} value={Number(c.count) || 0} max={Math.max(...(staffStats?.byCollege || []).map((x) => Number(x.count) || 0), 1)} color={STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length]} />) || <p className="text-sm text-on-surface-variant">No data.</p>}</div>
          </Card>
          <Card className="p-5">
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By Specialization</h4>
            <div className="space-y-2.5">{(staffStats?.bySpecialization || []).slice(0, 8).map((s, i) => <HBarStitch key={i} label={s.specialization} value={Number(s.count) || 0} max={Math.max(...(staffStats?.bySpecialization || []).map((x) => Number(x.count) || 0), 1)} color={STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length]} />)}</div>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mt-5 mb-2">By Department</h4>
            <div className="space-y-2 max-h-56 overflow-auto">{(staffStats?.byDepartment || []).map((d, i) => <HBarStitch key={i} label={d.departmentName} value={Number(d.count) || 0} max={Math.max(...(staffStats?.byDepartment || []).map((x) => Number(x.count) || 0), 1)} color={STITCH_BAR_COLORS[(i + 3) % STITCH_BAR_COLORS.length]} />)}</div>
          </Card>
        </div>
      )}
      {tab === "students" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-headline-sm font-semibold text-primary mb-3">Total Students: {fmtNum(studStats?.totalStudents)}</h3>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By College</h4>
            <div className="space-y-2.5">{(studStats?.byCollege || []).map((c, i) => <HBarStitch key={i} label={c.collegeName} value={Number(c.count) || 0} max={Math.max(...(studStats?.byCollege || []).map((x) => Number(x.count) || 0), 1)} color={STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length]} />) || <p className="text-sm text-on-surface-variant">No data.</p>}</div>
          </Card>
          <Card className="p-5">
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By Department</h4>
            <div className="space-y-2.5">{(studStats?.byDepartment || []).slice(0, 8).map((d, i) => <HBarStitch key={i} label={d.departmentName} value={Number(d.count) || 0} max={Math.max(...(studStats?.byDepartment || []).map((x) => Number(x.count) || 0), 1)} color={STITCH_BAR_COLORS[(i + 1) % STITCH_BAR_COLORS.length]} />)}</div>
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

/* ---------- Stitch shell: green sidebar + topbar + footer (faithful to screens) ---------- */
function StitchNav({ reg, route, view, go, onLogout }) {
  const items = [
    { label: "Overview", icon: "dashboard", nav: `${route}?view=overview`, active: view === "overview" },
    { label: reg.sideType, icon: reg.icon === "precision_manufacturing" ? "factory" : "account_balance", nav: `${route}?view=institutions`, active: view === "institutions" || view === "institution" },
  ];
  return (
    <>
      {items.map((it) => (
        <button key={it.label} onClick={() => go(it.nav)} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors ${it.active ? "bg-[#0e6d3d] text-white font-medium shadow-sm border-l-4 border-emerald-300" : "text-emerald-100/80 hover:bg-[#0c5c34] hover:text-white font-normal"}`}>
          <span className={`material-symbols-outlined text-[18px] ${it.active ? "text-emerald-200" : ""}`}>{it.icon}</span>
          <span>{it.label}</span>
        </button>
      ))}
      <button onClick={onLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-emerald-100/80 hover:bg-[#0c5c34] hover:text-white font-normal text-xs transition-colors">
        <span className="material-symbols-outlined text-[18px]">logout</span>
        <span>Logout</span>
      </button>
    </>
  );
}

export function RegulatorDashboard({ go, regulatorKey, query }) {
  const reg = REGULATORS[regulatorKey] || REGULATORS.nuc;
  const view = (query?.get("view") || "overview").toLowerCase();
  const institutionId = query?.get("institutionId") || "";
  const [dash, setDash] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadDash = useCallback(() => {
    setLoading(true); setErr("");
    regulatorApi.getDashboard()
      .then((d) => setDash(d))
      .catch((e) => setErr(e.message || "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadDash(); }, [loadDash]);

  const nav = (v) => { setMobileNav(false); go(`${reg.route}?view=${v}`); };
  const openInstitution = (id) => { setMobileNav(false); go(`${reg.route}?view=institution&institutionId=${encodeURIComponent(id)}`); };
  const logout = async () => { try { await authApi.logout(); } catch {} go("login"); };
  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await regulatorApi.getInstitutions({ page: 1, pageSize: 100 });
      const items = (Array.isArray(res.items) ? res.items : []).filter((it) => matchesRegulatorType(it.institutionType, reg.key));
      const rows = [["ID", "Name", "Code", "Type", "Colleges", "Departments", "Programmes"],
        ...items.map((it) => [it.id, it.name, it.code, it.institutionType, it.collegeCount, it.departmentCount, it.programmeCount])];
      const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = `${reg.key}-institutions.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setErr(e.message || "Export failed"); }
    finally { setExporting(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#f0f4f8] text-slate-800 antialiased">
      {/* Sidebar */}
      <aside className="w-64 bg-[#084d2a] text-white flex-shrink-0 hidden md:flex flex-col justify-between min-h-screen shadow-xl border-r border-[#063d21]">
        <div>
          <div className="px-5 py-6 text-center border-b border-emerald-900/60 bg-[#064223]">
            <div className="w-24 h-24 mx-auto mb-3 bg-white p-2 rounded-full shadow-lg flex items-center justify-center overflow-hidden border-2 border-emerald-400/30">
              <img alt={`${reg.short} logo`} className="max-h-full max-w-full object-contain" src={reg.logo} />
            </div>
            <h1 className="text-xl font-bold tracking-wider uppercase text-white">{reg.short}</h1>
            <p className="text-[11px] text-emerald-200 tracking-wide font-medium mt-0.5 uppercase">EARMS Oversight Portal</p>
          </div>
          <nav className="mt-4 px-3 space-y-1">
            <StitchNav reg={reg} route={reg.route} view={view} go={go} onLogout={logout} />
          </nav>
        </div>
        <div className="px-3 pb-5 pt-2 border-t border-emerald-900/50">
          <div className="flex items-center gap-3 px-3.5 py-2.5 text-emerald-200 text-xs">
            <span className="material-symbols-outlined text-[18px]">help</span>
            <span>Help Centre</span>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNav(true)} className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600"><span className="material-symbols-outlined">menu</span></button>
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-tight">Welcome, Admin</h2>
              <p className="text-xs text-slate-500">{reg.commission}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700">
              <span className="material-symbols-outlined text-[16px] text-slate-500">calendar_month</span>
              <span>2025/2026 Academic Session</span>
            </div>
            <button onClick={() => nav("institutions")} className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600">
              <span className="material-symbols-outlined text-[16px] text-slate-500">account_balance</span>
              <span>{reg.scopePill}</span>
            </button>
            <button onClick={exportCSV} disabled={exporting} className="flex items-center gap-2 bg-[#0b6639] hover:bg-[#09542f] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-60">
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>{exporting ? "Exporting…" : reg.exportLabel}</span>
            </button>
            <button onClick={loadDash} title="Refresh" className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 bg-white">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-semibold flex items-center justify-center text-xs ring-2 ring-emerald-200/50">AD</div>
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)}></div>
            <div className="relative w-64 h-full bg-[#084d2a] text-white p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">{reg.short} Portal</span>
                <button onClick={() => setMobileNav(false)} className="p-1.5 rounded hover:bg-[#0c5c34]"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="space-y-1">
                <StitchNav reg={reg} route={reg.route} view={view} go={nav} onLogout={logout} />
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 space-y-6 flex-1">
          {view === "overview" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold text-[#093d22] tracking-tight">{reg.dashTitle}</h1>
                <p className="text-xs text-slate-500 font-normal mt-0.5">{reg.titleSub}</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-200/90 text-amber-800 px-3.5 py-1.5 rounded-lg text-xs font-medium self-start sm:self-auto">
                <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                <span>OFFICIAL OVERSIGHT • Live Figures</span>
              </div>
            </div>
          )}
          <ErrBar err={err} />
          {loading && !dash && !err ? <p className="text-sm text-slate-500">Loading {reg.short} dashboard…</p> : (
            <>
              {(view === "overview") && <OverviewTab dash={dash} reg={reg} go={go} route={reg.route} />}
              {(view === "institutions") && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
              {(view === "institution" && institutionId) && <InstitutionDetails id={institutionId} reg={reg} onBack={() => nav("institutions")} />}
              {(view === "institution" && !institutionId) && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
            </>
          )}
          {!loading && !dash && err && (
            <div className="bg-white rounded-xl p-6 text-sm text-slate-500 border border-slate-200">
              Could not reach <code>/api/onboarding/regulator/dashboard</code> — {err} Ensure you are signed in with a <code>RegulatorAdmin</code> account and the onboarding proxy is configured.
            </div>
          )}
        </div>

        <footer className="bg-white border-t border-slate-200/80 px-4 md:px-8 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div><span className="font-semibold text-slate-700">EARMS</span> • {reg.footerMid.replace(/^EARMS • /, "")}</div>
          <div className="text-[11px] text-slate-400">{reg.footerRight}</div>
        </footer>
      </div>
    </div>
  );
}

export function NucDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="nuc" query={query} />; }
export function NbteDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="nbte" query={query} />; }
export function NcceDashboard({ go, query }) { return <RegulatorDashboard go={go} regulatorKey="ncce" query={query} />; }
