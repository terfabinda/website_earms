import React, { useState, useRef, useEffect } from 'react'
import { AFRICAN_REGIONS } from './regions'
import { billingApi } from './billing'

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
        <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-white">{icon}</span></div>
        <div>
          <h2 className="font-headline-md font-bold text-primary">{title}</h2>
          <p className="font-body-sm text-on-surface-variant">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, icon, color = 'bg-primary-container text-white' }) {
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
    <div className="flex items-center gap-2 bg-primary-container text-white px-4 py-2.5 rounded-lg border border-primary/20">
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

/* ---------- Subscription Plan Management ---------- */

const STATUS = {
  active: { label: 'Active', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', icon: 'verified' },
  retired: { label: 'Retired', badge: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-outline', icon: 'archive' },
}

const BILLING_CYCLE_MAP = { 12: 'Annual', 3: 'Quarterly', 1: 'Monthly' }

// Doc §6 PlanStatus: 1 = Active, 2 = Retired
const PLAN_STATUS_MAP = { 1: 'active', 2: 'retired' }

const emptyPlanForm = { name: '', aiUnits: '', price: '', active: true, featureIds: [], featuresText: '' }

const fmtPrice = (v, c = 'NGN') => {
  const sym = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' }[String(c || '').toUpperCase()] || (c ? c + ' ' : '₦')
  return sym + Number(v || 0).toLocaleString('en-NG')
}

function DetailTile({ label, value }) {
  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant p-3.5">
      <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wide mb-1">{label}</p>
      <p className="font-label-md font-bold text-on-surface text-[13px] break-words">{value}</p>
    </div>
  )
}

function SubscriptionDetail({ sub, onBack, onToggle, onEdit, onTopUp }) {
  const st = STATUS[sub.status] || STATUS.retired
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 font-label-md text-primary hover:text-primary-fixed-dim">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> All plans
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 border border-outline-variant bg-surface text-on-surface px-4 py-2 rounded-lg font-label-md hover:bg-surface-variant"><span className="material-symbols-outlined text-[16px]">edit</span> Edit Plan</button>
          <button onClick={onTopUp} className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[16px]">bolt</span> Top Up AI Units</button>
          {sub.status === 'active' ? (
            <button onClick={() => onToggle(sub.id)} className="inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg font-label-md hover:bg-amber-100"><span className="material-symbols-outlined text-[16px]">archive</span> Archive</button>
          ) : (
            <button onClick={() => onToggle(sub.id)} className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg font-label-md hover:bg-green-700"><span className="material-symbols-outlined text-[16px]">unarchive</span> Restore</button>
          )}
        </div>
      </div>
      <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-white">sell</span></div>
            <div>
              <h3 className="font-headline-md font-bold text-on-surface">{sub.name}</h3>
              <p className="font-body-sm text-on-surface-variant">{sub.billing} billing · {sub.id}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${st.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{fmtNum(sub.aiUnits)} AI units</span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="font-headline-lg font-bold text-primary">{fmtPrice(sub.amount, sub.currency)}</p>
            <p className="font-body-sm text-on-surface-variant text-[12px]">{sub.billing === '—' ? 'annual billing' : 'per ' + sub.billing.toLowerCase() + ' cycle'}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <DetailTile label="Billing Cycle" value={sub.billing} />
          <DetailTile label="AI Units" value={fmtNum(sub.aiUnits)} />
          <DetailTile label="Currency" value={sub.currency} />
          <DetailTile label="Reference" value={sub.id} />
        </div>
        <div className="mt-6">
          <p className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide mb-2">Plan Features</p>
          {sub.features.length ? (
            <div className="flex flex-wrap gap-2">
              {sub.features.map((f) => <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container text-white font-label-md text-[12px]"><span className="material-symbols-outlined text-[14px]">check</span>{f}</span>)}
            </div>
          ) : (
            <p className="font-body-sm text-on-surface-variant">No features attached to this plan.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SubCard({ s, onOpen, onToggle, onTopUp }) {
  const st = STATUS[s.status] || STATUS.retired
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all cursor-pointer" onClick={onOpen}>
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary"></div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-white">card_membership</span></div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[11px] border border-outline-variant ${st.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{st.label}</span>
        </div>
        <h4 className="font-headline-sm font-bold text-on-surface mt-3 line-clamp-1">{s.name}</h4>
        <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{s.id}</p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Price</p><p className="font-label-md font-bold text-on-surface text-[13px]">{fmtPrice(s.amount, s.currency)}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Cycle</p><p className="font-label-md text-on-surface text-[13px]">{s.billing}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">AI Units</p><p className="font-label-md text-on-surface text-[13px]">{fmtNum(s.aiUnits)}</p></div>
          <div><p className="font-label-md text-outline text-[10px] uppercase tracking-wide">Features</p><p className="font-label-md text-on-surface text-[13px]">{s.features.length} feature{s.features.length === 1 ? '' : 's'}</p></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen() }} className="flex-1 inline-flex items-center justify-center gap-1 bg-primary text-on-primary py-2 rounded-lg font-label-md text-[12px] hover:bg-primary-fixed-dim">
            <span className="material-symbols-outlined text-[15px]">open_in_new</span> Details
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onTopUp() }} className="flex-1 inline-flex items-center justify-center gap-1 border border-outline-variant bg-surface text-primary py-2 rounded-lg font-label-md text-[12px] hover:bg-surface-variant">
            <span className="material-symbols-outlined text-[15px]">bolt</span> Top Up
          </button>
          {s.status === 'active' ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-1 inline-flex items-center justify-center gap-1 border border-outline-variant bg-surface py-2 rounded-lg font-label-md text-[12px] hover:bg-surface-variant text-amber-800">
              <span className="material-symbols-outlined text-[15px]">archive</span> Archive
            </button>
          ) : (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-1 inline-flex items-center justify-center gap-1 border border-outline-variant bg-surface py-2 rounded-lg font-label-md text-[12px] hover:bg-surface-variant text-green-700">
              <span className="material-symbols-outlined text-[15px]">unarchive</span> Restore
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SubscriptionManagementPage() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('Name A–Z')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, notify] = useToast()
  // Create / edit plan (doc §3.10, §3.16)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPlanForm)
  const [allFeatures, setAllFeatures] = useState([])
  const [saving, setSaving] = useState(false)
  // Top Up AI Units (doc §3.18)
  const [topUp, setTopUp] = useState(null)

  const loadPlans = async () => {
    setLoading(true)
    try {
      const res = await billingApi.getPlansSummary()
      const plans = res.data || []
      const all = []
      for (const plan of plans) {
        try {
          const detail = await billingApi.getPlanDetails(plan.id)
          const d = detail.data || {}
          const pricing = (d.planPricings || [])[0] || {}
          all.push({
            id: 'PLAN-' + (d.id || plan.id),
            name: d.planeName || plan.planName || '—',
            status: PLAN_STATUS_MAP[d.planStatus != null ? d.planStatus : plan.planStatus] || 'active',
            billing: BILLING_CYCLE_MAP[pricing.billingCycle] || (pricing.billingCycle ? pricing.billingCycle + ' mo' : '—'),
            amount: pricing.price || 0,
            currency: pricing.currency || 'NGN',
            aiUnits: d.aiUnits || 0,
            featureIds: (d.planFeatures || []).map((f) => f.id).filter(Boolean),
            features: (d.planFeatures || []).map((f) => f.feature || f.description || '').filter(Boolean),
            _raw: d,
          })
        } catch (e) {
          all.push({
            id: 'PLAN-' + plan.id,
            name: plan.planName || '—',
            status: PLAN_STATUS_MAP[plan.planStatus] || 'active',
            billing: '—',
            amount: 0,
            currency: 'NGN',
            aiUnits: 0,
            featureIds: [],
            features: [],
            _raw: plan,
          })
        }
      }
      setSubs(all)
    } catch {
      setSubs([])
    }
    setLoading(false)
  }

  useEffect(() => { loadPlans() }, [])
  useEffect(() => {
    billingApi.getAllFeatures()
      .then((res) => setAllFeatures(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }, [])

  const selected = subs.find((s) => s.id === selectedId) || null
  const counts = { all: subs.length, active: 0, retired: 0 }
  subs.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1 })
  const cleaned = q.trim().toLowerCase()
  let list = subs.filter((s) => {
    const matchQ = !cleaned || [s.name, s.id].some((f) => String(f || '').toLowerCase().includes(cleaned))
    const matchF = filter === 'all' || s.status === filter
    return matchQ && matchF
  })
  if (sort === 'Highest price') list = [...list].sort((a, b) => b.amount - a.amount)
  if (sort === 'Lowest price') list = [...list].sort((a, b) => a.amount - b.amount)
  if (sort === 'Name A–Z') list = [...list].sort((a, b) => a.name.localeCompare(b.name))

  const toggle = async (id) => {
    const s = subs.find((x) => x.id === id)
    const isActive = s && s.status === 'active'
    const numericId = id.replace('PLAN-', '')
    try {
      if (isActive) {
        await billingApi.deactivatePlan(numericId)
        notify(`"${s.name}" archived`)
      } else {
        await billingApi.activatePlan(numericId)
        notify(`"${s.name}" restored`)
      }
      setSubs((prev) => prev.map((x) => (x.id !== id ? x : { ...x, status: isActive ? 'retired' : 'active' })))
    } catch (e) {
      notify('Action failed: ' + e.message)
    }
  }

  const setFormField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const openCreate = () => { setEditing(null); setForm(emptyPlanForm); setShowForm(true) }
  const openEdit = (p) => {
    setSelectedId(null)
    setEditing(p)
    setForm({ name: p.name, aiUnits: String(p.aiUnits || ''), price: String(p.amount || ''), active: p.status === 'active', featureIds: p.featureIds || [], featuresText: '' })
    setShowForm(true)
  }
  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const featurePayload = allFeatures.length > 0
      ? form.featureIds.map((id) => ({ featureId: id }))
      : form.featuresText.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0).map((id) => ({ featureId: id }))
    const payload = {
      name: form.name,
      aiUnits: Number(form.aiUnits) || 0,
      planStatus: form.active ? 1 : 2,
      planFeatures: featurePayload,
      planPrices: [{ price: Number(form.price) || 0, currency: 'NGN', billingCycle: 12 }],
    }
    try {
      if (editing) {
        await billingApi.updatePlan(editing.id.replace('PLAN-', ''), payload)
        notify(`"${form.name}" updated`)
      } else {
        await billingApi.createPlan(payload)
        notify(`"${form.name}" created`)
      }
      setShowForm(false)
      await loadPlans()
    } catch (err) {
      notify('Save failed: ' + err.message)
    }
    setSaving(false)
  }

  const openTopUp = async (plan) => {
    setSelectedId(null)
    setTopUp({ plan, username: '', pkgId: '', provider: 'credo', packages: null, busy: false, result: null, error: '' })
    try {
      const pkgs = await billingApi.getAiUnitPackages(plan.currency || 'NGN')
      setTopUp((t) => (t && t.plan.id === plan.id ? { ...t, packages: pkgs } : t))
    } catch {
      setTopUp((t) => (t && t.plan.id === plan.id ? { ...t, packages: [] } : t))
    }
  }
  const submitTopUp = async (e) => {
    e.preventDefault()
    if (!topUp) return
    if (!topUp.pkgId) { setTopUp((t) => ({ ...t, error: 'Select an AI unit package.' })); return }
    setTopUp((t) => ({ ...t, busy: true, error: '', result: null }))
    try {
      const res = await billingApi.purchaseAIUnits({ username: topUp.username, aiUnitPackageId: Number(topUp.pkgId), provider: topUp.provider })
      setTopUp((t) => ({ ...t, busy: false, result: res?.data || {} }))
    } catch (err) {
      setTopUp((t) => ({ ...t, busy: false, error: err.message || 'Top-up failed' }))
    }
  }

  const filters = [
    { k: 'all', label: 'All', icon: 'apps' },
    { k: 'active', label: 'Active', icon: 'verified' },
    { k: 'retired', label: 'Retired', icon: 'archive' },
  ]

  if (selected) {
    return <SubscriptionDetail sub={selected} onBack={() => setSelectedId(null)} onToggle={toggle} onEdit={() => openEdit(selected)} onTopUp={() => openTopUp(selected)} />
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader icon="card_membership" title="Subscription Plans" desc="Create and manage plans, pricing, AI units and status." />
        <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2 animate-spin">progress_activity</span>
          <p className="font-headline-sm text-on-surface">Loading plans…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="card_membership" title="Subscription Plans" desc="Create and manage plans, pricing, AI units and status.">
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">add</span> Create Subscription Plan</button>
      </PageHeader>
      <ToastBar toast={toast} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filters.map((f) => (
          <button key={f.k} type="button" onClick={() => setFilter(f.k)} className={`rounded-xl border p-3 text-left transition-colors ${filter === f.k ? 'border-primary bg-primary' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'}`}>
            <p className={`font-label-md text-[10px] uppercase tracking-wide flex items-center gap-1 ${filter === f.k ? 'text-white/85' : 'text-on-surface-variant'}`}>{f.label} <span className={`material-symbols-outlined text-[13px] ${f.icon === 'verified' ? (filter === f.k ? 'text-white' : 'text-green-600') : (filter === f.k ? 'text-white' : 'text-outline')}`}>{f.icon}</span></p>
            <p className={`font-headline-md font-bold mt-0.5 ${filter === f.k ? 'text-white' : 'text-primary'}`}>{counts[f.k] || 0}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plans by name or reference…" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm outline-none">
            <option>Name A–Z</option>
            <option>Highest price</option>
            <option>Lowest price</option>
          </select>
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((s) => <SubCard key={s.id} s={s} onOpen={() => setSelectedId(s.id)} onToggle={() => toggle(s.id)} onTopUp={() => openTopUp(s)} />)}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
          <p className="font-headline-sm text-on-surface">No plans match your filters</p>
          <p className="font-body-sm text-on-surface-variant mt-1">Try a different search term or create a new plan.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8" onClick={() => setShowForm(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card ambient-shadow rounded-xl border border-surface-container p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline-sm font-bold text-on-surface">{editing ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Plan name</span><input required value={form.name} onChange={(e) => setFormField('name', e.target.value)} className={fieldCls} placeholder="e.g. Institution Premium" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Billing cycle</span><div className={`${fieldCls} bg-surface-container-high text-on-surface-variant`}>Annual</div></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Price (₦)</span><input type="number" min="0" step="1000" required value={form.price} onChange={(e) => setFormField('price', e.target.value)} className={fieldCls} placeholder="250000" /></label>
              <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">AI Units</span><input type="number" min="0" required value={form.aiUnits} onChange={(e) => setFormField('aiUnits', e.target.value)} className={fieldCls} placeholder="100" /></label>
              <label className="flex items-center gap-2 sm:mt-5 cursor-pointer"><input type="checkbox" checked={form.active} onChange={(e) => setFormField('active', e.target.checked)} className="accent-primary" /><span className="font-label-md text-on-surface">Active plan</span></label>
              <div className="block sm:col-span-2">
                <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Features</span>
                {allFeatures.length > 0 ? (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest divide-y divide-surface-variant">
                    {allFeatures.map((f) => (
                      <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-container-low">
                        <input type="checkbox" className="accent-primary" checked={form.featureIds.includes(f.id)} onChange={(e) => setFormField('featureIds', e.target.checked ? [...form.featureIds, f.id] : form.featureIds.filter((x) => x !== f.id))} />
                        <span className="font-label-md text-on-surface text-[13px]">{f.feature}</span>
                        {f.description && <span className="font-body-sm text-on-surface-variant text-[12px] ml-auto text-right line-clamp-1">{f.description}</span>}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input value={form.featuresText} onChange={(e) => setFormField('featuresText', e.target.value)} className={`${fieldCls} mt-1`} placeholder="Feature IDs separated by commas, e.g. 1, 2, 3" />
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create Subscription Plan'}</button>
            </div>
          </form>
        </div>
      )}

      {topUp && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8" onClick={() => setTopUp(null)}>
          <form onSubmit={submitTopUp} onClick={(e) => e.stopPropagation()} className="glass-card ambient-shadow rounded-xl border border-surface-container p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-sm font-bold text-on-surface">Top Up AI Units</h3>
              <button type="button" onClick={() => setTopUp(null)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span></button>
            </div>
            <p className="font-body-sm text-on-surface-variant mb-4">Purchase additional AI units ({topUp.plan.name}). A payment is initialised through the billing provider.</p>
            {topUp.result ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3">
                  <p className="font-label-md">Purchase initialised</p>
                  <p className="text-xs mt-1 opacity-90">Reference: {topUp.result.paymentReference || '—'}{topUp.result.units ? ` · ${topUp.result.units} units` : ''}{topUp.result.amount ? ` · ${fmtPrice(topUp.result.amount, topUp.result.currency || topUp.plan.currency)}` : ''}</p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  {topUp.result.paymentRedirectUrl && (
                    <a href={topUp.result.paymentRedirectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">open_in_new</span> Open payment page</a>
                  )}
                  <button type="button" onClick={() => setTopUp(null)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-variant">Done</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Subscriber username</span><input required value={topUp.username} onChange={(e) => setTopUp((t) => ({ ...t, username: e.target.value }))} className={fieldCls} placeholder="Username or email of the subscriber" /></label>
                <label className="block sm:col-span-2">
                  <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">AI unit package</span>
                  <select required value={topUp.pkgId} onChange={(e) => setTopUp((t) => ({ ...t, pkgId: e.target.value }))} className={fieldCls}>
                    <option value="">{topUp.packages === null ? 'Loading packages…' : 'Select a package'}</option>
                    {(topUp.packages || []).map((p) => <option key={p.id} value={p.id}>{p.planName} — {fmtPrice(p.price, p.currency || topUp.plan.currency)}</option>)}
                  </select>
                  {topUp.packages && topUp.packages.length === 0 && <span className="font-body-sm text-on-surface-variant text-[12px]">No packages available right now.</span>}
                </label>
                <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Payment provider</span><select value={topUp.provider} onChange={(e) => setTopUp((t) => ({ ...t, provider: e.target.value }))} className={fieldCls}><option value="credo">Credo</option><option value="bank">Bank transfer</option><option value="paystack">Paystack</option></select></label>
                {topUp.error && <p className="sm:col-span-2 text-sm text-red-600">{topUp.error}</p>}
                <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button type="button" onClick={() => setTopUp(null)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
                  <button type="submit" disabled={topUp.busy || topUp.packages === null} className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{topUp.busy ? 'Initialising…' : 'Initialise top-up'}</button>
                </div>
              </div>
            )}
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
  { label: 'Total Institutions', value: '1,248', sub: '+4.2% this month', icon: 'business', color: 'bg-primary-container text-white' },
  { label: 'Active Subscriptions', value: '1,042', sub: '83% of all subscriptions', icon: 'card_membership', color: 'bg-green-100 text-green-800' },
  { label: 'Monthly Recurring Revenue', value: '₦312M', sub: '+8.1% vs last month', icon: 'trending_up', color: 'bg-amber-100 text-amber-800' },
  { label: 'Revenue (YTD)', value: '₦2.41B', sub: 'Across 1,248 institutions', icon: 'payments', color: 'bg-blue-100 text-blue-800' },
  { label: 'Active Users', value: '84,210', sub: 'Students, staff & admins', icon: 'group', color: 'bg-violet-100 text-violet-800' },
  { label: 'Average Rating', value: '4.6 / 5', sub: '2,304 reviews', icon: 'star', color: 'bg-amber-100 text-amber-800' },
]
const revStats = [
  { label: 'Monthly Recurring Revenue', value: '₦312M', sub: '+8.1% vs last month', icon: 'trending_up', color: 'bg-primary-container text-white' },
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
  { label: 'Total Subscriptions', value: '1,248', sub: 'Across 14 regions', icon: 'card_membership', color: 'bg-primary-container text-white' },
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
  { label: 'Total Reviews', value: '2,304', sub: '+141 this month', icon: 'reviews', color: 'bg-primary-container text-white' },
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
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-label-md text-[12px] shrink-0">{(r.name.match(/[A-Z]/g) || ['?']).slice(0, 2).join('')}</div>
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
        <StatCard label="Regions" value={String(regions.length)} sub="Active markets across Africa" icon="public" color="bg-primary-container text-white" />
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