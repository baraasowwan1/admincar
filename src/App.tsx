// ============================================================
// HIGH WAY RENT A CAR — Admin Dashboard
// Deploy on Vercel (separate project from main website)
// Connects to the Express server on Render
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Car, Plus, Edit, Trash2, Eye, EyeOff, Copy, LogOut,
  LayoutDashboard, Package, DollarSign, CheckCircle,
  XCircle, AlertCircle, Search, Save, X, ChevronDown,
  ToggleLeft, ToggleRight, Loader, RefreshCw, Star,
} from "lucide-react";

// ── Config ───────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Types ────────────────────────────────────────────────────
interface CarData {
  id: string;
  name: string; nameAr: string;
  brand: string; model: string; year: number;
  category: string; categoryAr: string;
  fuel: string; fuelAr: string;
  transmission: string; transmissionAr: string;
  seats: number; doors: number; engine: string;
  color: string; colorAr: string;
  dailyPrice: number; weeklyPrice: number; monthlyPrice: number;
  image: string; images: string[];
  available: boolean; popular: boolean;
  rating: number; reviewCount: number;
  features: string[]; featuresAr: string[];
  description: string; descriptionAr: string;
}

interface Stats {
  totalCars: number; availableCars: number;
  hiddenCars: number; categories: number; brands: number;
}

// ── Gold theme helpers ────────────────────────────────────────
const G = {
  card:   { background:"rgba(14,14,14,0.95)", border:"1px solid rgba(201,167,74,0.15)" },
  input:  { background:"rgba(26,26,26,0.9)",  border:"1px solid rgba(201,167,74,0.2)",  color:"#f0ede8" } as React.CSSProperties,
  gold:   "#c9a74a",
  btn:    { background:"#c9a74a", color:"#050505" } as React.CSSProperties,
  btnDanger: { background:"rgba(192,57,43,0.15)", color:"#e74c3c", border:"1px solid rgba(192,57,43,0.3)" } as React.CSSProperties,
};

