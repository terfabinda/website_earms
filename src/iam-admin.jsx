// EARMS IAM System Admin panel.
// Wired to the EARMS_IAM_API_Documentation user/owner/role/mail endpoints.
import React, { useState, useEffect, useCallback } from "react";
import {
  authApi,
  userApi,
  ownerApi,
  roleApi,
  mailApi,
} from "./iam";

const FIELD = "w-full px-3 py-2 text-sm rounded-md border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none";
function F({ label, children }) {
  return (
    <label className="block">
      <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Input(props) {
  return <input {...props} className={FIELD + " " + (props.className || "")} />;
}
function Select(props) {
  return (
    <select {...props} className={FIELD + " " + (props.className || "")}>
      {props.children}
    </select>
  );
}
function Msg({ children }) {
  return <div className="w-full rounded-lg text-body-sm font-body-sm px-3 py-2 bg-primary-container text-on-primary-container">{children}</div>;
}
function Err({ children }) {
  return <div className="w-full rounded-lg text-body-sm font-body-sm px-3 py-2 bg-error-container text-on-error-container">{children}</div>;
}
function Card({ children, className = "" }) {
  return <div className={"glass-card ambient-shadow rounded-xl border border-surface-container " + className}>{children}</div>;
}

const OWNER_TYPES = [
  { value: 1, label: "Institution" },
  { value: 2, label: "Personal" },
];

function useFetch(fn, deps) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    fn()
      .then(setData)
      .catch((e) => setErr(e.message || "Request failed"))
      .finally(() => setLoading(false));
  }, deps || []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, err, setErr, loading, reload };
}

