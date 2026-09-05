import React, { useState, useRef } from 'react'
import { AFRICAN_REGIONS } from './regions'

/* ---------- Shared helpers ---------- */

const fmtMoney = (v) => '₦' + Number(v || 0).toLocaleString('en-NG')
const fmtNum = (v) => Number(v || 0).toLocaleString('en-NG')
const fmtMillions = (v) => '₦' + Math.round(v / 1e6) + 'M'
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fieldCls = "w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"

function useToast() {
  const [toast, setToast] = useState('')
  const timer = useRef(null)
  const notify = (msg) => {
    setToast(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }
  return [toast, notify]
}

function PageHeader({ icon, title, desc, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">{icon}</span></div>
        <div>
          <h2 className="font-headline-md font-bold text-primary">{title}</h2>
          <p className="font-body-sm text-on-surface-variant">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, icon, color = 'bg-primary-container text-primary' }) {
  return (
    <div className="glass-card ambient-shadow rounded-xl p-4 border border-surface-container flex items-start justify-between">
      <div>
        <p className="font-label-md text-on-surface-variant text-[11px] uppercase tracking-wide">{label}</p>
        <p className="font-headline-lg font-bold text-primary leading-none mt-1">{value}</p>
        {sub && <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}><span className="material-symbols-outlined">{icon}</span></div>
    </div>
  )
}

function ToastBar({ toast }) {
  if (!toast) return null
  return (
    <div className="flex items-center gap-2 bg-primary-container/70 text-primary px-4 py-2.5 rounded-lg border border-primary/20">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      <p className="font-label-md">{toast}</p>
    </div>
  )
}

/* ---------- Chart primitives (pure SVG/CSS, no external deps) ---------- */

function Bars({ data, height = 215, format = (v) => v, colors = ['#1e3a8a'] }) {
  const max = Math.max(...data.map((d) => d.value || 0), 1)
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <span className="font-label-md text-on-surface-variant text-[11px] mb-1">{format(d.value)}</span>
          <div
            className="w-full max-w-[44px] rounded-t-md transition-all"
            style={{ height: `${Math.max((d.value / max) * 70, 3)}%`, background: d.color || colors[i % colors.length] }}
          />
          <span className="font-label-md text-on-surface-variant text-[11px] mt-1.5 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ segments, size = 170, thickness = 26, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          {segments.map((seg, i) => {
            const frac = (seg.value || 0) / total
            const dash = frac * circ
            const off = -(acc * circ)
            acc += frac
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={off}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && <span className="font-headline-md font-bold text-on-surface">{centerLabel}</span>}
          {centerSub && <span className="font-body-sm text-on-surface-variant text-[12px] px-3">{centerSub}</span>}
        </div>
      </div>
      <div className="space-y-2 w-full">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="font-label-md text-on-surface-variant text-[13px] truncate">{seg.label}</span>
            <span className="ml-auto font-label-md font-bold text-on-surface text-[13px]">{seg.value}</span>
            <span className="font-body-sm text-on-surface-variant text-[12px] w-10 text-right">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data, height = 210, format = (v) => v, stroke = '#1e3a8a' }) {
  const innerW = 600
  const padY = 20
  const bottom = 28
  const H = height + bottom
  const max = Math.max(...data.map((d) => d.value || 0), 1)
  const innerH = H - padY - bottom
  const pts = data.map((d, i) => [
    (innerW * i) / Math.max(data.length - 1, 1),
    padY + innerH - (d.value / max) * innerH,
  ])
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${innerW} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={innerW} y1={padY + innerH - f * innerH} y2={padY + innerH - f * innerH} stroke="#e0e3e5" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      <path d={`M 0 ${padY + innerH} L ${line.replace(/ /g, ' L ')} L ${innerW} ${padY + innerH} Z`} fill={stroke} opacity="0.12" />
      <path d={`M ${line.replace(/ /g, ' L ')}`} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#ffffff" stroke={stroke} strokeWidth="2.5">
          <title>{`${data[i].label}: ${format(data[i].value)}`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i][0]} y={H - 6} textAnchor="middle" style={{ fill: '#45464d', fontSize: 10, fontWeight: 600, fontFamily: 'Hanken Grotesk' }}>{d.label}</text>
      ))}
    </svg>
  )
}

function Stars({ n = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`material-symbols-outlined ${i <= Math.round(n) ? 'text-amber-500' : 'text-outline-variant'}`} style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}>star</span>
      ))}
    </span>
  )
}

/* ---------- Subscription Management ---------- */

