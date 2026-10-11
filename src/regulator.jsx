// Regulator dashboards — NUC (Universities), NBTE (Polytechnics/Monotechnics), NCCE (Colleges of Education)
// Read-only aggregation over /api/onboarding/regulator (see regulator-api-guide.md, git-ignored).
// Shared <RegulatorDashboard regulatorKey> + thin wrappers for routing.
import React, { useState, useEffect, useCallback } from "react";
import { regulatorApi, REGULATORS, matchesRegulatorType, classifyOwnership } from "./regulator";
import { analyticsApi, ANALYTICS_STATUS_COLORS } from "./analytics";
import { authApi } from "./iam";

const fmtNum = (v) => Number(v || 0).toLocaleString("en-NG");
// Stitch "Nigerian Education Admin Dashboards" palette (stitched from the screens).
const STITCH_BAR_COLORS = ["#0b6639", "#1d4ed8", "#eab308", "#0284c7", "#2563eb", "#7c3aed", "#ea580c", "#94a3b8"];
const OWN_COLORS = { Federal: "#166534", State: "#b45309", Private: "#1e3a8a" };
const CARD_ICON_BG = ["#0b6639", "#1d4ed8", "#b45309", "#4338ca", "#059669", "#ea580c", "#7c3aed", "#0d9488"];

/* ---------- Stitch metric card: colored header, big number, large icon floated right ---------- */
function StitchMetricCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3">
      <div className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0" style={{ background: color }}>
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight mt-0.5">{value}</h3>
        {sub && <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{sub}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={"bg-white rounded-xl border border-slate-200/80 shadow-xs " + className}>{children}</div>;
}

function ErrBar({ err }) {
  if (!err) return null;
  return <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>;
}