function EntitlementsCard() {
  const { data, err } = useFetch(() => authApi.getEntitlements(), []);
  return (
    <Card className="p-5">
      <h3 className="font-headline-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined">verified_user</span> My Entitlements
      </h3>
      {err && <Err>{err}</Err>}
      {data ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="font-label-md text-on-surface-variant">Status</p>
              <p className="font-headline-sm text-on-surface">{data.status || data.Status || "—"}</p>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="font-label-md text-on-surface-variant">Plan</p>
              <p className="font-headline-sm text-on-surface">{data.plan || data.Plan || "—"}</p>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <p className="font-label-md text-on-surface-variant">Owner Type</p>
              <p className="font-headline-sm text-on-surface">{data.ownerType ?? data.OwnerType ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant mb-2">Features</p>
            <div className="flex flex-wrap gap-2">
              {(data.features || data.Features || []).map((f) => (
                <span key={f} className="px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full font-label-md text-[12px]">{f}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        !err && <p className="font-body-sm text-on-surface-variant">Loading entitlements…</p>
      )}
    </Card>
  );
}

/* ---------------- Users ---------------- */
function UsersTab() {
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [owners, setOwners] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ userName: "", email: "", password: "", ownerId: "", roles: [] });
  const [createOwner, setCreateOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: "", userName: "", ownerEmail: "", password: "", ownerType: 1,
    userRoles: ["InstitutionAdmin"], institutionCode: "", institutionName: "",
    isActive: true, preferredLanguage: "en", preferredCurrency: "NGN", timeZone: "Africa/Lagos",
  });

  const load = useCallback(async () => {
    try {
      const [u, r, o] = await Promise.all([
        Promise.resolve([]),
        roleApi.getRoles().catch(() => []),
        ownerApi.getAllOwners().catch(() => []),
      ]);
      setItems(u);
      setRoles(r || []);
      setOwners(o || []);
    } catch (e) {
      setErr(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = (name) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(name) ? f.roles.filter((r) => r !== name) : [...f.roles, name],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!form.userName.trim() || !form.email.trim() || !form.password) {
      setErr("User name, email and password are required.");
      return;
    }
    setBusy(true);
    try {
      await userApi.createUser({
        userName: form.userName.trim(),
        email: form.email.trim(),
        password: form.password,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        roles: form.roles,
      });
      setMsg("User created.");
      setForm({ userName: "", email: "", password: "", ownerId: "", roles: [] });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const ownerSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!ownerForm.ownerName.trim() || !ownerForm.userName.trim() || !ownerForm.ownerEmail.trim() || !ownerForm.password) {
      setErr("Owner name, user name, email and password are required.");
      return;
    }
    setBusy(true);
    try {
      await userApi.createOwner({
        ...ownerForm,
        ownerType: Number(ownerForm.ownerType),
        isActive: !!ownerForm.isActive,
      });
      setMsg("Owner/subscriber created.");
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Create User</h3>
        <Err>{err}</Err>
        <form onSubmit={submit} className="space-y-3 text-left">
          <F label="User Name"><Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></F>
          <F label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></F>
          <F label="Owner">
            <Select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">Select owner (optional)</option>
              {owners.map((o) => (
                <option key={o.id ?? o.Id} value={String(o.id ?? o.Id)}>{o.ownerName ?? o.OwnerName ?? o.userName}</option>
              ))}
            </Select>
          </F>
          <div>
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Roles</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {roles.map((r) => (
                <label key={r.id ?? r.Id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.roles.includes(r.name ?? r.Name)} onChange={() => toggleRole(r.name ?? r.Name)} />
                  {r.name ?? r.Name}
                </label>
              ))}
            </div>
          </div>
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create User"}
          </button>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Create Owner / Subscriber</h3>
        <p className="font-body-sm text-on-surface-variant mb-3">Registers a new institution or personal owner (Section 6.2).</p>
        <form onSubmit={ownerSubmit} className="space-y-3 text-left">
          <div className="grid grid-cols-2 gap-3">
            <F label="Owner Name"><Input value={ownerForm.ownerName} onChange={(e) => setOwnerForm({ ...ownerForm, ownerName: e.target.value })} /></F>
            <F label="User Name"><Input value={ownerForm.userName} onChange={(e) => setOwnerForm({ ...ownerForm, userName: e.target.value })} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Owner Email"><Input type="email" value={ownerForm.ownerEmail} onChange={(e) => setOwnerForm({ ...ownerForm, ownerEmail: e.target.value })} /></F>
            <F label="Password"><Input type="password" value={ownerForm.password} onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Owner Type">
              <Select value={ownerForm.ownerType} onChange={(e) => setOwnerForm({ ...ownerForm, ownerType: Number(e.target.value) })}>
                {OWNER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </F>
            <F label="Institution Code"><Input value={ownerForm.institutionCode} onChange={(e) => setOwnerForm({ ...ownerForm, institutionCode: e.target.value })} /></F>
          </div>
          <F label="Institution Name"><Input value={ownerForm.institutionName} onChange={(e) => setOwnerForm({ ...ownerForm, institutionName: e.target.value })} /></F>
          <div className="grid grid-cols-3 gap-3">
            <F label="Language">
              <Input value={ownerForm.preferredLanguage} onChange={(e) => setOwnerForm({ ...ownerForm, preferredLanguage: e.target.value })} />
            </F>
            <F label="Currency">
              <Input value={ownerForm.preferredCurrency} onChange={(e) => setOwnerForm({ ...ownerForm, preferredCurrency: e.target.value })} />
            </F>
            <F label="Time Zone">
              <Input value={ownerForm.timeZone} onChange={(e) => setOwnerForm({ ...ownerForm, timeZone: e.target.value })} />
            </F>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ownerForm.isActive} onChange={(e) => setOwnerForm({ ...ownerForm, isActive: e.target.checked })} />
            Active
          </label>
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Saving…" : "Create Owner"}
          </button>
        </form>
      </Card>
      {msg && <div className="xl:col-span-2"><Msg>{msg}</Msg></div>}
    </div>
  );
}

/* ---------------- Owners ---------------- */
function OwnersTable({ title, data, err }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline-sm font-semibold text-primary">{title}</h3>
      </div>
      {err && <Err>{err}</Err>}
      {!data ? (
        <p className="font-body-sm text-on-surface-variant">Loading…</p>
      ) : Array.isArray(data) && data.length === 0 ? (
        <p className="font-body-sm text-on-surface-variant">No records.</p>
      ) : (
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant">
                <th className="py-2">Id</th>
                <th className="py-2">Name</th>
                <th className="py-2">User Name</th>
                <th className="py-2">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {(Array.isArray(data) ? data : [data]).map((o) => (
                <tr key={o.id ?? o.Id ?? o.ownerName}>
                  <td className="py-2 font-medium text-on-surface">{o.id ?? o.Id}</td>
                  <td className="py-2 text-on-surface-variant">{o.ownerName ?? o.OwnerName ?? o.name}</td>
                  <td className="py-2 text-on-surface-variant">{o.userName ?? o.UserName}</td>
                  <td className="py-2 text-on-surface-variant">{o.institutionCode ?? o.InstitutionCode ?? o.code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OwnersTab() {
  const all = useFetch(() => ownerApi.getAllOwners(), []);
  const active = useFetch(() => ownerApi.getActiveOwners(), []);
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState(null);
  const [lookupErr, setLookupErr] = useState("");

  const search = async (e) => {
    e.preventDefault();
    setLookup(null); setLookupErr("");
    if (!code.trim()) return;
    try {
      const result = await ownerApi.getOwnerByCode(code.trim());
      setLookup(result);
    } catch (e2) {
      setLookupErr(e2.message);
    }
  };

  return (
    <div className="space-y-6">
      <OwnersTable title="All Owners" data={all.data} err={all.err} />
      <OwnersTable title="Active Owners" data={active.data} err={active.err} />
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Look Up Owner by Code</h3>
        <form onSubmit={search} className="flex gap-3 max-w-md text-left">
          <F label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 50F" /></F>
          <button className="self-end bg-primary text-on-primary px-4 py-2 rounded font-label-md">Search</button>
        </form>
        {lookupErr && <div className="mt-3"><Err>{lookupErr}</Err></div>}
        {lookup && (
          <div className="mt-4">
            <OwnersTable title="Search Result" data={lookup} err="" />
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Roles ---------------- */
function RolesTab() {
  const { data, err, reload } = useFetch(() => roleApi.getRoles(), []);
  const [userName, setUserName] = useState("");
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");
  const [e, setE] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (name) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const submit = async (ev) => {
    ev.preventDefault();
    setMsg(""); setE("");
    if (!userName.trim() || selected.length === 0) {
      setE("Enter a user name and select at least one role.");
      return;
    }
    setBusy(true);
    try {
      await roleApi.assignRoles(userName.trim(), selected);
      setMsg("Roles assigned to " + userName.trim());
    } catch (e2) {
      setE(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Application Roles</h3>
        {err && <Err>{err}</Err>}
        {!data ? (
          <p className="font-body-sm text-on-surface-variant">Loading…</p>
        ) : (
          <ul className="divide-y divide-surface-container text-sm">
            {(data || []).map((r) => (
              <li key={r.id ?? r.Id} className="py-2 flex justify-between">
                <span className="font-medium text-on-surface">{r.name ?? r.Name}</span>
                <span className="text-on-surface-variant">{r.normalizedName ?? r.NormalizedName}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Assign Roles (POST /assign-roles)</h3>
        <form onSubmit={submit} className="space-y-3 text-left">
          <F label="User Name"><Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="john.doe" /></F>
          <div>
            <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Roles</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(data || []).map((r) => {
                const n = r.name ?? r.Name;
                return (
                  <label key={n} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.includes(n)} onChange={() => toggle(n)} />
                    {n}
                  </label>
                );
              })}
            </div>
          </div>
          <Err>{e}</Err>
          {msg && <Msg>{msg}</Msg>}
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Assigning…" : "Assign Roles"}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Mail ---------------- */
function MailTab() {
  const [m, setM] = useState({ toEmail: "", subject: "", message: "" });
  const [email, setEmail] = useState("");
  const [type, setType] = useState("send-verification");
  const [msg, setMsg] = useState("");
  const [e, setE] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) => setM((x) => ({ ...x, [k]: ev.target.value }));

  const send = async (ev) => {
    ev.preventDefault();
    setMsg(""); setE("");
    if (!m.toEmail.trim() || !m.subject.trim() || !m.message.trim()) {
      setE("To, subject and message are required.");
      return;
    }
    setBusy(true);
    try {
      await mailApi.sendEmail(m);
      setMsg("Email sent to " + m.toEmail);
      setM({ toEmail: "", subject: "", message: "" });
    } catch (e2) {
      setE(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const sendVerification = async (ev) => {
    ev.preventDefault();
    setMsg(""); setE("");
    if (!email.trim()) {
      setE("Enter an email address.");
      return;
    }
    setBusy(true);
    try {
      if (type === "send-verification") await mailApi.sendVerification(email.trim());
      else await mailApi.resendVerificationEmail(email.trim());
      setMsg("Verification email sent to " + email.trim());
      setEmail("");
    } catch (e2) {
      setE(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Send General Email (POST /api/Mail/send)</h3>
        <form onSubmit={send} className="space-y-3 text-left">
          <F label="To"><Input type="email" value={m.toEmail} onChange={set("toEmail")} /></F>
          <F label="Subject"><Input value={m.subject} onChange={set("subject")} /></F>
          <F label="Message"><textarea value={m.message} onChange={set("message")} rows={4} className={FIELD} /></F>
          <Err>{e}</Err>
          {msg && <Msg>{msg}</Msg>}
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Sending…" : "Send Email"}
          </button>
        </form>
      </Card>
      <Card className="p-5">
        <h3 className="font-headline-sm font-semibold text-primary mb-3">Send / Resend Verification Email</h3>
        <form onSubmit={sendVerification} className="space-y-3 text-left">
          <F label="Email"><Input type="email" value={email} onChange={(e2) => setEmail(e2.target.value)} /></F>
          <F label="Action">
            <Select value={type} onChange={(e2) => setType(e2.target.value)}>
              <option value="send-verification">send-verification</option>
              <option value="resend-verification">usermgt/resend-verification</option>
            </Select>
          </F>
          <Err>{e}</Err>
          {msg && <Msg>{msg}</Msg>}
          <button className="w-full bg-primary text-on-primary py-2 rounded font-label-md" disabled={busy}>
            {busy ? "Sending…" : "Send Verification"}
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Main Panel ---------------- */
const TABS = ["entitlements", "users", "owners", "roles", "mail"];
export function IamAdmin({ go }) {
  const [tab, setTab] = useState("entitlements");
  const tabs = [
    { key: "entitlements", label: "Entitlements", icon: "verified_user" },
    { key: "users", label: "Users & Owners", icon: "group" },
    { key: "owners", label: "Owners", icon: "domain" },
    { key: "roles", label: "Roles", icon: "manage_accounts" },
    { key: "mail", label: "Mail", icon: "mail" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md ${
              tab === t.key ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "entitlements" && <EntitlementsCard />}
      {tab === "users" && <UsersTab />}
      {tab === "owners" && <OwnersTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "mail" && <MailTab />}
    </div>
  );
}