const STATUS = {
  active: { label: 'Active', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', icon: 'verified' },
  suspended: { label: 'Suspended', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', icon: 'pause_circle' },
  expired: { label: 'Expired', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: 'dangerous' },
  pending: { label: 'Pending', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: 'schedule' },
}

const SEED_SUBSCRIPTIONS = [
  { id: 'SUB-2026-0142', institution: 'Joseph Sarwuan Tarka University', ownerCode: 'BN10', email: 'it@unimak.edu.ng', plan: 'Institution Premium', status: 'active', billing: 'Annual', amount: 400000, seats: 1000, provider: 'Bank Transfer', features: ['Project Management', 'Advanced Analytics', 'API Access', 'Priority Support'], start: '2026-01-01', end: '2026-12-31', created: '2025-11-12', usage: 68, payments: [{ ref: 'PAY-2026-2201', date: '2025-12-30', amount: 400000, method: 'Bank Transfer', status: 'Successful' }] },
  { id: 'SUB-2026-0138', institution: 'University of Lagos', ownerCode: 'UL01', email: 'it@unilag.edu.ng', plan: 'Institution Annual', status: 'pending', billing: 'Annual', amount: 250000, seats: 500, provider: 'Paystack', features: ['Project Management', 'Milestones', 'Publications', 'Grant Tracking'], start: '2026-02-01', end: '2027-01-31', created: '2026-01-18', usage: 0, payments: [] },
  { id: 'SUB-2026-0129', institution: 'Kwame Nkrumah University of Science and Technology', ownerCode: 'KN05', email: 'office@knust.edu.gh', plan: 'Institution Starter', status: 'active', billing: 'Annual', amount: 150000, seats: 250, provider: 'Bank Transfer', features: ['Project Management', 'Milestones', 'Supervisor Allocation'], start: '2025-10-16', end: '2026-10-15', created: '2025-09-02', usage: 54, payments: [{ ref: 'PAY-2025-1874', date: '2025-10-01', amount: 150000, method: 'Bank Transfer', status: 'Successful' }] },
  { id: 'SUB-2026-0117', institution: 'University of Nairobi', ownerCode: 'UN100', email: 'ict@uonbi.ac.ke', plan: 'Institution Premium', status: 'suspended', billing: 'Annual', amount: 400000, seats: 700, provider: 'Card', features: ['Project Management', 'Advanced Analytics', 'API Access'], start: '2026-04-12', end: '2027-04-12', created: '2026-03-20', usage: 41, payments: [{ ref: 'PAY-2026-1990', date: '2026-04-01', amount: 400000, method: 'Card', status: 'Successful' }] },
  { id: 'SUB-2026-0105', institution: 'Cairo University', ownerCode: 'CU20', email: 'admin@cu.edu.eg', plan: 'Institution Annual', status: 'expired', billing: 'Annual', amount: 250000, seats: 600, provider: 'Bank Transfer', features: ['Project Management', 'Milestones', 'Publications'], start: '2024-08-01', end: '2025-07-31', created: '2024-07-10', usage: 92, payments: [{ ref: 'PAY-2024-1201', date: '2024-07-25', amount: 250000, method: 'Bank Transfer', status: 'Successful' }] },
  { id: 'SUB-2026-0098', institution: 'Stellenbosch University', ownerCode: 'SU41', email: 'research@sun.ac.za', plan: 'Institution Quarterly', status: 'active', billing: 'Quarterly', amount: 80000, seats: 300, provider: 'Paystack', features: ['Project Management', 'Milestones', 'Support'], start: '2026-06-01', end: '2027-03-01', created: '2026-05-15', usage: 33, payments: [{ ref: 'PAY-2026-2098', date: '2026-06-01', amount: 80000, method: 'Paystack', status: 'Successful' }] },
  { id: 'SUB-2026-0087', institution: 'Addis Ababa University', ownerCode: 'AA03', email: 'it@aau.edu.et', plan: 'Institution Premium', status: 'active', billing: 'Annual', amount: 400000, seats: 500, provider: 'Bank Transfer', features: ['Project Management', 'Advanced Analytics', 'API Access', 'Priority Support'], start: '2026-03-01', end: '2027-02-28', created: '2026-02-08', usage: 47, payments: [{ ref: 'PAY-2026-2033', date: '2026-03-01', amount: 400000, method: 'Bank Transfer', status: 'Successful' }] },
  { id: 'SUB-2026-0072', institution: 'Makerere University', ownerCode: 'MK12', email: 'support@mak.ac.ug', plan: 'Institution Annual', status: 'suspended', billing: 'Annual', amount: 250000, seats: 400, provider: 'Card', features: ['Project Management', 'Milestones', 'Publications'], start: '2025-11-20', end: '2026-11-19', created: '2025-10-30', usage: 26, payments: [{ ref: 'PAY-2025-1901', date: '2025-11-01', amount: 250000, method: 'Card', status: 'Successful' }] },
  { id: 'SUB-2026-0061', institution: 'University of Dar es Salaam', ownerCode: 'UD07', email: 'ict@udsm.ac.tz', plan: 'Institution Starter', status: 'active', billing: 'Monthly', amount: 30000, seats: 150, provider: 'Paystack', features: ['Project Management', 'Basic Reports'], start: '2026-07-01', end: '2026-08-01', created: '2026-06-21', usage: 12, payments: [{ ref: 'PAY-2026-2114', date: '2026-07-01', amount: 30000, method: 'Paystack', status: 'Successful' }] },
  { id: 'SUB-2026-0043', institution: 'University of Zambia', ownerCode: 'UZ09', email: 'admin@unza.zm', plan: 'Institution Annual', status: 'pending', billing: 'Annual', amount: 250000, seats: 350, provider: 'Bank Transfer', features: ['Project Management', 'Milestones', 'Publications'], start: '2026-09-01', end: '2027-08-31', created: '2026-08-02', usage: 0, payments: [] },
  { id: 'SUB-2026-0031', institution: 'University of Zimbabwe', ownerCode: 'UZW1', email: 'research@uz.ac.zw', plan: 'Institution Quarterly', status: 'expired', billing: 'Quarterly', amount: 80000, seats: 200, provider: 'Bank Transfer', features: ['Project Management', 'Milestones'], start: '2025-04-01', end: '2026-04-01', created: '2025-03-12', usage: 77, payments: [{ ref: 'PAY-2025-1600', date: '2025-04-01', amount: 80000, method: 'Bank Transfer', status: 'Successful' }] },
  { id: 'SUB-2026-0022', institution: 'University of Namibia', ownerCode: 'UNI11', email: 'it@unam.na', plan: 'Institution Annual', status: 'active', billing: 'Annual', amount: 250000, seats: 220, provider: 'Paystack', features: ['Project Management', 'Milestones', 'Publications'], start: '2026-01-15', end: '2027-01-14', created: '2025-12-05', usage: 29, payments: [{ ref: 'PAY-2026-2010', date: '2026-01-10', amount: 250000, method: 'Paystack', status: 'Successful' }] },
]

function DetailTile({ label, value }) {
  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant p-3.5">
      <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wide mb-1">{label}</p>
      <p className="font-label-md font-bold text-on-surface text-[13px] break-words">{value}</p>
    </div>
  )
}

function SubscriptionDetail({ sub, onBack, onToggle, onRenew }) {
  const st = STATUS[sub.status] || STATUS.expired
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 font-label-md text-primary hover:text-primary-fixed-dim">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> All subscriptions
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {sub.status === 'active' ? (
            <button onClick={() => onToggle(sub.id)} className="inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg font-label-md hover:bg-amber-100"><span className="material-symbols-outlined text-[16px]">pause</span> Suspend</button>
          ) : (
            <button onClick={() => onToggle(sub.id)} className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg font-label-md hover:bg-green-700"><span className="material-symbols-outlined text-[16px]">play_arrow</span> Resume</button>
          )}
          <button onClick={() => onRenew(sub.id)} className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[16px]">history</span> Renew</button>
        </div>
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">account_balance</span></div>
            <div>
              <h3 className="font-headline-md font-bold text-on-surface">{sub.institution}</h3>
              <p className="font-body-sm text-on-surface-variant">{sub.plan} · {sub.id}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${st.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{sub.ownerCode}</span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="font-headline-lg font-bold text-primary">{fmtMoney(sub.amount)}</p>
            <p className="font-body-sm text-on-surface-variant text-[12px]">per {sub.billing.toLowerCase()} cycle</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <DetailTile label="Billing Cycle" value={sub.billing} />
          <DetailTile label="Provider" value={sub.provider} />
          <DetailTile label="Seats" value={fmtNum(sub.seats)} />
          <DetailTile label="Contact" value={sub.email} />
          <DetailTile label="Start Date" value={fmtDate(sub.start)} />
          <DetailTile label="End Date" value={fmtDate(sub.end)} />
          <DetailTile label="Created" value={fmtDate(sub.created)} />
          <DetailTile label="Reference" value={sub.id} />
        </div>
        <div className="mt-6">
          <p className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">Plan Features</p>
          <div className="flex flex-wrap gap-2">
            {sub.features.map((f) => <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container/60 text-primary font-label-md text-[12px]"><span className="material-symbols-outlined text-[14px]">check</span>{f}</span>)}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Usage</p>
            <p className="font-label-md font-bold text-on-surface text-[12px]">{sub.usage}%</p>
          </div>
          <div className="w-full bg-surface-variant rounded-full h-2.5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: sub.usage + '%' }}></div></div>
        </div>
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6">
        <h4 className="font-headline-sm font-bold text-on-surface mb-3">Payment History</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-outline-variant text-left font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">
                <th className="py-2.5 pr-3">Reference</th>
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 pr-3">Method</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {sub.payments.map((p) => (
                <tr key={p.ref} className="border-b border-surface-variant last:border-0">
                  <td className="py-2.5 pr-3 font-label-md text-on-surface">{p.ref}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{fmtDate(p.date)}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{p.method}</td>
                  <td className="py-2.5 pr-3 text-right font-label-md text-on-surface">{fmtMoney(p.amount)}</td>
                  <td className="py-2.5 pl-3 text-right"><span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-label-md text-[11px]">{p.status}</span></td>
                </tr>
              ))}
              {sub.payments.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-on-surface-variant">No recorded payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SubCard({ s, onOpen, onToggle }) {
  const st = STATUS[s.status] || STATUS.expired
  const manage = s.status === 'active' || s.status === 'pending'
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all cursor-pointer" onClick={onOpen}>
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary"></div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">account_balance</span></div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${st.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span>
        </div>
        <h4 className="font-headline-sm font-bold text-on-surface mt-3 line-clamp-1">{s.institution}</h4>
        <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{s.plan} · {s.id}</p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Price</p><p className="font-label-md font-bold text-on-surface text-[13px]">{fmtMoney(s.amount)}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Cycle</p><p className="font-label-md text-on-surface text-[13px]">{s.billing}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Run</p><p className="font-label-md text-on-surface text-[13px]">{fmtDate(s.start)} → {fmtDate(s.end)}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Seats</p><p className="font-label-md text-on-surface text-[13px]">{fmtNum(s.seats)}</p></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen() }} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary py-2 rounded-lg font-label-md text-[13px] hover:bg-primary-fixed-dim">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span> Details
          </button>
          {manage ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-1 inline-flex items-center justify-center gap-1.5 border border-outline-variant bg-surface py-2 rounded-lg font-label-md text-[13px] hover:bg-surface-variant text-amber-800">
              <span className="material-symbols-outlined text-[16px]">pause</span> Suspend
            </button>
          ) : (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-1 inline-flex items-center justify-center gap-1.5 border border-outline-variant bg-surface py-2 rounded-lg font-label-md text-[13px] hover:bg-surface-variant text-green-700">
              <span className="material-symbols-outlined text-[16px]">play_arrow</span> Resume
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SubscriptionManagementPage({ go }) {
  const [subs, setSubs] = useState(SEED_SUBSCRIPTIONS)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('Newest first')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, notify] = useToast()

  const selected = subs.find((s) => s.id === selectedId) || null
  const counts = { all: subs.length, active: 0, suspended: 0, expired: 0, pending: 0 }
  subs.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1 })
  const cleaned = q.trim().toLowerCase()
  let list = subs.filter((s) => {
    const matchQ = !cleaned || [s.institution, s.id, s.plan, s.ownerCode, s.email].some((f) => String(f || '').toLowerCase().includes(cleaned))
    const matchF = filter === 'all' || s.status === filter
    return matchQ && matchF
  })
  if (sort === 'Highest value') list = [...list].sort((a, b) => b.amount - a.amount)
  if (sort === 'Institution A–Z') list = [...list].sort((a, b) => a.institution.localeCompare(b.institution))
  if (sort === 'Oldest first') list = [...list].sort((a, b) => a.created.localeCompare(b.created))

  const toggle = (id) => {
    const s = subs.find((x) => x.id === id)
    setSubs((prev) => prev.map((x) => (x.id !== id ? x : { ...x, status: x.status === 'active' ? 'suspended' : 'active' })))
    if (s) notify(`${s.institution} was ${s.status === 'active' ? 'suspended' : 'reactivated'}`)
  }
  const renew = (id) => {
    const s = subs.find((x) => x.id === id)
    setSubs((prev) => prev.map((x) => {
      if (x.id !== id) return x
      const end = new Date(x.end + 'T00:00:00')
      end.setFullYear(end.getFullYear() + 1)
      const next = end.toISOString().slice(0, 10)
      return { ...x, status: 'active', start: x.end, end: next, payments: [...x.payments, { ref: 'PAY-' + Math.floor(1000 + Math.random() * 9000), date: next, amount: x.amount, method: x.provider, status: 'Successful' }] }
    }))
    if (s) notify(`${s.institution} renewed for another cycle`)
  }

  const filters = [
    { k: 'all', label: 'All', icon: 'apps' },
    { k: 'active', label: 'Active', icon: 'verified' },
    { k: 'suspended', label: 'Suspended', icon: 'pause_circle' },
    { k: 'expired', label: 'Expired', icon: 'dangerous' },
    { k: 'pending', label: 'Pending', icon: 'schedule' },
  ]

  if (selected) {
    return <SubscriptionDetail sub={selected} onBack={() => setSelectedId(null)} onToggle={toggle} onRenew={renew} />
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="card_membership" title="Subscriptions" desc="All institutional subscriptions with live status and management actions.">
        <button type="button" onClick={() => notify('Subscription creation wizard coming soon')} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">add_card</span> New Subscription</button>
      </PageHeader>
      <ToastBar toast={toast} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {filters.map((f) => (
          <button key={f.k} type="button" onClick={() => setFilter(f.k)} className={`rounded-xl border p-3 text-left transition-colors ${filter === f.k ? 'border-primary bg-primary-container/50' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'}`}>
            <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wide flex items-center gap-1">{f.label} <span className={`material-symbols-outlined text-[13px] ${f.icon === 'verified' ? 'text-green-600' : f.icon === 'pause_circle' ? 'text-amber-600' : f.icon === 'dangerous' ? 'text-red-500' : f.icon === 'schedule' ? 'text-blue-600' : 'text-outline'}`}>{f.icon}</span></p>
            <p className="font-headline-md font-bold text-primary mt-0.5">{counts[f.k]}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by institution, reference, plan or code…" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm outline-none">
            <option>Newest first</option>
            <option>Oldest first</option>
            <option>Highest value</option>
            <option>Institution A–Z</option>
          </select>
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((s) => <SubCard key={s.id} s={s} onOpen={() => setSelectedId(s.id)} onToggle={() => toggle(s.id)} />)}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
          <p className="font-headline-sm text-on-surface">No subscriptions match your filters</p>
          <p className="font-body-sm text-on-surface-variant mt-1">Try a different search term or status.</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Subscription Pricing Management ---------- */

const SEED_PLANS = [
  { id: 1, name: 'Institution Starter', tagline: 'Core academic workflow for small institutions', ownerType: 'Institution', cycle: 'Annual', price: 150000, setupFee: 25000, seats: 100, active: true, features: 'Project Management, Milestones, Supervisor Allocation, Publications' },
  { id: 2, name: 'Institution Annual', tagline: 'Full access for your institution', ownerType: 'Institution', cycle: 'Annual', price: 250000, setupFee: 0, seats: 500, active: true, features: 'Project Management, Milestones, Publications, Grant Tracking, Team Settings' },
  { id: 3, name: 'Institution Premium', tagline: 'Advanced reporting and priority support', ownerType: 'Institution', cycle: 'Annual', price: 400000, setupFee: 0, seats: 1000, active: true, features: 'Everything in Annual, Advanced Analytics, API Access, Dedicated Support' },
  { id: 4, name: 'Institution Quarterly', tagline: 'Quarterly invoicing for private institutions', ownerType: 'Institution', cycle: 'Quarterly', price: 80000, setupFee: 0, seats: 200, active: true, features: 'Project Management, Milestones, Support' },
  { id: 5, name: 'Institution Monthly', tagline: 'Flexible monthly subscription', ownerType: 'Institution', cycle: 'Monthly', price: 30000, setupFee: 0, seats: 150, active: false, features: 'Project Management, Basic Reports' },
  { id: 6, name: 'Personal Researcher', tagline: 'For independent researchers', ownerType: 'Personal', cycle: 'Annual', price: 40000, setupFee: 0, seats: 5, active: true, features: 'Project Management, Citation Management' },
]

const emptyForm = { name: '', tagline: '', ownerType: 'Institution', cycle: 'Annual', price: '', setupFee: 0, seats: '', active: true, features: '' }

export function PricingManagementPage({ go }) {
  const [plans, setPlans] = useState(SEED_PLANS)
  const [cycles, setCycles] = useState([
    { name: 'Monthly', months: 1, note: 'No commitment, paid every month', factor: 1 },
    { name: 'Quarterly', months: 3, note: 'Billed every 3 months', factor: 3.2 },
    { name: 'Annual', months: 12, note: 'Billed once per academic year', factor: 10 },
  ])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, notify] = useToast()

  const activeCount = plans.filter((p) => p.active).length
  const cheapest = Math.min(...plans.map((p) => p.price || 0))
  const setFormField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, tagline: p.tagline, ownerType: p.ownerType, cycle: p.cycle, price: p.price, setupFee: p.setupFee, seats: p.seats, active: p.active, features: p.features }); setShowForm(true) }
  const save = (e) => {
    e.preventDefault()
    const payload = { ...form, price: Number(form.price) || 0, setupFee: Number(form.setupFee) || 0, seats: Number(form.seats) || 0 }
    if (editing) {
      setPlans((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...payload } : p)))
      notify(`"${payload.name || editing.name}" updated`)
    } else {
      setPlans((prev) => [...prev, { ...payload, id: Math.max(0, ...prev.map((p) => p.id)) + 1 }])
      notify(`"${payload.name || 'New plan'}" created`)
    }
    setShowForm(false)
  }
  const togglePlan = (id) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
    notify('Plan status updated')
  }
  const setCycleField = (name, val) => setCycles((prev) => prev.map((c) => (c.name === name ? { ...c, factor: val } : c)))

  return (
    <div className="space-y-5">
      <PageHeader icon="sell" title="Subscription Pricing Management" desc="Structure plans, set prices and configure billing cycles.">
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">add</span> Create Plan</button>
      </PageHeader>
      <ToastBar toast={toast} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Plans" value={String(activeCount)} sub={`${plans.length} plans in the catalogue`} icon="sell" color="bg-secondary-container text-on-secondary-container" />
        <StatCard label="Total Plans" value={String(plans.length)} sub="Institution and personal tiers" icon="inventory_2" color="bg-primary-container text-primary" />
        <StatCard label="Starting Price" value={fmtMoney(cheapest)} sub="Across all billing cycles" icon="payments" color="bg-green-100 text-green-800" />
        <StatCard label="Billing Cycles" value="3" sub="Monthly · Quarterly · Annual" icon="calendar_month" color="bg-amber-100 text-amber-800" />
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline-sm font-bold text-on-surface">Billing Cycle Multipliers</h3>
            <p className="font-body-sm text-on-surface-variant text-[12px]">Adjust how a cycle price translates into annual equivalents.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">Auto-save</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cycles.map((c) => (
            <div key={c.name} className="bg-surface-container-low rounded-xl border border-outline-variant p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-label-md font-bold text-on-surface">{c.name}</p>
                <input type="number" min="0.1" step="0.1" value={c.factor} onChange={(e) => setCycleField(c.name, Number(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-right outline-none focus:border-primary" />
              </div>
              <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{c.months}-month term · {c.note}</p>
              <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">Multiplier <span className="font-label-md font-bold text-primary">×{c.factor}</span></p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-headline-sm font-bold text-primary">Plans</h3>
        <p className="font-body-sm text-on-surface-variant mb-4">Each plan determines the features and capacity a subscriber receives.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all">
              <div className="h-1.5 w-full bg-gradient-to-r from-secondary to-primary"></div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-on-secondary-container">sell</span></div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${p.active ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface-variant'}`}><span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-outline'}`}></span>{p.active ? 'Active' : 'Archived'}</span>
                </div>
                <h4 className="font-headline-sm font-bold text-on-surface mt-3">{p.name}</h4>
                <p className="font-body-sm text-on-surface-variant text-[12px] mt-1 line-clamp-1">{p.tagline}</p>
                <div className="mt-3 flex items-baseline gap-2"><p className="font-headline-md font-bold text-primary">{fmtMoney(p.price || 0)}</p><p className="font-body-sm text-on-surface-variant text-[12px]">/ {p.cycle.toLowerCase()}</p></div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px]">{p.ownerType}</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px]">{fmtNum(p.seats)} seats</span>
                  {p.setupFee ? <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-label-md text-[11px] border border-amber-200">Setup {fmtMoney(p.setupFee)}</span> : null}
                </div>
                <div className="mt-3 space-y-1">
                  {String(p.features).split(',').map((f) => <p key={f.trim()} className="flex items-center gap-1 text-[12px] text-on-surface-variant"><span className="material-symbols-outlined text-[13px] text-primary">check</span>{f.trim()}</p>)}
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => openEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 border border-outline-variant bg-surface py-2 rounded-lg font-label-md text-[13px] hover:bg-surface-variant"><span className="material-symbols-outlined text-[16px]">edit</span> Edit</button>
                  <button type="button" onClick={() => togglePlan(p.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary py-2 rounded-lg font-label-md text-[13px] hover:bg-primary-fixed-dim">
                    <span className="material-symbols-outlined text-[16px]">{p.active ? 'archive' : 'unarchive'}</span>{p.active ? 'Archive' : 'Restore'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8" onClick={() => setShowForm(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card ambient-shadow rounded-xl border border-surface-container p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline-sm font-bold text-on-surface">{editing ? 'Edit plan' : 'Create a plan'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Plan name</span><input required value={form.name} onChange={(e) => setFormField('name', e.target.value)} className={fieldCls} placeholder="e.g. Institution Premium" /></label>
              <label className="block sm:col-span-2"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Tagline</span><input value={form.tagline} onChange={(e) => setFormField('tagline', e.target.value)} className={fieldCls} placeholder="Short marketing description" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Owner type</span><select value={form.ownerType} onChange={(e) => setFormField('ownerType', e.target.value)} className={fieldCls}><option>Institution</option><option>Personal</option></select></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Billing cycle</span><select value={form.cycle} onChange={(e) => setFormField('cycle', e.target.value)} className={fieldCls}><option>Monthly</option><option>Quarterly</option><option>Annual</option></select></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Price (₦)</span><input type="number" min="0" step="1000" required value={form.price} onChange={(e) => setFormField('price', e.target.value)} className={fieldCls} placeholder="250000" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Setup fee (₦)</span><input type="number" min="0" step="1000" value={form.setupFee} onChange={(e) => setFormField('setupFee', e.target.value)} className={fieldCls} placeholder="0" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Seats</span><input type="number" min="1" required value={form.seats} onChange={(e) => setFormField('seats', e.target.value)} className={fieldCls} placeholder="500" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Features</span><textarea value={form.features} onChange={(e) => setFormField('features', e.target.value)} rows="2" className={fieldCls} placeholder="Comma separated, e.g. Project Management, Analytics" /></label>
              <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={(e) => setFormField('active', e.target.checked)} className="accent-primary" /><span className="font-label-md text-on-surface">Active plan</span></label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-fixed-dim">{editing ? 'Save changes' : 'Create plan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ---------- Analytics ---------- */

const ANALYTICS_TABS = ['Dashboard', 'Revenue Reports', 'Subscription Status', 'Ratings']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const revenueByMonth = MONTHS.map((m, i) => ({ label: m, value: [124, 141, 138, 156, 168, 182, 174, 191, 205, 224, 238, 261][i] * 1e6 }))
const growth = MONTHS.map((m, i) => ({ label: m, value: [940, 966, 989, 1018, 1041, 1073, 1098, 1130, 1159, 1184, 1216, 1248][i] }))
let cumAcc = 0
const cumRevenue = revenueByMonth.map((x) => { cumAcc += x.value / 1e6; return { label: x.label, value: cumAcc } })

const planSegments = [
  { label: 'Institution Starter', value: 288, color: '#1e3a8a' },
  { label: 'Institution Annual', value: 452, color: '#3b82f6' },
  { label: 'Institution Premium', value: 232, color: '#f59e0b' },
  { label: 'Personal Researcher', value: 70, color: '#8b5cf6' },
]
const regionSegments = [
  { label: 'Nigeria', value: 412, color: '#1e3a8a' },
  { label: 'Ghana', value: 148, color: '#f59e0b' },
  { label: 'Kenya', value: 132, color: '#10b981' },
  { label: 'South Africa', value: 118, color: '#8b5cf6' },
  { label: 'Other regions', value: 438, color: '#cbd5e1' },
]
const dashStats = [
  { label: 'Total Institutions', value: '1,248', sub: '+4.2% this month', icon: 'business', color: 'bg-primary-container text-primary' },
  { label: 'Active Subscriptions', value: '1,042', sub: '83% of all subscriptions', icon: 'card_membership', color: 'bg-green-100 text-green-800' },
  { label: 'Monthly Recurring Revenue', value: '₦312M', sub: '+8.1% vs last month', icon: 'trending_up', color: 'bg-amber-100 text-amber-800' },
  { label: 'Revenue (YTD)', value: '₦2.41B', sub: 'Across 1,248 institutions', icon: 'payments', color: 'bg-blue-100 text-blue-800' },
  { label: 'Active Users', value: '84,210', sub: 'Students, staff & admins', icon: 'group', color: 'bg-violet-100 text-violet-800' },
  { label: 'Average Rating', value: '4.6 / 5', sub: '2,304 reviews', icon: 'star', color: 'bg-amber-100 text-amber-800' },
]
const revStats = [
  { label: 'Monthly Recurring Revenue', value: '₦312M', sub: '+8.1% vs last month', icon: 'trending_up', color: 'bg-primary-container text-primary' },
  { label: 'Annual Run Rate', value: '₦3.74B', sub: 'Normalised from MRR', icon: 'monetization_on', color: 'bg-green-100 text-green-800' },
  { label: 'Churn', value: '2.1%', sub: '12-month rolling', icon: 'minimize', color: 'bg-red-100 text-red-700' },
  { label: 'Avg Contract Value', value: '₦31.9M', sub: 'Per institution annually', icon: 'receipt_long', color: 'bg-amber-100 text-amber-800' },
]
const TRANSACTIONS = [
  { ref: 'PAY-2026-2201', institution: 'Joseph Sarwuan Tarka University', date: '2026-08-30', amount: 400000, method: 'Bank Transfer', status: 'Successful' },
  { ref: 'PAY-2026-2187', institution: 'University of Lagos', date: '2026-08-28', amount: 250000, method: 'Paystack', status: 'Successful' },
  { ref: 'PAY-2026-2160', institution: 'KNUST', date: '2026-08-25', amount: 150000, method: 'Card', status: 'Pending' },
  { ref: 'PAY-2026-2144', institution: 'University of Nairobi', date: '2026-08-21', amount: 80000, method: 'Bank Transfer', status: 'Failed' },
  { ref: 'PAY-2026-2110', institution: 'Cairo University', date: '2026-08-18', amount: 400000, method: 'Paystack', status: 'Successful' },
  { ref: 'PAY-2026-2089', institution: 'Stellenbosch University', date: '2026-08-15', amount: 250000, method: 'Bank Transfer', status: 'Successful' },
]
const statusSegments = [
  { label: 'Active', value: 1042, color: '#10b981' },
  { label: 'Suspended', value: 76, color: '#f59e0b' },
  { label: 'Expired', value: 96, color: '#ef4444' },
  { label: 'Pending', value: 34, color: '#3b82f6' },
]
const cycleBars = [
  { label: 'Monthly', value: 162, color: '#3b82f6' },
  { label: 'Quarterly', value: 84, color: '#f59e0b' },
  { label: 'Annual', value: 1002, color: '#1e3a8a' },
]
const statusStats = [
  { label: 'Total Subscriptions', value: '1,248', sub: 'Across 14 regions', icon: 'card_membership', color: 'bg-primary-container text-primary' },
  { label: 'Active', value: '1,042', sub: '83% of total', icon: 'verified', color: 'bg-green-100 text-green-800' },
  { label: 'Suspended', value: '76', sub: 'Awaiting admin review', icon: 'pause_circle', color: 'bg-amber-100 text-amber-800' },
  { label: 'Expired', value: '96', sub: 'Due for renewal', icon: 'dangerous', color: 'bg-red-100 text-red-700' },
]
const SUB_ACTIVITY = [
  { id: 'SUB-2026-0142', institution: 'Joseph Sarwuan Tarka University', plan: 'Institution Premium', status: 'active', end: '2026-12-31', amount: 400000 },
  { id: 'SUB-2026-0138', institution: 'University of Lagos', plan: 'Institution Annual', status: 'pending', end: '2027-01-31', amount: 250000 },
  { id: 'SUB-2026-0129', institution: 'KNUST', plan: 'Institution Starter', status: 'active', end: '2026-10-15', amount: 150000 },
  { id: 'SUB-2026-0117', institution: 'University of Nairobi', plan: 'Institution Premium', status: 'suspended', end: '2027-04-12', amount: 400000 },
  { id: 'SUB-2026-0105', institution: 'Cairo University', plan: 'Institution Annual', status: 'expired', end: '2026-07-31', amount: 250000 },
  { id: 'SUB-2026-0098', institution: 'Stellenbosch University', plan: 'Institution Quarterly', status: 'active', end: '2027-03-01', amount: 80000 },
]
const ratingStats = [
  { label: 'Overall Rating', value: '4.6 / 5', sub: 'From 2,304 reviews', icon: 'star', color: 'bg-amber-100 text-amber-800' },
  { label: 'Positive Reviews', value: '92%', sub: '4★ and above', icon: 'thumb_up', color: 'bg-green-100 text-green-800' },
  { label: 'Total Reviews', value: '2,304', sub: '+141 this month', icon: 'reviews', color: 'bg-primary-container text-primary' },
  { label: 'NPS', value: '+54', sub: 'Promoter score', icon: 'sentiment_satisfied', color: 'bg-violet-100 text-violet-800' },
]
const ratingDist = [
  { label: '5', value: 959, color: '#10b981' },
  { label: '4', value: 846, color: '#3b82f6' },
  { label: '3', value: 289, color: '#f59e0b' },
  { label: '2', value: 148, color: '#fb923c' },
  { label: '1', value: 62, color: '#ef4444' },
]
const REVIEWS = [
  { name: 'Prof. Amina Bello', institution: 'Joseph Sarwuan Tarka University', rating: 5, date: '2026-08-29', text: 'The project tracking and milestone reviews have drastically improved how we supervise postgraduate students.' },
  { name: 'Dr. Kwame Mensah', institution: 'KNUST', rating: 4, date: '2026-08-24', text: 'Clean interface and responsive support. Grant tracking is especially useful for our research office.' },
  { name: 'Dr. Lerato Nkosi', institution: 'Stellenbosch University', rating: 5, date: '2026-08-17', text: 'Rolling out to 40 departments was painless. The onboarding tooling is excellent.' },
  { name: 'Dr. Omar Hassan', institution: 'Cairo University', rating: 4, date: '2026-08-09', text: 'Solid analytics and citation tools. We would love deeper custom report exports.' },
  { name: 'Prof. Grace Mutua', institution: 'University of Nairobi', rating: 3, date: '2026-08-02', text: 'Good value overall; some features still maturing but the team communicates clearly.' },
]

function AnalyticsDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dashStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-headline-sm font-bold text-on-surface">Institutions on board</h3>
              <p className="font-body-sm text-on-surface-variant text-[12px]">Registered institutions by month</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-label-md text-[11px] self-start">+32.8% YoY</span>
          </div>
          <LineChart data={growth} format={fmtNum} />
        </div>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Subscriptions by plan</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Active subscription distribution</p>
          <Donut segments={planSegments} centerLabel="1,042" centerSub="active" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Monthly revenue</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Collected subscription revenue by month</p>
          <Bars data={revenueByMonth} format={fmtMillions} />
        </div>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Subscribers by region</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Registered institutions per region</p>
          <Donut segments={regionSegments} centerLabel="1,248" centerSub="institutions" />
        </div>
      </div>
    </div>
  )
}

function RevenueReports() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {revStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Monthly revenue</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Collected subscription revenue by month</p>
          <Bars data={revenueByMonth} format={fmtMillions} height={240} />
        </div>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Cumulative revenue</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Running total in ₦ millions</p>
          <LineChart data={cumRevenue} format={fmtMillions} stroke="#f59e0b" />
        </div>
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-headline-sm font-bold text-on-surface">Recent transactions</h3>
            <p className="font-body-sm text-on-surface-variant text-[12px]">Latest subscription payments</p>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 border border-outline-variant bg-surface px-3 py-2 rounded-lg font-label-md text-[13px] hover:bg-surface-variant"><span className="material-symbols-outlined text-[16px]">download</span> Export</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-outline-variant text-left font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">
                <th className="py-2.5 pr-3">Reference</th>
                <th className="py-2.5 pr-3">Institution</th>
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 pr-3">Method</th>
                <th className="py-2.5 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((t) => (
                <tr key={t.ref} className="border-b border-surface-variant last:border-0">
                  <td className="py-2.5 pr-3 font-label-md text-on-surface">{t.ref}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{t.institution}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{fmtDate(t.date)}</td>
                  <td className="py-2.5 pr-3 text-right font-label-md text-on-surface">{fmtMoney(t.amount)}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{t.method}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className={`px-2.5 py-1 rounded-full font-label-md text-[11px] ${t.status === 'Successful' ? 'bg-green-100 text-green-800' : t.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SubscriptionStatus() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statusStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Status distribution</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">All subscriptions by lifecycle status</p>
          <Donut segments={statusSegments} centerLabel="1,248" centerSub="subscriptions" />
        </div>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Billing cycle mix</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Subscriptions per billing cycle</p>
          <Bars data={cycleBars} format={(v) => v} height={240} />
        </div>
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-5">
        <div className="mb-3">
          <h3 className="font-headline-sm font-bold text-on-surface">Recent subscription activity</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px]">Latest changes across the subscriber base</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-outline-variant text-left font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">
                <th className="py-2.5 pr-3">Reference</th>
                <th className="py-2.5 pr-3">Institution</th>
                <th className="py-2.5 pr-3">Plan</th>
                <th className="py-2.5 pr-3">Renews</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {SUB_ACTIVITY.map((s) => {
                const st = STATUS[s.status] || STATUS.expired
                return (
                  <tr key={s.id} className="border-b border-surface-variant last:border-0">
                    <td className="py-2.5 pr-3 font-label-md text-on-surface">{s.id}</td>
                    <td className="py-2.5 pr-3 text-on-surface-variant">{s.institution}</td>
                    <td className="py-2.5 pr-3 text-on-surface-variant">{s.plan}</td>
                    <td className="py-2.5 pr-3 text-on-surface-variant">{fmtDate(s.end)}</td>
                    <td className="py-2.5 pr-3 text-right font-label-md text-on-surface">{fmtMoney(s.amount)}</td>
                    <td className="py-2.5 pl-3 text-right"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${st.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RatingsReports() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ratingStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Rating distribution</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Reviews across 1–5 stars</p>
          <Bars data={ratingDist} format={(v) => v} height={240} />
        </div>
        <div className="lg:col-span-2 glass-card ambient-shadow rounded-xl border border-surface-container p-5">
          <h3 className="font-headline-sm font-bold text-on-surface">Latest reviews</h3>
          <p className="font-body-sm text-on-surface-variant text-[12px] mb-4">Recent institution feedback</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-surface-container-low rounded-xl border border-outline-variant p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Stars n={r.rating} />
                  <span className="font-body-sm text-on-surface-variant text-[12px]">{fmtDate(r.date)}</span>
                </div>
                <p className="font-body-sm text-on-surface text-[13px]">{r.text}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary font-label-md text-[12px] shrink-0">{(r.name.match(/[A-Z]/g) || ['?']).slice(0, 2).join('')}</div>
                  <div>
                    <p className="font-label-md font-bold text-on-surface text-[13px]">{r.name}</p>
                    <p className="font-body-sm text-on-surface-variant text-[12px]">{r.institution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AnalyticsPage({ go, item }) {
  const [tab, setTab] = useState(ANALYTICS_TABS.find((t) => t.toLowerCase() === String(item || '').toLowerCase()) || 'Dashboard')
  return (
    <div className="space-y-5">
      <PageHeader icon="analytics" title="Analytics" desc="Platform metrics, usage and finance overview at a glance.">
        <div className="flex flex-wrap gap-1.5 bg-surface-container-low rounded-xl p-1 border border-outline-variant">
          {ANALYTICS_TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`px-3.5 py-2 rounded-lg font-label-md text-[13px] transition-colors ${tab === t ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{t}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'Dashboard' && <AnalyticsDashboard />}
      {tab === 'Revenue Reports' && <RevenueReports />}
      {tab === 'Subscription Status' && <SubscriptionStatus />}
      {tab === 'Ratings' && <RatingsReports />}
    </div>
  )
}

/* ---------- Regional Management ---------- */

const REGION_META = {
  1: { code: 'NG', institutions: 412, sample: ['University of Lagos', 'Federal University Lafia', 'Ahmadu Bello University'] },
  2: { code: 'GH', institutions: 148, sample: ['University of Ghana', 'KNUST', 'University of Cape Coast'] },
  3: { code: 'KE', institutions: 132, sample: ['University of Nairobi', 'Kenyatta University', 'JKUAT'] },
  4: { code: 'ZM', institutions: 40, sample: ['University of Zambia', 'Copperbelt University'] },
  5: { code: 'ZW', institutions: 33, sample: ['University of Zimbabwe', 'NUST Zimbabwe'] },
  6: { code: 'ZA', institutions: 118, sample: ['Stellenbosch University', 'Wits University', 'University of Pretoria'] },
  7: { code: 'EG', institutions: 104, sample: ['Cairo University', 'Ain Shams University', 'American University in Cairo'] },
  8: { code: 'MA', institutions: 71, sample: ['University of Al Quaraouiyine', 'Al Akhawayn University'] },
  9: { code: 'ET', institutions: 66, sample: ['Addis Ababa University', 'Bahir Dar University'] },
  10: { code: 'UG', institutions: 58, sample: ['Makerere University', 'Kyambogo University'] },
  11: { code: 'NA', institutions: 9, sample: ['University of Namibia'] },
  12: { code: 'TZ', institutions: 52, sample: ['University of Dar es Salaam', 'Ardhi University'] },
  13: { code: 'BW', institutions: 4, sample: ['University of Botswana'] },
  14: { code: 'MZ', institutions: 1, sample: ['Eduardo Mondlane University'] },
}

const REGION_COLORS = ['#1e3a8a', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#fb923c', '#64748b', '#14b8a6', '#f97316', '#6366f1', '#22c55e', '#eab308', '#ec4899']

export function RegionManagementPage({ go }) {
  const [q, setQ] = useState('')
  const cleaned = q.trim().toLowerCase()
  const regions = AFRICAN_REGIONS.map((r) => ({ ...r, ...(REGION_META[r.id] || { code: '', institutions: 0, sample: [] }) }))
  const list = regions.filter((r) => !cleaned || r.name.toLowerCase().includes(cleaned) || r.code.toLowerCase().includes(cleaned))
  const totalInst = regions.reduce((s, r) => s + r.institutions, 0)
  const leader = regions.reduce((a, b) => (b.institutions > a.institutions ? b : a), regions[0])

  return (
    <div className="space-y-5">
      <PageHeader icon="public" title="Regional Management" desc="Regions served by the platform with institution distribution.">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search regions…" className="w-full min-w-[220px] pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" />
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Regions" value={String(regions.length)} sub="Active markets across Africa" icon="public" color="bg-primary-container text-primary" />
        <StatCard label="Institutions" value={fmtNum(totalInst)} sub="Registered across all regions" icon="business" color="bg-green-100 text-green-800" />
        <StatCard label="Coverage" value="14 / 14" sub="All target markets active" icon="check_circle" color="bg-amber-100 text-amber-800" />
        <StatCard label="Leading Region" value={leader ? leader.name : '—'} sub={`${fmtNum(leader.institutions)} institutions`} icon="local_fire_department" color="bg-violet-100 text-violet-800" />
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((r) => {
            const maxInst = Math.max(...regions.map((x) => x.institutions), 1)
            const color = REGION_COLORS[(r.id - 1) % REGION_COLORS.length]
            return (
              <div key={r.id} className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary"></div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-headline-md font-bold text-white" style={{ background: color }}>{r.name.charAt(0)}</div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-label-md text-[11px] border border-outline-variant"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Active market</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h4 className="font-headline-sm font-bold text-on-surface">{r.name}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{r.code}</span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">Region {String(r.id).padStart(2, '0')}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-label-md text-on-surface-variant text-[12px]">Institutions</p>
                      <p className="font-label-md font-bold text-on-surface text-[12px]">{fmtNum(r.institutions)}</p>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.institutions / maxInst) * 100}%`, background: color }}></div></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {r.sample.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant line-clamp-1 max-w-full">{s}</span>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
          <p className="font-headline-sm text-on-surface">No region matches "{q}"</p>
        </div>
      )}
    </div>
  )
}