function Donut({ segments, size = 168, thickness = 26, centerLabel, centerSub, sideLegend = true }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className={`relative shrink-0 ${sideLegend ? "" : "mx-auto"}`} style={{ width: size, height: size }}>
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
      {sideLegend && (
      <div className="space-y-2 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color || STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length] }} />
            <span className="flex-1 truncate text-slate-600 font-medium">{s.label}</span>
            <span className="font-bold text-slate-800">{fmtNum(s.value)}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function AxisScale({ max }) {
  const step = Math.ceil(max / 4 / 5000) * 5000 || 5000;
  const ticks = [0, step, step * 2, step * 3, step * 4];
  return (
    <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between text-[10px] text-slate-400 pl-32 pr-2">
      {ticks.map((t) => (<span key={t}>{fmtNum(t)}</span>))}
    </div>
  );
}

function HBarStitch({ label, value, max, color }) {  return (
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
  const [mandate, setMandate] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Page through the institutions list (max 100/page, cap 5 pages) so the
        // mandate slice + ownership split are complete, not first-page-only.
        let page = 1, fetched = 0, total = Infinity, pages = 0;
        const all = [];
        while (fetched < total && pages < 5) {
          const res = await regulatorApi.getInstitutions({ page, pageSize: 100 });
          const items = Array.isArray(res.items) ? res.items : [];
          total = res.totalCount || items.length;
          fetched += items.length;
          pages++;
          all.push(...items.filter((it) => matchesRegulatorType(it.institutionType, reg.key)));
          if (!items.length) break;
        }
        if (cancelled) return;
        const counts = { Federal: 0, State: 0, Private: 0 };
        const ids = new Set();
        let colleges = 0, depts = 0, progs = 0;
        all.forEach((it) => {
          counts[classifyOwnership(it.name)]++;
          ids.add(String(it.id));
          colleges += Number(it.collegeCount) || 0;
          depts += Number(it.departmentCount) || 0;
          progs += Number(it.programmeCount) || 0;
        });
        setMandate({ counts, total: all.length, ids, colleges, depts, progs, complete: fetched >= total });
      } catch { if (!cancelled) setMandate(null); }
    })();
    return () => { cancelled = true; };
  }, [reg.key]);
  if (!dash) return null;
  const byType = Array.isArray(dash.institutionsByType) ? dash.institutionsByType : [];
  const scopedTypes = byType.filter((t) => matchesRegulatorType(t.institutionType, reg.key));
  const scopedCount = scopedTypes.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const own = mandate?.counts || { Federal: 0, State: 0, Private: 0 };
  // Per-institution top-lists scoped to this mandate via the id set (only when
  // the mandate fetch completed; otherwise fall back to global aggregates).
  const inMandate = (id) => mandate?.complete && mandate.ids.has(String(id));
  const sumFor = (list, key) => (list || []).filter((r) => inMandate(r.institutionId)).reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const staffList = Array.isArray(dash.staffByInstitution) ? dash.staffByInstitution : [];
  const studentList = Array.isArray(dash.studentsByInstitution) ? dash.studentsByInstitution : [];
  const scopedStaff = mandate?.complete ? sumFor(staffList, "staffCount") : (dash.totalStaff ?? 0);
  const scopedStudents = mandate?.complete ? sumFor(studentList, "studentCount") : (dash.totalStudents ?? 0);
  const scopedColleges = mandate?.complete ? mandate.colleges : (dash.totalColleges ?? 0);
  const scopedDepts = mandate?.complete ? mandate.depts : (dash.totalDepartments ?? 0);
  const scopedProgs = mandate?.complete ? mandate.progs : (dash.totalProgrammes ?? 0);
  const scopedInst = mandate?.complete ? mandate.total : scopedCount;
  const topStudents = studentList.slice(0, 6);
  const bySpec = (Array.isArray(dash.staffBySpecialization) ? dash.staffBySpecialization : []).slice(0, 8);
  const maxSpec = Math.max(...bySpec.map((s) => Number(s.count) || 0), 1);
  // Illustrative fallbacks (mandate spec): live-first, mock figures when the
  // endpoint returns 0; cards 5–8 + repo/gender panels have no backing endpoint.
  const fb = reg.fallbacks || {};
  const pendingPct = reg.completion ? (100 - reg.completion.pct) : 0;
  const pendingPctLabel = Number.isInteger(pendingPct) ? String(pendingPct) : pendingPct.toFixed(1);
  const cards = reg.fallbacks ? [
    { label: reg.cardAccredited, value: fmtNum(scopedInst || fb.inst), sub: reg.cardAccreditedSub, icon: "account_balance", color: "#0b6639" },
    { label: reg.cardStaff, value: fmtNum(scopedStaff || fb.staff), sub: reg.cardStaffSub, icon: "supervisor_account", color: "#1d4ed8" },
    { label: reg.cardStudents, value: fmtNum(scopedStudents || fb.students), sub: reg.cardStudentsSub, icon: "school", color: "#a16207" },
    { label: reg.cardProgs, value: fmtNum(scopedProgs || fb.progs), sub: reg.cardProgsSub, icon: "menu_book", color: "#1e3a8a" },
    { label: reg.cardCompleted, value: fmtNum(reg.completion.completed), sub: `${reg.completion.pct}% Completion rate`, icon: "task", color: "#059669" },
    { label: reg.cardPending, value: fmtNum(reg.completion.pending), sub: `${pendingPctLabel}% Awaiting completion`, icon: "schedule", color: "#65a30d" },
    { label: reg.cardRepo, value: fmtNum(reg.reposTotal), sub: "Institutional repositories", icon: "dns", color: "#7c3aed" },
    { label: reg.cardRecords, value: fmtNum(reg.recordsTotal), sub: reg.cardRecordsSub, icon: "inventory_2", color: "#be185d" },
  ] : [
    { label: `${reg.typePlural}`, value: fmtNum(scopedInst), icon: "account_balance", color: CARD_ICON_BG[0] },
    { label: reg.unitTerm, value: fmtNum(scopedColleges), sub: `${reg.unitTerm} under mandate`, icon: "apartment", color: CARD_ICON_BG[1] },
    { label: "Departments", value: fmtNum(scopedDepts), icon: "account_tree", color: CARD_ICON_BG[2] },
    { label: "Approved Programmes", value: fmtNum(scopedProgs), icon: "menu_book", color: CARD_ICON_BG[3] },
    { label: "Total Supervisors & Staff", value: fmtNum(scopedStaff), icon: "supervisor_account", color: CARD_ICON_BG[4] },
    { label: "Total Projects & Students", value: fmtNum(scopedStudents), icon: "school", color: CARD_ICON_BG[5] },
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
        {reg.fallbacks ? (
          <>
            <section className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-slate-700">bar_chart</span>
                  <h4 className="text-sm font-bold text-slate-800">{reg.repoCats ? "Research Repository by Category" : "Academic Staff by Specialization"}</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-5">{reg.repoCats ? `All sessions - ${fmtNum(reg.repoTotal)}` : "Live figures across regulated institutions"}</p>
                <div className="space-y-3.5 text-xs">
                  {(reg.repoCats || []).length ? reg.repoCats.map((c, i) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className="w-32 text-right text-slate-500 text-[11px] truncate" title={c.label}>{c.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div className="h-full rounded-r-full" style={{ width: `${Math.max((c.value / Math.max(...reg.repoCats.map((x) => x.value), 1)) * 100, 2)}%`, background: STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length] }} />
                      </div>
                      <span className="w-14 text-slate-800 font-semibold text-[11px] text-right">{fmtNum(c.value)}</span>
                    </div>
                  )) : (bySpec.length ? bySpec.map((s, i) => (
                    <HBarStitch key={i} label={s.specialization || "—"} value={Number(s.count) || 0} max={maxSpec} color={STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length]} />
                  )) : <p className="text-xs text-slate-500">No specialization data.</p>)}
                </div>
              </div>
              {(reg.repoCats || []).length ? <AxisScale max={Math.max(...reg.repoCats.map((x) => x.value), 1)} /> : null}
            </section>
            <section className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-slate-700">pie_chart</span>
                  <h4 className="text-sm font-bold text-slate-800">Project Completion</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-4">Project Completion Rate</p>
                <div className="relative flex items-center justify-center my-4">
                  <Donut
                    segments={[
                      { label: "Completed", value: reg.completion.pct, color: "#0b6639" },
                      { label: "Pending", value: 100 - reg.completion.pct, color: "#cbd5e1" },
                    ]}
                    size={168} thickness={24}
                    centerLabel={`${reg.completion.pct}%`}
                    centerSub="Completion Rate"
                    sideLegend={false}
                  />
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0b6639]"></span>
                    <span className="text-slate-600 font-medium">Completed</span>
                  </div>
                  <span className="font-bold text-slate-800">{fmtNum(reg.completion.completed)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                    <span className="text-slate-600 font-medium">Pending</span>
                  </div>
                  <span className="font-bold text-slate-800">{fmtNum(reg.completion.pending)}</span>
                </div>
              </div>
            </section>
            <section className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-slate-700">group</span>
                  <h4 className="text-sm font-bold text-slate-800">{reg.gender ? "Project Numbers by Student Gender" : "Leading Institutions by Enrolment"}</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-5">{reg.gender ? "Illustrative split" : "Top institutions by student population"}</p>
                {reg.gender ? (
                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
                  {[
                    { key: "male", title: "Male", color: "#2563eb", soft: "bg-blue-50", text: "text-blue-900", iconColor: "text-blue-600" },
                    { key: "female", title: "Female", color: "#f59e0b", soft: "bg-amber-50", text: "text-amber-900", iconColor: "text-amber-600" },
                  ].map((col) => {
                    const rows = reg.gender[col.key];
                    const max = Math.max(...rows.map((r) => r.value), 1);
                    return (
                      <div key={col.key} className={`space-y-3 ${col.key === "female" ? "pl-4" : "pr-2"}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${col.soft} flex items-center justify-center`}>
                            <span className={`material-symbols-outlined text-[16px] ${col.iconColor}`}>person</span>
                          </div>
                          <span className={`font-bold text-xs ${col.text}`}>{col.title}</span>
                        </div>
                        <div className="space-y-2">
                          {rows.map((r) => (
                            <div key={r.label}>
                              <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                                <span>{r.label}</span>
                                <span className="font-bold text-slate-800">{fmtNum(r.value)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="h-2 rounded-full" style={{ width: `${Math.max((r.value / max) * 100, 3)}%`, background: col.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
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
                )}
              </div>
              {reg.gender && (
              <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                  <span>Male</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                  <span>Female</span>
                </div>
              </div>
              )}
            </section>
          </>
        ) : (
          <>
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
            {mandate ? (
              <div className="relative flex items-center justify-center my-4">
                <Donut
                  segments={["Federal", "State", "Private"].map((k) => ({ label: k, value: own[k] || 0, color: OWN_COLORS[k] }))}
                  size={168} thickness={24}
                  centerLabel={fmtNum(mandate.total)}
                  centerSub="institutions"
                />
              </div>
            ) : <p className="text-xs text-slate-500">Loading…</p>}
          </div>
          {mandate && (
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
          </>
        )}
      </div>
      {reg.proposals && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Submitted Projects / Project Proposals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const p = reg.proposals;
              const pct = (v) => `${((Number(v) / Number(p.total)) * 100).toFixed(1)}%`;
              return [
                { label: "Total", value: fmtNum(p.total), icon: "fact_check", color: "#0b6639" },
                { label: "Approved", value: fmtNum(p.approved), sub: `${pct(p.approved)} approved`, icon: "check_circle", color: "#059669" },
                { label: "Pending", value: fmtNum(p.pending), sub: `${pct(p.pending)} pending`, icon: "pending_actions", color: "#b45309" },
                { label: "Failed Approvals", value: fmtNum(p.failed), sub: `${pct(p.failed)} failure`, icon: "cancel", color: "#be123c" },
              ].map((c) => (
                <StitchMetricCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} color={c.color} />
              ));
            })()}
          </div>
        </div>
      )}
      {reg.proposalLevels && (
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-slate-700">assignment</span>
              <h3 className="text-sm font-bold text-slate-800">Submitted Projects/Project Proposals</h3>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Proposals for 2025/2026 * Repository records all sessions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead>
                <tr className="text-slate-500 text-[11px] uppercase border-b border-slate-100">
                  <th className="py-2.5 px-4 font-semibold">Study Level/Research Type</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Students</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Completed</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Pending</th>
                  <th className="py-2.5 px-4 font-semibold">Completion</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Repository Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reg.proposalLevels.map((r) => {
                  const pending = r.students - r.completed;
                  const pct = (r.completed / r.students) * 100;
                  return (
                    <tr key={r.level} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-medium text-slate-800">{r.level}</td>
                      <td className="py-2.5 px-4 text-right font-bold">{fmtNum(r.students)}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700">{fmtNum(r.completed)}</td>
                      <td className="py-2.5 px-4 text-right text-amber-700">{fmtNum(pending)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[80px]">
                            <div className="bg-[#0b6639] h-2 rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 w-12">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">{fmtNum(r.records)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const tS = reg.proposalLevels.reduce((s, r) => s + r.students, 0);
                  const tC = reg.proposalLevels.reduce((s, r) => s + r.completed, 0);
                  const tP = tS - tC;
                  const avg = reg.proposalLevels.reduce((s, r) => s + (r.completed / r.students) * 100, 0) / reg.proposalLevels.length;
                  const tR = reg.proposalLevels.reduce((s, r) => s + r.records, 0);
                  return (
                    <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <td className="py-2.5 px-4">Total</td>
                      <td className="py-2.5 px-4 text-right">{fmtNum(tS)}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700">{fmtNum(tC)}</td>
                      <td className="py-2.5 px-4 text-right text-amber-700">{fmtNum(tP)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[80px]">
                            <div className="bg-[#0b6639] h-2 rounded-full" style={{ width: `${Math.max(avg, 2)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold w-12">{avg.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">{fmtNum(tR)}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
          <p className="px-5 py-3 text-[11px] italic text-slate-400 border-t border-slate-100">Thesis/dissertation labels may vary by university</p>
        </section>
      )}
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
  const [diag, setDiag] = useState("");
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setErr(""); setDiag("");
    try {
      // Fetch unfiltered (backend exact-match on institutionType would drop variants
      // like Monotechnic vs Polytechnic), then filter client-side to the mandate.
      const res = await regulatorApi.getInstitutions({ search: debounced || undefined, page, pageSize });
      const items = Array.isArray(res.items) ? res.items : [];
      const scoped = items.filter((it) => matchesRegulatorType(it.institutionType, reg.key));
      try {
        const types = [...new Set(items.map((it) => JSON.stringify(it.institutionType ?? it.InstitutionType)))].join(", ");
        console.log(`[regulator] institutions page ${page}: ${items.length} rows, ${scoped.length} in mandate (${reg.key}); types seen: ${types || "none"}; first row:`, items[0]);
      } catch {}
      const seen = [...new Set(items.map((it) => String(it.institutionType ?? it.InstitutionType ?? "—")))];
      setDiag(`Endpoint returned ${items.length} row(s) (total ${res.totalCount || 0}) · ${scoped.length} match ${reg.scope} · types seen: ${seen.join(" | ") || "none"}`);
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
      {diag && !loading && <p className="text-[12px] text-on-surface-variant">{diag}</p>}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant text-[12px] uppercase tracking-wide">
                <th className="py-2.5 px-4">Institution</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">{reg.unitTerm}</th>
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
                  <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-label-md text-white" style={{ background: "#0b6639" }}>{it.institutionType ?? it.InstitutionType ?? "—"}</span></td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.collegeCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.departmentCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right">{fmtNum(it.programmeCount ?? 0)}</td>
                  <td className="py-3 px-4 text-right"><button onClick={() => onOpen(it.id ?? it.Id)} className="px-3 py-1.5 rounded-lg bg-[#65a30d] text-white text-[13px] font-label-md hover:opacity-90">Open</button></td>
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
  const unitTerm = reg.unitTerm || "Colleges";
  const unitSing = unitTerm.replace(/s$/, "");
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
  if (err) return (<div className="space-y-3"><ErrBar err={err} /><button onClick={onBack} className="text-emerald-700 text-sm hover:underline">← Back to list</button></div>);
  if (!detail) return null;

  const tabs = [
    { key: "colleges", label: `${unitTerm} (${colleges.length})`, icon: "account_balance" },
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
      <button onClick={onBack} className="text-emerald-700 text-sm hover:underline">← Back to institutions</button>
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-md font-bold text-slate-800">{detail.name}</h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-label-md text-white" style={{ background: "#0b6639" }}>{detail.institutionType}</span>
            </div>
            <p className="font-body-sm text-on-surface-variant text-sm mt-1">{detail.code}{detail.address ? ` · ${detail.address}` : ""}</p>
            <p className="font-body-sm text-on-surface-variant text-[12px]">{detail.email || ""}{detail.phoneNo ? ` · ${detail.phoneNo}` : ""}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
          {[[unitTerm, detail.collegeCount, "account_balance"], ["Departments", detail.departmentCount, "account_tree"], ["Programmes", detail.programmeCount, "menu_book"], ["Staff", detail.staffCount, "supervisor_account"], ["Students", detail.studentCount, "school"]].map(([l, v, ic]) => (
            <div key={l} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-on-surface-variant font-label-md">{l}</p>
              <p className="font-headline-sm font-bold text-on-surface">{fmtNum(v)}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[13px] ${tab === t.key ? "text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-600"}`} style={tab === t.key ? { background: reg.accent } : {}}>
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
              <thead><tr className="text-on-surface-variant border-b border-outline-variant text-[12px] uppercase tracking-wide"><th className="py-2.5 px-4">Programme</th><th className="py-2.5 px-4">Department</th><th className="py-2.5 px-4">{unitSing}</th><th className="py-2.5 px-4"></th></tr></thead>
              <tbody className="divide-y divide-surface-container">
                {filteredProgs.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low">
                    <td className="py-2.5 px-4 font-medium text-on-surface">{p.name}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">{p.departmentName}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">{p.collegeName}</td>
                    <td className="py-2.5 px-4 text-right"><button onClick={() => openProgramme(p.id)} className="text-emerald-700 text-[13px] hover:underline">Details</button></td>
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
            <h3 className="font-headline-sm font-semibold text-slate-800 mb-3">Total Staff: {fmtNum(staffStats?.totalStaff)}</h3>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By {unitSing}</h4>
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
            <h3 className="font-headline-sm font-semibold text-slate-800 mb-3">Total Students: {fmtNum(studStats?.totalStudents)}</h3>
            <h4 className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">By {unitSing}</h4>
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
              <h3 className="font-headline-sm font-bold text-slate-800">Programme Details</h3>
              <button onClick={() => setProgDetail(null)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            {progDetail.error
              ? <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2">{progDetail.error}</p>
              : (<div className="space-y-1.5 text-sm">
                <p className="font-bold text-on-surface text-base">{progDetail.name}</p>
                <p className="text-on-surface-variant">{progDetail.collegeName} → {progDetail.departmentName}</p>
                <p className="text-on-surface-variant text-[12px]">Programme ID {progDetail.id} · Dept {progDetail.departmentId} · {unitSing} {progDetail.collegeId}</p>
              </div>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Stitch shell: green sidebar + topbar + footer (faithful to screens) ---------- */
const SIDE_ITEMS = [
  { view: "overview", label: "Overview", icon: "dashboard" },
  { view: "institutions", label: null, icon: null },
  { view: "staff", label: "Supervisors/Lecturers", icon: "supervisor_account" },
  { view: "students", label: "Project Students", icon: "school" },
  { view: "programmes", label: "Programmes", icon: "menu_book" },
  { view: "repositories", label: "Research Repositories", icon: "dns" },
  { view: "analytics", label: "Analytics", icon: "insights" },
  { view: "reports", label: "Reports", icon: "description" },
  { view: "settings", label: "Settings", icon: "settings" },
];
function StitchNav({ reg, route, view, go, onLogout }) {
  const cur = (v) => view === v || (v === "institutions" && view === "institution");
  const others = SIDE_ITEMS.filter((it) => it.view !== "overview").map((it) => it.view === "institutions"
    ? { ...it, label: reg.sideType, icon: reg.icon === "precision_manufacturing" ? "factory" : "account_balance" }
    : it);
  const btn = (it) => (
    <button key={it.view} onClick={() => go(`${route}?view=${it.view}`)} className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[11px] transition-colors uppercase tracking-wide ${cur(it.view) ? "bg-[#0e6d3d] text-white font-medium shadow-sm border-l-4 border-emerald-300" : "text-emerald-100/80 hover:bg-[#0c5c34] hover:text-white font-normal"}`}>
      <span className={`material-symbols-outlined text-[18px] ${cur(it.view) ? "text-emerald-200" : ""}`}>{it.icon}</span>
      <span>{it.label}</span>
    </button>
  );
  return (
    <>
      <button onClick={() => go(`${route}?view=overview`)} className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[11px] transition-colors uppercase tracking-wide ${cur("overview") ? "bg-[#0e6d3d] text-white font-medium shadow-sm border-l-4 border-emerald-300" : "text-emerald-100/80 hover:bg-[#0c5c34] hover:text-white font-normal"}`}>
        <span className={`material-symbols-outlined text-[18px] ${cur("overview") ? "text-emerald-200" : ""}`}>dashboard</span>
        <span>Overview</span>
      </button>
      <div className="my-2 border-t border-emerald-100/20"></div>
      {others.map(btn)}
      <div className="my-2 border-t border-emerald-100/20"></div>
      <button onClick={onLogout} className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-emerald-100/80 hover:bg-[#0c5c34] hover:text-white font-normal text-[11px] transition-colors uppercase tracking-wide">
        <span className="material-symbols-outlined text-[18px]">logout</span>
        <span>Logout</span>
      </button>
    </>
  );
}

/* ---------- Ranked people tables (live dashboard aggregates) ---------- */
function PeopleView({ title, icon, rows, valueLabel }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-slate-700">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {rows.length ? (
        <ul className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium text-slate-800" title={r.name}>{r.name}</span>
              <span className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden shrink-0">
                <span className="block h-full bg-[#0b6639] rounded-r-full" style={{ width: `${Math.max((r.value / max) * 100, 3)}%` }}></span>
              </span>
              <span className="w-20 text-right text-sm font-bold text-slate-800">{fmtNum(r.value)} <span className="font-normal text-slate-400 text-[11px]">{valueLabel}</span></span>
            </li>
          ))}
        </ul>
      ) : <p className="p-6 text-sm text-slate-500">No data.</p>}
    </div>
  );
}

/* ---------- Programmes per institution (live institutions list) ---------- */
function ProgrammesView({ reg }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let cancelled = false;
    regulatorApi.getInstitutions({ page: 1, pageSize: 100 }).then((res) => {
      if (cancelled) return;
      setRows((Array.isArray(res.items) ? res.items : []).filter((it) => matchesRegulatorType(it.institutionType, reg.key)));
    }).catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [reg.key]);
  const total = (rows || []).reduce((s, r) => s + (Number(r.programmeCount) || 0), 0);
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-slate-700">menu_book</span>
          <h3 className="text-sm font-bold text-slate-800">Programmes by Institution</h3>
        </div>
        {rows && <span className="text-xs font-bold text-slate-800">{fmtNum(total)} programmes</span>}
      </div>
      {!rows ? <p className="p-6 text-sm text-slate-500">Loading…</p> : rows.length ? (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex-1 truncate text-sm font-medium text-slate-800" title={r.name}>{r.name}</span>
              <span className="text-[11px] text-slate-400">{fmtNum(r.departmentCount)} depts</span>
              <span className="w-16 text-right text-sm font-bold text-slate-800">{fmtNum(r.programmeCount)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="p-6 text-sm text-slate-500">No data.</p>}
    </div>
  );
}

/* ---------- Repositories (mandate spec figures; API exposes none) ---------- */
function RepositoriesView({ reg }) {
  if (!reg.repoCats) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-8 text-center">
        <span className="material-symbols-outlined text-3xl text-slate-300">dns</span>
        <p className="text-sm font-bold text-slate-800 mt-2">Research Repositories</p>
        <p className="text-xs text-slate-500 mt-1">Repository data is not exposed by the current API for this mandate.</p>
      </div>
    );
  }
  const total = reg.repoCats.reduce((s, c) => s + c.value, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 bg-[#7c3aed]"><span className="material-symbols-outlined text-[28px]">dns</span></div>
          <div><p className="text-xs font-semibold text-[#7c3aed]">{reg.cardRepo}</p><p className="text-3xl font-bold text-slate-900">{fmtNum(reg.reposTotal)}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 bg-[#be185d]"><span className="material-symbols-outlined text-[28px]">inventory_2</span></div>
          <div><p className="text-xs font-semibold text-[#be185d]">Repository Records</p><p className="text-3xl font-bold text-slate-900">{fmtNum(reg.recordsTotal)}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-800">Records by Category — All sessions ({fmtNum(reg.repoTotal)})</h3></div>
        <ul className="divide-y divide-slate-100">
          {reg.repoCats.map((c) => (
            <li key={c.label} className="flex items-center gap-3 px-5 py-3">
              <span className="flex-1 text-sm font-medium text-slate-800">{c.label}</span>
              <span className="text-sm font-bold text-slate-800">{fmtNum(c.value)}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 px-5 py-3 bg-slate-50">
            <span className="flex-1 text-sm font-bold text-slate-800">Total</span>
            <span className="text-sm font-bold text-slate-800">{fmtNum(total)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Reports: exports ---------- */
function ReportsView({ reg, onExport, exporting }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[18px] text-slate-700">description</span>
        <h3 className="text-sm font-bold text-slate-800">Reports</h3>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">Download the mandate register as CSV.</p>
      <button onClick={onExport} disabled={exporting} className="flex items-center gap-2 bg-[#0b6639] hover:bg-[#09542f] text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-60">
        <span className="material-symbols-outlined text-[16px]">download</span>
        <span>{exporting ? "Exporting…" : `Export ${reg.short} institutions CSV`}</span>
      </button>
    </div>
  );
}

/* ---------- Settings: read-only context ---------- */
function SettingsView({ reg, onLogout }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-3 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[18px] text-slate-700">settings</span>
        <h3 className="text-sm font-bold text-slate-800">Settings</h3>
      </div>
      {[
        ["Academic Session", "2025/2026 Academic Session"],
        ["Scope", `${reg.name} — ${reg.scope}`],
        ["Signed in as", "Admin"],
      ].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
          <span className="text-slate-500">{k}</span>
          <span className="font-semibold text-slate-800">{v}</span>
        </div>
      ))}
      <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-variant">
        <span className="material-symbols-outlined text-[18px]">logout</span> Logout
      </button>
    </div>
  );
}

/* ---------- Analytics view: project-analytics API (summary, distribution, sessions, trends, topics, units) ---------- */
function AnalyticsView({ reg }) {
  const [session, setSession] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("institution");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const filters = {};
  if (session.trim()) filters.Session = session.trim();
  if (startDate && endDate) { filters.StartDate = startDate; filters.EndDate = endDate; }
  const dateError = (startDate && !endDate) || (!startDate && endDate) ? "StartDate and EndDate must be provided together." : "";

  const load = useCallback(async () => {
    if (dateError) return;
    setLoading(true); setErr("");
    try {
      const [summary, dist, sessions, trends, topics, units] = await Promise.all([
        analyticsApi.getSummary(filters).catch((e) => ({ __error: e.message })),
        analyticsApi.getStatusDistribution(filters).catch((e) => ({ __error: e.message })),
        analyticsApi.getSessions(filters).catch((e) => ({ __error: e.message })),
        analyticsApi.getTrends(filters).catch((e) => ({ __error: e.message })),
        analyticsApi.getTopics(filters).catch((e) => ({ __error: e.message })),
        analyticsApi.getUnits({ groupBy, ...filters }).catch((e) => ({ __error: e.message })),
      ]);
      setData({ summary, dist, sessions, trends, topics, units });
    } catch (e) { setErr(e.message || "Could not load analytics"); }
    finally { setLoading(false); }
  }, [session, startDate, endDate, groupBy]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary && !data.summary.__error ? data.summary : null;
  const dist = Array.isArray(data?.dist) ? data.dist : [];
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  const trends = Array.isArray(data?.trends) ? data.trends : [];
  const topics = data?.topics && !data.topics.__error ? data.topics : null;
  const units = Array.isArray(data?.units) ? data.units : [];
  const maxTrend = Math.max(...trends.flatMap((t) => [Number(t.projectsCreated) || 0, Number(t.projectsCompleted) || 0]), 1);
  const cards = s ? [
    { label: "Total Projects", value: fmtNum(s.totalProjects), icon: "folder_managed", color: "#0b6639" },
    { label: "Completed", value: fmtNum(s.completedProjects), icon: "task", color: "#166534" },
    { label: "In Progress", value: fmtNum(s.inProgressProjects), icon: "autorenew", color: "#b45309" },
    { label: "Initiated", value: fmtNum(s.initiatedProjects), icon: "fiber_new", color: "#0284c7" },
    { label: "Pending Topics", value: fmtNum(s.pendingTopicApprovals), icon: "pending_actions", color: "#ea580c" },
    { label: "Approved Topics", value: fmtNum(s.approvedTopics), icon: "check_circle", color: "#059669" },
    { label: "Students", value: fmtNum(s.totalStudents), icon: "school", color: "#7c3aed" },
    { label: "Supervisors", value: fmtNum(s.totalSupervisors), icon: "supervisor_account", color: "#0d9488" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row gap-3 md:items-end">
        <label className="block flex-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Session</span>
          <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 2024/2025 (blank = all)" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-700" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Start Date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-700" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">End Date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-700" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Group Units By</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-700">
            <option value="institution">Institution</option>
            <option value="department">Department</option>
            <option value="program">Program</option>
          </select>
        </label>
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-[#0b6639] text-white text-sm font-semibold disabled:opacity-60">Apply</button>
      </div>
      {dateError && <div className="rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{dateError}</div>}
      {err && <div className="rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
      {loading && <p className="text-sm text-slate-500">Loading analytics…</p>}
      {data && (
        <>
          {s ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((c) => (<StitchMetricCard key={c.label} label={c.label} value={c.value} icon={c.icon} color={c.color} />))}
            </div>
          ) : <p className="text-sm text-slate-500">{data.summary?.__error || "No summary."}</p>}
          {(s?.projectsCreatedThisPeriod !== undefined || s?.projectsCompletedThisPeriod !== undefined) && (
            <p className="text-xs text-slate-500">This period: {fmtNum(s.projectsCreatedThisPeriod)} created · {fmtNum(s.projectsCompletedThisPeriod)} completed (reporting dates only affect these two).</p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px] text-slate-700">pie_chart</span>
                <h4 className="text-sm font-bold text-slate-800">Status Distribution</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">Share of projects by status</p>
              {dist.length ? (
                <div className="space-y-3">
                  {dist.map((d, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>{d.status}</span>
                        <span className="font-bold text-slate-800">{fmtNum(d.count)} · {Number(d.percentage ?? 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{ width: `${Math.max(Number(d.percentage) || 0, 2)}%`, background: ANALYTICS_STATUS_COLORS[d.status] || STITCH_BAR_COLORS[i % STITCH_BAR_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">{data.dist?.__error || "No data."}</p>}
            </section>
            <section className="lg:col-span-8 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px] text-slate-700">show_chart</span>
                <h4 className="text-sm font-bold text-slate-800">Monthly Trends</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">Created (green) vs completed (blue) per month</p>
              {trends.length ? (
                <div className="flex items-end gap-3 overflow-x-auto pb-1" style={{ minHeight: 150 }}>
                  {trends.map((t, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 shrink-0" title={`${t.period}: ${t.projectsCreated} created, ${t.projectsCompleted} completed`}>
                      <div className="flex items-end gap-1 h-28">
                        <div className="w-5 rounded-t bg-[#0b6639]" style={{ height: `${Math.max((Number(t.projectsCreated) / maxTrend) * 100, 3)}%` }}></div>
                        <div className="w-5 rounded-t bg-[#1d4ed8]" style={{ height: `${Math.max((Number(t.projectsCompleted) / maxTrend) * 100, 3)}%` }}></div>
                      </div>
                      <span className="text-[10px] text-slate-500">{t.period}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">{data.trends?.__error || "No trend data."}</p>}
            </section>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px] text-slate-700">forum</span>
                <h4 className="text-sm font-bold text-slate-800">Topics</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">Submissions and AI-check averages</p>
              {topics ? (
                <div className="space-y-2.5 text-sm">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[["Total", topics.totalTopics], ["Pending", topics.pendingTopics], ["Approved", topics.approvedTopics], ["Rejected", topics.rejectedTopics]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                        <p className="text-[10px] uppercase text-slate-500 font-semibold">{l}</p>
                        <p className="font-bold text-slate-800">{fmtNum(v)}</p>
                      </div>
                    ))}
                  </div>
                  {[["Similarity", topics.averageSimilarityScore, "#b45309"], ["Originality", topics.averageOriginalityScore, "#0b6639"], ["Plagiarism", topics.averagePlagiarismScore, "#be123c"]].map(([l, v, c]) => (
                    v !== null && v !== undefined ? (
                      <div key={l}>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5"><span>Avg {l}</span><span className="font-bold text-slate-800">{Number(v).toFixed(1)}</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.max(Number(v) || 0, 2)}%`, background: c }}></div></div>
                      </div>
                    ) : null
                  ))}
                  {topics.scoreNote && <p className="text-[11px] text-slate-400 italic">{topics.scoreNote}</p>}
                </div>
              ) : <p className="text-xs text-slate-500">{data.topics?.__error || "No data."}</p>}
            </section>
            <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800">Units Comparison — by {groupBy}</h4>
              </div>
              {units.length ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-sm min-w-[520px]">
                    <thead><tr className="text-slate-500 text-[11px] uppercase border-b border-slate-100"><th className="py-2 px-4">Unit</th><th className="py-2 px-4 text-right">Total</th><th className="py-2 px-4 text-right">Completed</th><th className="py-2 px-4 text-right">In Progress</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {units.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-4 font-medium text-slate-800 truncate max-w-[280px]" title={u.institutionName || u.departmentName || u.programName}>{u.institutionName || u.departmentName || u.programName || "—"}</td>
                          <td className="py-2 px-4 text-right font-bold">{fmtNum(u.totalProjects)}</td>
                          <td className="py-2 px-4 text-right text-emerald-700">{fmtNum(u.completedProjects)}</td>
                          <td className="py-2 px-4 text-right text-amber-700">{fmtNum(u.inProgressProjects)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="p-6 text-xs text-slate-500">{data.units?.__error || "No data."}</p>}
            </section>
          </div>
          <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h4 className="text-sm font-bold text-slate-800">Sessions</h4></div>
            {sessions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[560px]">
                  <thead><tr className="text-slate-500 text-[11px] uppercase border-b border-slate-100"><th className="py-2 px-4">Session</th><th className="py-2 px-4 text-right">Total</th><th className="py-2 px-4 text-right">Completed</th><th className="py-2 px-4 text-right">In Progress</th><th className="py-2 px-4 text-right">Overdue</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((s2, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-medium text-slate-800">{s2.session}</td>
                        <td className="py-2 px-4 text-right font-bold">{fmtNum(s2.totalProjects)}</td>
                        <td className="py-2 px-4 text-right text-emerald-700">{fmtNum(s2.completedProjects)}</td>
                        <td className="py-2 px-4 text-right text-amber-700">{fmtNum(s2.inProgressProjects)}</td>
                        <td className="py-2 px-4 text-right text-red-700">{fmtNum(s2.overdueProjects)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="p-6 text-xs text-slate-500">{data.sessions?.__error || "No data."}</p>}
          </section>
        </>
      )}
    </div>
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
          <div className="px-5 pt-5 pb-4 text-center border-b border-emerald-900/60 bg-[#064223] relative overflow-hidden">
            <img alt={`${reg.short} logo`} className="w-28 h-auto mx-auto relative z-10 drop-shadow-[0_10px_18px_rgba(0,0,0,0.8)]" src={reg.logo} />
            <h1 className="text-xl font-bold tracking-wider uppercase text-white relative z-10 mt-1">{reg.short}</h1>
            <p className="text-[11px] text-emerald-200 tracking-wide font-medium mt-0.5 uppercase relative z-10">EARMS Oversight Portal</p>
          </div>
          <nav className="mt-1 px-3 space-y-1">
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
            <button onClick={loadDash} title="Refresh" className="relative p-2 text-slate-500 hover:text-slate-700">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </button>
            <button title="Apps" className="p-2 text-slate-500 hover:text-slate-700">
              <span className="material-symbols-outlined text-[22px]">apps</span>
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
          {(view === "overview" || view === "analytics") && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold text-[#093d22] tracking-tight">{view === "analytics" ? `${reg.short} Project Analytics` : reg.dashTitle}</h1>
                <p className="text-xs text-slate-500 font-normal mt-0.5">{view === "analytics" ? "Project activity, sessions, trends and topics — token-scoped" : reg.titleSub}</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-200/90 text-amber-800 px-3.5 py-1.5 rounded-lg text-xs font-medium self-start sm:self-auto">
                <span className="material-symbols-outlined text-[16px] text-amber-600">workspace_premium</span>
                <span>OFFICIAL OVERSIGHT • Live Figures</span>
              </div>
            </div>
          )}
          <ErrBar err={err} />
          {loading && !dash && !err ? <p className="text-sm text-slate-500">Loading {reg.short} dashboard…</p> : (
            <>
              {(view === "overview") && <OverviewTab dash={dash} reg={reg} go={go} route={reg.route} />}
              {(view === "analytics") && <AnalyticsView reg={reg} />}
              {(view === "institutions") && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
              {(view === "institution" && institutionId) && <InstitutionDetails id={institutionId} reg={reg} onBack={() => nav("institutions")} />}
              {(view === "institution" && !institutionId) && <InstitutionsTab reg={reg} route={reg.route} go={go} onOpen={openInstitution} />}
              {(view === "staff") && <PeopleView title="Supervisors / Lecturers by Institution" icon="supervisor_account" valueLabel="staff" rows={(Array.isArray(dash?.staffByInstitution) ? dash.staffByInstitution : []).map((s) => ({ name: s.institutionName, value: Number(s.staffCount) || 0 }))} />}
              {(view === "students") && <PeopleView title="Project Students by Institution" icon="school" valueLabel="students" rows={(Array.isArray(dash?.studentsByInstitution) ? dash.studentsByInstitution : []).map((s) => ({ name: s.institutionName, value: Number(s.studentCount) || 0 }))} />}
              {(view === "programmes") && <ProgrammesView reg={reg} />}
              {(view === "repositories") && <RepositoriesView reg={reg} />}
              {(view === "reports") && <ReportsView reg={reg} onExport={exportCSV} exporting={exporting} />}
              {(view === "settings") && <SettingsView reg={reg} onLogout={logout} />}
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