// ── Fetch helper ─────────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string,string> || {}) } });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
type ToastType = "success" | "error" | "info";
interface Toast { id: number; msg: string; type: ToastType; }

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold shadow-2xl"
          style={{
            background: t.type==="success" ? "rgba(39,174,96,0.95)" : t.type==="error" ? "rgba(192,57,43,0.95)" : "rgba(14,14,14,0.97)",
            border: `1px solid ${t.type==="success" ? "rgba(39,174,96,0.5)" : t.type==="error" ? "rgba(192,57,43,0.5)" : "rgba(201,167,74,0.3)"}`,
            color: "#fff",
          }}>
          {t.type==="success" ? <CheckCircle size={16}/> : t.type==="error" ? <XCircle size={16}/> : <AlertCircle size={16}/>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CAR FORM (Add / Edit)
// ══════════════════════════════════════════════════════════════
const EMPTY_CAR: Partial<CarData> = {
  name:"", nameAr:"", brand:"", model:"", year: new Date().getFullYear(),
  category:"Sedan", categoryAr:"سيدان", fuel:"Petrol", fuelAr:"بنزين",
  transmission:"Automatic", transmissionAr:"أوتوماتيك",
  seats:5, doors:4, engine:"", color:"", colorAr:"",
  dailyPrice:0, weeklyPrice:0, monthlyPrice:0,
  image:"", images:[], available:true, popular:false,
  rating:4.5, reviewCount:0,
  features:[], featuresAr:[],
  description:"", descriptionAr:"",
};

function CarForm({ car, token, onSave, onCancel, toast }:
  { car: Partial<CarData>|null; token:string; onSave:()=>void; onCancel:()=>void; toast:(m:string,t:ToastType)=>void }) {

  const [form, setForm] = useState<Partial<CarData>>(car ?? EMPTY_CAR);
  const [saving, setSaving] = useState(false);
  const [featStr,  setFeatStr]  = useState((car?.features  || []).join("، "));
  const [featArStr,setFeatArStr]= useState((car?.featuresAr|| []).join("، "));
  const [imgsStr,  setImgsStr]  = useState((car?.images    || []).join("\n"));

  const set = (k: keyof CarData, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.dailyPrice) { toast("اسم السيارة والسعر اليومي مطلوبان", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        features:   featStr.split(/[،,]/).map(s=>s.trim()).filter(Boolean),
        featuresAr: featArStr.split(/[،,]/).map(s=>s.trim()).filter(Boolean),
        images:     imgsStr.split("\n").map(s=>s.trim()).filter(Boolean),
      };
      if (car?.id) {
        await apiFetch(`/api/admin/cars/${car.id}`, { method:"PUT", body:JSON.stringify(payload) }, token);
        toast("تم تحديث السيارة بنجاح ✓", "success");
      } else {
        await apiFetch("/api/admin/cars", { method:"POST", body:JSON.stringify(payload) }, token);
        toast("تمت إضافة السيارة بنجاح ✓", "success");
      }
      onSave();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const Field = ({ label, field, type="text", ph="" }: { label:string; field:keyof CarData; type?:string; ph?:string }) => (
    <div>
      <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">{label}</label>
      <input type={type} value={(form[field] ?? "") as string|number} placeholder={ph}
        onChange={e => set(field, type==="number" ? Number(e.target.value) : e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
        style={{ ...G.input, border: `1px solid rgba(201,167,74,0.25)` }} />
    </div>
  );

  const Select = ({ label, field, opts }: { label:string; field:keyof CarData; opts:string[] }) => (
    <div>
      <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">{label}</label>
      <select value={(form[field] ?? "") as string} onChange={e => set(field, e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none"
        style={G.input}>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6" style={G.card}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">{car?.id ? "تعديل السيارة" : "إضافة سيارة جديدة"}</h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="اسم السيارة (إنجليزي)" field="name" ph="BMW M3 Competition" />
          <Field label="اسم السيارة (عربي)"    field="nameAr" ph="بي إم دبليو M3" />
          <Field label="الماركة" field="brand" ph="BMW" />
          <Field label="الموديل" field="model" ph="M3" />
          <Field label="سنة الصنع" field="year" type="number" />
          <Select label="الفئة (إنجليزي)" field="category" opts={["Sedan","SUV","Sports","Luxury","Economy","Van"]} />
          <Field label="الفئة (عربي)" field="categoryAr" ph="سيدان" />
          <Select label="الوقود (إنجليزي)" field="fuel" opts={["Petrol","Diesel","Hybrid","Electric"]} />
          <Field label="الوقود (عربي)" field="fuelAr" ph="بنزين" />
          <Select label="ناقل الحركة (إنجليزي)" field="transmission" opts={["Automatic","Manual"]} />
          <Field label="ناقل الحركة (عربي)" field="transmissionAr" ph="أوتوماتيك" />
          <Field label="المحرك" field="engine" ph="2.0L Turbo" />
          <Field label="اللون (إنجليزي)" field="color" ph="Black" />
          <Field label="اللون (عربي)" field="colorAr" ph="أسود" />
          <Field label="عدد المقاعد" field="seats" type="number" />
          <Field label="عدد الأبواب" field="doors" type="number" />
        </div>

        {/* Prices */}
        <div className="rounded-xl p-4 mb-4" style={{ background:"rgba(201,167,74,0.06)", border:"1px solid rgba(201,167,74,0.2)" }}>
          <p className="text-[#c9a74a] font-black text-sm mb-3 flex items-center gap-2"><DollarSign size={15}/>الأسعار (دينار أردني)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="اليومي" field="dailyPrice" type="number" />
            <Field label="الأسبوعي" field="weeklyPrice" type="number" />
            <Field label="الشهري" field="monthlyPrice" type="number" />
          </div>
        </div>

        {/* Image */}
        <div className="mb-4">
          <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">رابط الصورة الرئيسية</label>
          <input value={form.image || ""} onChange={e => set("image", e.target.value)}
            placeholder="https://images.unsplash.com/..." className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ ...G.input }} />
          {form.image && <img src={form.image} alt="" className="mt-2 h-28 rounded-xl object-cover w-full" onError={e=>(e.currentTarget.style.display="none")}/>}
        </div>

        {/* Extra images */}
        <div className="mb-4">
          <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">روابط الصور الإضافية (كل رابط على سطر)</label>
          <textarea value={imgsStr} onChange={e=>setImgsStr(e.target.value)} rows={3}
            placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
            style={G.input}/>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">المميزات (إنجليزي) — مفصولة بفاصلة</label>
            <textarea value={featStr} onChange={e=>setFeatStr(e.target.value)} rows={3}
              placeholder="Navigation, Bluetooth, Sunroof" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={G.input}/>
          </div>
          <div>
            <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">المميزات (عربي) — مفصولة بفاصلة</label>
            <textarea value={featArStr} onChange={e=>setFeatArStr(e.target.value)} rows={3}
              placeholder="ملاحة، بلوتوث، فتحة سقف" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={G.input}/>
          </div>
        </div>

        {/* Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">الوصف (إنجليزي)</label>
            <textarea value={form.description||""} onChange={e=>set("description",e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none" style={G.input}/>
          </div>
          <div>
            <label className="block text-xs text-[rgba(240,237,232,0.5)] mb-1 font-semibold">الوصف (عربي)</label>
            <textarea value={form.descriptionAr||""} onChange={e=>set("descriptionAr",e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none" style={G.input}/>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-4 mb-6">
          {[
            { label:"متاحة للإيجار", field:"available"  as keyof CarData },
            { label:"مميزة / شائعة", field:"popular"    as keyof CarData },
          ].map(({ label, field }) => (
            <button key={field} type="button" onClick={() => set(field, !form[field])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={form[field] ? G.btn : { background:"rgba(255,255,255,0.05)", color:"rgba(240,237,232,0.5)", border:"1px solid rgba(255,255,255,0.1)" }}>
              {form[field] ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={G.btn}>
            {saving ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>}
            {saving ? "جاري الحفظ..." : "حفظ السيارة"}
          </button>
          <button onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background:"rgba(255,255,255,0.06)", color:"rgba(240,237,232,0.6)", border:"1px solid rgba(255,255,255,0.1)" }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRICE QUICK-EDIT ROW
// ══════════════════════════════════════════════════════════════
function PriceRow({ car, token, onUpdated, toast }:
  { car: CarData; token:string; onUpdated:()=>void; toast:(m:string,t:ToastType)=>void }) {
  const [d, setD] = useState(String(car.dailyPrice));
  const [w, setW] = useState(String(car.weeklyPrice));
  const [m, setM] = useState(String(car.monthlyPrice));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/cars/${car.id}/prices`, {
        method: "PATCH",
        body: JSON.stringify({ dailyPrice:Number(d), weeklyPrice:Number(w), monthlyPrice:Number(m) }),
      }, token);
      toast(`تم تحديث أسعار ${car.name} ✓`, "success");
      onUpdated();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const inp = "w-20 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none font-bold";

  return (
    <tr className="border-b transition-colors hover:bg-white/2" style={{ borderColor:"rgba(255,255,255,0.04)" }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={car.image} alt="" className="w-12 h-9 rounded-lg object-cover flex-shrink-0 bg-black"/>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{car.name}</p>
            <p className="text-xs" style={{ color:"rgba(201,167,74,0.7)" }}>{car.brand} · {car.year}</p>
          </div>
        </div>
      </td>
      {[{val:d,set:setD},{val:w,set:setW},{val:m,set:setM}].map((f,i) => (
        <td key={i} className="px-3 py-3 text-center">
          <input type="number" value={f.val} onChange={e=>f.set(e.target.value)}
            className={inp} style={G.input}/>
        </td>
      ))}
      <td className="px-3 py-3">
        <button onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all hover:opacity-80"
          style={G.btn}>
          {saving ? <Loader size={12} className="animate-spin"/> : <Save size={12}/>}
          حفظ
        </button>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function AdminApp() {
  const [token,    setToken]    = useState(localStorage.getItem("hw_token") || "");
  const [username, setUsername] = useState(localStorage.getItem("hw_user")  || "");
  const [loginForm, setLoginForm] = useState({ user:"", pass:"" });
  const [loginErr,  setLoginErr]  = useState("");
  const [logging,   setLogging]   = useState(false);

  const [tab,     setTab]     = useState<"dashboard"|"cars"|"prices">("dashboard");
  const [cars,    setCars]    = useState<CarData[]>([]);
  const [stats,   setStats]   = useState<Stats|null>(null);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState("");
  const [editCar, setEditCar] = useState<Partial<CarData>|null|undefined>(undefined);
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<{id:string;name:string}|null>(null);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        apiFetch("/api/admin/cars",  {}, token),
        apiFetch("/api/admin/stats", {}, token),
      ]);
      setCars(c); setStats(s);
    } catch (e: any) {
      if (e.message.includes("401") || e.message.includes("Invalid")) {
        localStorage.removeItem("hw_token"); localStorage.removeItem("hw_user");
        setToken(""); setUsername("");
      }
      toast(e.message, "error");
    } finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  // ── Login ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true); setLoginErr("");
    try {
      const data = await apiFetch("/api/auth/login", {
        method:"POST",
        body: JSON.stringify({ username: loginForm.user, password: loginForm.pass }),
      });
      localStorage.setItem("hw_token", data.token);
      localStorage.setItem("hw_user", data.username);
      setToken(data.token); setUsername(data.username);
    } catch (e: any) { setLoginErr("بيانات خاطئة، حاول مجدداً"); }
    finally { setLogging(false); }
  };

  const logout = () => {
    localStorage.removeItem("hw_token"); localStorage.removeItem("hw_user");
    setToken(""); setUsername(""); setCars([]); setStats(null);
  };

  // ── Actions ───────────────────────────────────────────────
  const toggleCar = async (id: string) => {
    try {
      await apiFetch(`/api/admin/cars/${id}/toggle`, { method:"PATCH" }, token);
      await load();
      toast("تم تغيير حالة السيارة", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const duplicateCar = async (id: string) => {
    try {
      await apiFetch(`/api/admin/cars/${id}/duplicate`, { method:"POST" }, token);
      await load();
      toast("تم نسخ السيارة ✓", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const deleteCar = async (id: string) => {
    try {
      await apiFetch(`/api/admin/cars/${id}`, { method:"DELETE" }, token);
      await load();
      toast("تم حذف السيارة", "success");
    } catch (e: any) { toast(e.message, "error"); }
    finally { setConfirm(null); }
  };

  // ── Filtered cars ─────────────────────────────────────────
  const filtered = cars.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nameAr.includes(search) || c.brand.toLowerCase().includes(search.toLowerCase())
  );

  // ════════════════════════════════════════════════════════
  // LOGIN PAGE
  // ════════════════════════════════════════════════════════
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background:"radial-gradient(ellipse at 50% 0%, rgba(201,167,74,0.08) 0%, #050505 60%)" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background:"linear-gradient(135deg,#c9a74a,#f5d878)", boxShadow:"0 0 30px rgba(201,167,74,0.5)" }}>
              <Car size={28} className="text-black"/>
            </div>
            <h1 className="text-2xl font-black text-white">لوحة التحكم</h1>
            <p className="text-sm mt-1" style={{ color:"rgba(201,167,74,0.8)" }}></p>
          </div>
          <form onSubmit={handleLogin} className="p-6 rounded-2xl space-y-4" style={G.card}>
            {["user","pass"].map(f => (
              <div key={f}>
                <label className="block text-xs mb-1.5 font-semibold" style={{ color:"rgba(240,237,232,0.5)" }}>
                  {f==="user" ? "اسم المستخدم" : "كلمة المرور"}
                </label>
                <input type={f==="pass"?"password":"text"}
                  value={(loginForm as any)[f]}
                  onChange={e => setLoginForm(p=>({...p,[f]:e.target.value}))}
                  placeholder={f==="user"?"admin":"••••••••"} required
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={G.input}/>
              </div>
            ))}
            {loginErr && <p className="text-red-400 text-xs font-semibold">{loginErr}</p>}
            <button type="submit" disabled={logging}
              className="w-full py-3.5 rounded-xl font-black text-base flex items-center justify-center gap-2"
              style={G.btn}>
              {logging ? <Loader size={18} className="animate-spin"/> : null}
              {logging ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════
  const TABS = [
    { key:"dashboard", label:"لوحة التحكم",  icon:LayoutDashboard },
    { key:"cars",      label:"السيارات",      icon:Car              },
    { key:"prices",    label:"الأسعار",       icon:DollarSign       },
  ] as const;

  const statCards = stats ? [
    { label:"إجمالي السيارات",   val:stats.totalCars,     color:"#c9a74a" },
    { label:"متاح للإيجار",      val:stats.availableCars, color:"#2ecc71" },
    { label:"مخفية",             val:stats.hiddenCars,    color:"#e74c3c" },
    { label:"الفئات",            val:stats.categories,    color:"#3498db" },
    { label:"الماركات",          val:stats.brands,        color:"#9b59b6" },
  ] : [];

  return (
    <div className="min-h-screen flex" style={{ background:"#050505" }}>
      <ToastContainer toasts={toasts} remove={id => setToasts(p=>p.filter(t=>t.id!==id))}/>

      {/* Delete confirm */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-sm p-6 rounded-2xl text-center" style={G.card}>
            <Trash2 size={40} className="mx-auto mb-4 text-red-400"/>
            <h3 className="text-white font-black text-lg mb-2">حذف السيارة؟</h3>
            <p className="text-sm mb-6" style={{ color:"rgba(240,237,232,0.5)" }}>{confirm.name}</p>
            <div className="flex gap-3">
              <button onClick={() => deleteCar(confirm.id)} className="flex-1 py-3 rounded-xl font-black text-white" style={{ background:"#e74c3c" }}>حذف نهائياً</button>
              <button onClick={()=>setConfirm(null)} className="flex-1 py-3 rounded-xl font-bold" style={{ background:"rgba(255,255,255,0.07)", color:"rgba(240,237,232,0.6)" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Car Form Modal */}
      {editCar !== undefined && (
        <CarForm car={editCar} token={token}
          onSave={async () => { setEditCar(undefined); await load(); }}
          onCancel={() => setEditCar(undefined)}
          toast={toast}/>
      )}

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col min-h-screen"
        style={{ background:"rgba(8,8,8,0.98)", borderInlineEnd:"1px solid rgba(201,167,74,0.1)" }}>
        <div className="p-5 border-b" style={{ borderColor:"rgba(201,167,74,0.1)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background:"linear-gradient(135deg,#c9a74a,#f5d878)" }}>
              <Car size={15} className="text-black"/>
            </div>
            <div>
              <p className="text-white font-black text-xs leading-tight">لوحة التحكم</p>
              <p className="text-xs leading-tight" style={{ color:"rgba(201,167,74,0.7)" }}></p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all"
              style={tab===t.key
                ? { background:"#c9a74a", color:"#050505", boxShadow:"0 0 16px rgba(201,167,74,0.3)" }
                : { color:"rgba(240,237,232,0.45)", hover:"color: white" }}>
              <t.icon size={16}/>{t.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor:"rgba(201,167,74,0.1)" }}>
          <p className="text-xs px-3 mb-2 font-semibold" style={{ color:"rgba(201,167,74,0.6)" }}>مرحباً، {username}</p>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-red-400 hover:bg-red-400/10">
            <LogOut size={15}/>تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">
            {TABS.find(t=>t.key===tab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ border:"1px solid rgba(201,167,74,0.2)", color:"#c9a74a" }}>
              <RefreshCw size={13} className={loading?"animate-spin":""}/> تحديث
            </button>
            {tab==="cars" && (
              <button onClick={()=>setEditCar(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all hover:opacity-90"
                style={G.btn}>
                <Plus size={16}/>إضافة سيارة
              </button>
            )}
          </div>
        </div>

        {/* ── Dashboard tab ── */}
        {tab==="dashboard" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {statCards.map((s,i) => (
                <div key={i} className="p-5 rounded-2xl" style={G.card}>
                  <div className="text-3xl font-black mb-1" style={{ color:s.color }}>{s.val}</div>
                  <div className="text-xs font-semibold" style={{ color:"rgba(240,237,232,0.5)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden" style={G.card}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor:"rgba(201,167,74,0.1)" }}>
                <h3 className="font-black text-white">قائمة السيارات</h3>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"rgba(201,167,74,0.1)", color:"#c9a74a" }}>{cars.length} سيارة</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    {["السيارة","الفئة","السعر اليومي","الحالة",""].map(h=>(
                      <th key={h} className="px-4 py-3 text-start text-xs font-bold" style={{ color:"rgba(240,237,232,0.4)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {cars.slice(0,8).map(c=>(
                      <tr key={c.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={c.image} alt="" className="w-12 h-9 rounded-lg object-cover bg-black"/>
                            <div>
                              <p className="text-white font-bold leading-tight">{c.name}</p>
                              <p className="text-xs" style={{ color:"rgba(201,167,74,0.6)" }}>{c.year}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color:"rgba(240,237,232,0.5)" }}>{c.category}</td>
                        <td className="px-4 py-3 font-black" style={{ color:"#c9a74a" }}>{c.dailyPrice} JOD</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full font-bold border"
                            style={c.available
                              ? { background:"rgba(46,204,113,0.1)", color:"#2ecc71", borderColor:"rgba(46,204,113,0.25)" }
                              : { background:"rgba(231,76,60,0.1)",  color:"#e74c3c", borderColor:"rgba(231,76,60,0.25)" }}>
                            {c.available?"متاحة":"مخفية"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>setEditCar(c)} className="p-1.5 rounded hover:text-[#c9a74a] transition-colors" style={{ color:"rgba(240,237,232,0.4)" }}>
                            <Edit size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Cars tab ── */}
        {tab==="cars" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 relative">
                <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(201,167,74,0.6)" }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="ابحث عن سيارة..." className="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={G.input}/>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(c => (
                <div key={c.id} className="rounded-2xl overflow-hidden" style={G.card}>
                  <div className="relative h-40 bg-black overflow-hidden">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover opacity-90"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>
                    <div className="absolute top-2 start-2 flex gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(201,167,74,0.9)", color:"#050505" }}>{c.category}</span>
                      {c.popular && <Star size={12} className="text-[#c9a74a] fill-[#c9a74a] mt-0.5"/>}
                    </div>
                    <span className="absolute top-2 end-2 text-xs px-2 py-0.5 rounded-full font-bold border"
                      style={c.available
                        ? { background:"rgba(46,204,113,0.15)", color:"#2ecc71", borderColor:"rgba(46,204,113,0.3)" }
                        : { background:"rgba(231,76,60,0.15)",  color:"#e74c3c", borderColor:"rgba(231,76,60,0.3)" }}>
                      {c.available?"متاحة":"مخفية"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-black mb-0.5 leading-tight">{c.name}</h3>
                    <p className="text-xs mb-3" style={{ color:"rgba(201,167,74,0.7)" }}>{c.brand} · {c.year}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xl font-black" style={{ color:"#c9a74a" }}>{c.dailyPrice}</span>
                        <span className="text-xs ms-1" style={{ color:"rgba(240,237,232,0.4)" }}>JOD/يوم</span>
                      </div>
                      <span className="text-xs" style={{ color:"rgba(240,237,232,0.4)" }}>{c.weeklyPrice} أسبوعي</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setEditCar(c)} className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1" style={G.btn}>
                        <Edit size={13}/>تعديل
                      </button>
                      <button onClick={()=>toggleCar(c.id)} title={c.available?"إخفاء":"إظهار"}
                        className="px-3 py-2 rounded-xl transition-all hover:opacity-80"
                        style={c.available ? { background:"rgba(231,76,60,0.12)", color:"#e74c3c" } : { background:"rgba(46,204,113,0.12)", color:"#2ecc71" }}>
                        {c.available ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                      <button onClick={()=>duplicateCar(c.id)} title="نسخ" className="px-3 py-2 rounded-xl transition-all hover:opacity-80"
                        style={{ background:"rgba(52,152,219,0.12)", color:"#3498db" }}>
                        <Copy size={15}/>
                      </button>
                      <button onClick={()=>setConfirm({id:c.id,name:c.name})} title="حذف" className="px-3 py-2 rounded-xl transition-all hover:opacity-80"
                        style={G.btnDanger}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20" style={{ color:"rgba(240,237,232,0.3)" }}>
                <Package size={48} className="mx-auto mb-4 opacity-30"/>
                <p className="text-lg font-bold">لا توجد سيارات</p>
              </div>
            )}
          </>
        )}

        {/* ── Prices tab ── */}
        {tab==="prices" && (
          <div className="rounded-2xl overflow-hidden" style={G.card}>
            <div className="p-4 border-b" style={{ borderColor:"rgba(201,167,74,0.1)" }}>
              <h3 className="font-black text-white mb-1">تعديل الأسعار السريع</h3>
              <p className="text-xs" style={{ color:"rgba(240,237,232,0.4)" }}>عدّل الأسعار مباشرة واضغط حفظ لكل سيارة</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["السيارة","اليومي (JOD)","الأسبوعي (JOD)","الشهري (JOD)",""].map(h=>(
                    <th key={h} className="px-4 py-3 text-start text-xs font-bold" style={{ color:"rgba(240,237,232,0.4)" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {cars.map(c => (
                    <PriceRow key={c.id} car={c} token={token} onUpdated={load} toast={toast}/>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
