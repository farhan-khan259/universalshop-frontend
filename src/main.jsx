import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
const SalesChart = React.lazy(() => import("./components/SalesChart.jsx"));
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  Truck,
  Users,
  Wallet,
  ChartNoAxesCombined,
  Settings as Cog,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Search,
  Menu,
  X,
  LogOut,
  ArrowRight,
  Barcode,
  Printer,
  Download,
  MoreHorizontal,
  Check,
  RefreshCw,
  Camera,
  History,
  Building2,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { api, money, date, key } from "./api";
import { translate } from "./locales";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20000, refetchOnWindowFocus: false },
  },
});
const Context = createContext();
const useApp = () => useContext(Context);
const useData = (path) =>
  useQuery({ queryKey: [path], queryFn: () => api(path) });
function useAction() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn, after) => {
      if (busy) return;
      setBusy(true);
      try {
        const r = await fn();
        await qc.invalidateQueries();
        notify("Saved successfully");
        after?.(r);
        return r;
      } catch (e) {
        notify(e.message, true);
      } finally {
        setBusy(false);
      }
    },
  };
}
const Button = ({ children, secondary = false, ...p }) => (
  <button className={secondary ? "button secondary" : "button"} {...p}>
    {children}
  </button>
);
function Modal({ title, onClose, children }) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children }) {
  const { t } = useApp();
  return (
    <label className="field">
      <span>{t(label)}</span>
      {children}
    </label>
  );
}
function Form({
  fields,
  initial = {},
  onSubmit,
  busy = false,
  submit = "Save",
  children,
}) {
  const { t } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initial });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        {fields.map((f) => (
          <Field key={f.name} label={f.label || f.name}>
            {f.options ? (
              <select {...register(f.name)}>
                {f.options.map((o) => (
                  <option key={o.value ?? o} value={o.value ?? o}>
                    {t(o.label ?? o)}
                  </option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input type="checkbox" {...register(f.name)} />
            ) : (
              <input
                type={f.type || "text"}
                step={f.type === "number" ? "0.001" : undefined}
                {...register(f.name, {
                  required: f.required ? "Required" : false,
                  ...(f.type === "number"
                    ? {
                        min: {
                          value: f.min ?? 0,
                          message: "Must be zero or more",
                        },
                      }
                    : {}),
                  ...(f.type === "password"
                    ? {
                        minLength: {
                          value: 12,
                          message: "At least 12 characters",
                        },
                      }
                    : {}),
                })}
              />
            )}{" "}
            {errors[f.name] && (
              <small className="error">{errors[f.name].message}</small>
            )}
          </Field>
        ))}
      </div>
      {children}
      <div className="form-footer">
        <Button disabled={busy} type="submit">
          {busy ? t("Loading…") : t(submit)}
          <Check size={16} />
        </Button>
      </div>
    </form>
  );
}
const f = (name, label, type, required = false, options) => ({
  name,
  label,
  type,
  required,
  options,
});
function Table({ rows, columns, empty = "No records yet" }) {
  const { t } = useApp();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{t(c.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i}>
              {columns.map((c) => (
                <td key={c.key} data-label={t(c.label)}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">
          <Package size={32} />
          <h3>{t(empty)}</h3>
          <p>Your saved records will appear here.</p>
        </div>
      )}
    </div>
  );
}
async function exportFile(rows, name = "Report", csv = false) {
  const clean = rows.map((r) =>
    Object.fromEntries(
      Object.entries(r).filter(
        ([k, v]) => !k.startsWith("_") && typeof v !== "object",
      ),
    ),
  );
  let bytes, mime;
  if (csv) {
    const headers = Object.keys(clean[0] || {});
    const escape = (v) =>
      '\"' + String(v ?? "").replaceAll('\"', '\"\"') + '\"';
    bytes =
      "\ufeff" +
      [
        headers,
        ...clean.map((r) =>
          headers.map((h) => {
            let v = r[h] ?? "";
            return typeof v === "string" && /^[=+@-]/.test(v) ? "'" + v : v;
          }),
        ),
      ]
        .map((row) => row.map(escape).join(","))
        .join("\r\n");
    mime = "text/csv;charset=utf-8";
  } else {
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    book.creator = "Ahmed Solutions";
    const sheet = book.addWorksheet("Records");
    const headers = Object.keys(clean[0] || {});
    sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
    clean.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2868E8" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    bytes = await book.xlsx.writeBuffer();
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name + (csv ? ".csv" : ".xlsx");
  a.click();
  URL.revokeObjectURL(url);
}
function PageTitle({
  eyebrow = "YOUR BUSINESS, AT A GLANCE",
  title,
  description,
  children,
}) {
  const { t } = useApp();
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{t(title)}</h1>
        <p>{description}</p>
      </div>
      <div className="title-actions">{children}</div>
    </div>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [tenant, setTenant] = useState(null),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState(null),
    [lang, setLang] = useState(localStorage.getItem("shop-language") || "en");
  const notify = (text, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 6000);
  };
  useEffect(() => {
    api("/me")
      .then((d) => {
        setUser(d.user);
        setTenant(d.tenant);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    localStorage.setItem("shop-language", lang);
  }, [lang]);
  const t = (x) => translate(lang, x);
  return (
    <Context.Provider
      value={{ user, setUser, tenant, setTenant, notify, t, lang, setLang }}
    >
      {loading ? (
        <div className="initial-loading">Loading Shop OS…</div>
      ) : !user ? (
        <Login />
      ) : user.role === "superadmin" ? (
        <Admin />
      ) : (
        <Shell />
      )}
      {toast && (
        <div role="alert" className={"toast " + (toast.error ? "bad" : "")}>
          <span>{toast.error ? "!" : "✓"}</span>
          {toast.text}
        </div>
      )}
    </Context.Provider>
  );
}
function Login() {
  const { setUser, setTenant, notify } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <div className="login-story">
        <div className="logo">
          <span>AS</span> Ahmed Solutions
        </div>
        <div>
          <div className="eyebrow">UNIVERSAL SHOP OS</div>
          <h1>
            A better day
            <br />
            for your business.
          </h1>
          <p>
            From your first sale to your last receipt.
            <br />
            Everything your shop needs, together.
          </p>
          <div className="login-features">
            ✓ Inventory that stays in sync
            <br />✓ Clear balances and useful reports
            <br />✓ Built for shops. Ready for growth.
          </div>
        </div>
        <small>Ahmed Solutions · Business made simpler</small>
      </div>
      <div className="login-panel">
        <div className="login-form">
          <div className="brand-chip">
            <ShoppingBag />
          </div>
          <h2>Welcome back.</h2>
          <p>Sign in to your shop workspace.</p>
          <Form
            fields={[
              f("email", "Email", "email", true),
              f("password", "Password", "password", true),
            ]}
            onSubmit={async (b) => {
              setBusy(true);
              try {
                await api("/auth/login", { method: "POST", body: b });
                const d = await api("/me");
                setUser(d.user);
                setTenant(d.tenant);
              } catch (e) {
                notify(e.message, true);
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
            submit="Sign in"
          />
          <div className="login-note">
            <ShieldCheck size={16} /> Your private, secure business workspace
          </div>
        </div>
      </div>
    </div>
  );
}
const navigation = [
  ["/", "Overview", LayoutDashboard, "reports"],
  ["/pos", "Point of sale", ShoppingBag, "sales"],
  ["/inventory", "Inventory", Package, "products"],
  ["/sales", "Sales", Receipt, "sales"],
  ["/purchases", "Purchases", Truck, "purchases"],
  ["/customers", "Customers", Users, "parties"],
  ["/suppliers", "Suppliers", Building2, "parties"],
  ["/payments", "Payments", Wallet, "payments"],
  ["/expenses", "Expenses", Receipt, "expenses"],
  ["/reports", "Reports", ChartNoAxesCombined, "reports"],
  ["/fbr", "FBR invoicing", ShieldCheck, "fbr"],
  ["/settings", "Settings", Cog, "settings"],
  ["/team", "Team", Users, "users"],
  ["/audit", "Audit log", Activity, "settings"],
];
function Shell() {
  const { user, tenant, t, lang, setLang, setUser } = useApp();
  const [open, setOpen] = useState(false);
  const allowed = (p) =>
    user.role === "owner" ||
    user.permissions.includes("*") ||
    user.permissions.includes(p);
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar show" : "sidebar"}>
        <div className="logo">
          <span>AS</span>
          <div>
            Ahmed Solutions<small>UNIVERSAL SHOP OS</small>
          </div>
        </div>
        <div className="workspace">
          <div className="workspace-icon">
            <ShoppingBag size={19} />
          </div>
          <div>
            <strong>{tenant?.name}</strong>
            <small>Shop workspace</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation
            .filter(
              (x) =>
                allowed(x[3]) || (x[1] === "Inventory" && allowed("sales")),
            )
            .map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {t(label)}
                {label === "Point of sale" && (
                  <span className="nav-key">POS</span>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <ShieldCheck size={21} />
            <strong>Your business. In order.</strong>
            <small>One workspace for every day.</small>
          </div>
          <button
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              client.clear();
              setUser(null);
            }}
          >
            <LogOut size={17} />
            {t("Sign out")}
          </button>
        </div>
      </aside>
      {open && <div className="drawer-shade" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="topbar-left">
            <span className="online-dot" />
            Workspace active<span className="topbar-separator">/</span>
            <span>{date(new Date())}</span>
          </div>
          <div className="topbar-right">
            <select
              aria-label="Interface language"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ur">اردو</option>
              <option value="roman">Roman Urdu</option>
            </select>
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="user-name">
              {user.name}
              <small>{user.role}</small>
            </div>
          </div>
        </header>
        <main className="content">
          <Routes>
            <Route
              path="/"
              element={allowed("reports") ? <Dashboard /> : <Trade />}
            />
            <Route path="/pos" element={<Trade />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Documents kind="sale" />} />
            <Route path="/purchases" element={<Documents kind="purchase" />} />
            <Route path="/purchase/new" element={<Trade purchase />} />
            <Route path="/customers" element={<Parties type="customer" />} />
            <Route path="/suppliers" element={<Parties type="supplier" />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/fbr" element={<Fbr />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/team" element={<Team />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/invoice/:id" element={<Invoice />} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </main>
        <footer className="app-footer">
          Ahmed Solutions · Universal Shop OS
          <span>Made for your everyday business.</span>
        </footer>
      </div>
    </div>
  );
}
function DateFilter({ range, setRange }) {
  const { t } = useApp();
  return (
    <div className="date-filter">
      <Field label="From">
        <input
          type="date"
          value={range.from}
          onChange={(e) => setRange({ ...range, from: e.target.value })}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          value={range.to}
          onChange={(e) => setRange({ ...range, to: e.target.value })}
        />
      </Field>
    </div>
  );
}
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const month = () => ({ from: today().slice(0, 7) + "-01", to: today() });
function Dashboard() {
  const { t, user } = useApp();
  const nav = useNavigate();
  const [range, setRange] = useState(month());
  const {
    data: d,
    isLoading,
    error,
  } = useData("/dashboard?" + new URLSearchParams(range));
  if (error) return <div className="notice">{error.message}</div>;
  return (
    <>
      <PageTitle
        title={"Good afternoon, " + user.name.split(" ")[0] + "."}
        description="Here's how your shop is doing. Let's make today count."
      >
        <Button onClick={() => nav("/pos")}>
          <Plus size={18} />
          {t("New sale")}
        </Button>
      </PageTitle>
      <div className="overview-heading">
        <h2>{t("Overview")}</h2>
        <DateFilter range={range} setRange={setRange} />
      </div>
      {isLoading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat skeleton" />
          ))}
        </div>
      ) : (
        d && (
          <>
            <div className="stats-grid">
              {[
                [
                  "Net sales",
                  d.sales,
                  Receipt,
                  "blue",
                  "Revenue, excluding sales tax",
                ],
                [
                  "Gross profit",
                  d.grossProfit,
                  TrendingUp,
                  "green",
                  "Sales less cost of goods",
                ],
                [
                  "Net profit",
                  d.netProfit,
                  ChartNoAxesCombined,
                  "violet",
                  "After expenses and stock losses",
                ],
                [
                  "Stock value",
                  d.stockValue,
                  Package,
                  "amber",
                  d.products + " active products",
                ],
              ].map(([label, value, Icon, color, note]) => (
                <section key={label} className="stat">
                  <div className="stat-top">
                    <span>{t(label)}</span>
                    <div className={"stat-icon " + color}>
                      <Icon size={19} />
                    </div>
                  </div>
                  <strong>{money(value)}</strong>
                  <small>{note}</small>
                </section>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel trend-panel">
                <div className="panel-title">
                  <div>
                    <h2>{t("Sales trend")}</h2>
                    <p>Net revenue over your selected period</p>
                  </div>
                  <span className="legend">
                    <i />
                    Net sales
                  </span>
                </div>
                <React.Suspense
                  fallback={
                    <div className="skeleton" style={{ height: 260 }} />
                  }
                >
                  <SalesChart data={d.trend} />
                </React.Suspense>
              </section>
              <section className="panel balances">
                <h2>Keep an eye on balances</h2>
                <p>Know what's coming in and going out.</p>
                {[
                  ["Receivables", d.receivables, "customers", "green"],
                  ["Payables", d.payables, "suppliers", "amber"],
                  ["Low stock", d.lowStock, "inventory", "blue"],
                ].map(([name, v, path, color]) => (
                  <button
                    key={name}
                    className="balance-row"
                    onClick={() => nav("/" + path)}
                  >
                    <span className={"stat-icon " + color}>
                      {name === "Low stock" ? (
                        <Package size={19} />
                      ) : (
                        <Wallet size={19} />
                      )}
                    </span>
                    <span>
                      <small>{t(name)}</small>
                      <strong>
                        {name === "Low stock" ? v + " products" : money(v)}
                      </strong>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
                <div className="balance-foot">
                  <span className="online-dot" />
                  Calculated from your saved records
                </div>
              </section>
            </div>
            <div className="quick-actions">
              {[
                ["Add product", "/inventory", Package],
                ["New purchase", "/purchase/new", Truck],
                ["Receive payment", "/payments", Wallet],
                ["Add expense", "/expenses", Receipt],
              ].map(([l, p, I]) => (
                <button key={l} onClick={() => nav(p)}>
                  <I size={18} />
                  {t(l)}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>{t("Recent activity")}</h2>
                  <p>Your latest sales, purchases and payments</p>
                </div>
                <Button secondary onClick={() => nav("/sales")}>
                  View sales
                  <ArrowUpRight size={15} />
                </Button>
              </div>
              <DocumentTable rows={d.recent} />
            </section>
          </>
        )
      )}
    </>
  );
}
function DocumentTable({ rows, onReturn, onReverse }) {
  const nav = useNavigate();
  const { t } = useApp();
  return (
    <Table
      rows={rows}
      columns={[
        {
          key: "number",
          label: "Reference",
          render: (r) => (
            <button
              className="text-button"
              onClick={() => nav("/invoice/" + r._id)}
            >
              {r.number}
            </button>
          ),
        },
        { key: "date", label: "Date", render: (r) => date(r.date) },
        {
          key: "kind",
          label: "Type",
          render: (r) => (
            <span
              className={
                "badge " +
                (r.kind === "sale"
                  ? "green"
                  : r.kind === "purchase"
                    ? "blue"
                    : "neutral")
              }
            >
              {r.kind}
            </span>
          ),
        },
        { key: "partyName", label: "Customer" },
        { key: "total", label: "Total", render: (r) => money(r.total) },
        { key: "paid", label: "Paid", render: (r) => money(r.paid) },
        {
          key: "actions",
          label: "Actions",
          render: (r) => (
            <div className="row-actions">
              <button
                aria-label="Print invoice"
                className="icon-btn"
                onClick={() => nav("/invoice/" + r._id)}
              >
                <Printer size={17} />
              </button>
              {onReturn && (
                <button className="text-button" onClick={() => onReturn(r)}>
                  {t("Return")}
                </button>
              )}
              {onReverse && !r.reversed && !r.original && (
                <button
                  className="text-button danger"
                  onClick={() => onReverse(r)}
                >
                  Reverse
                </button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
const productFields = [
  f("name", "Name", "text", true),
  f("sku", "SKU", "text", true),
  f("barcode", "Barcode"),
  f("category", "Category"),
  f("brand", "Brand"),
  f("unit", "Unit"),
  f("cost", "Purchase price", "number"),
  f("price", "Selling price", "number", true),
  f("wholesale", "Wholesale price", "number"),
  f("openingStock", "Opening stock", "number"),
  f("reorder", "Reorder level", "number"),
  f("taxRate", "Tax rate", "number"),
  f("taxInclusive", "Tax inclusive", "checkbox"),
  f("hsCode", "HS code"),
  f("saleType", "FBR sale type"),
  f("sroSchedule", "SRO schedule"),
  f("sroItem", "SRO item"),
  f("description", "Description"),
];
function Inventory() {
  const { t, notify } = useApp();
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [history, setHistory] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 220);
    return () => clearTimeout(id);
  }, [search]);
  const { data } = useData(
    "/products?q=" + encodeURIComponent(q) + "&page=" + page,
  );
  const { busy, run } = useAction();
  const [image, setImage] = useState("");
  return (
    <>
      <PageTitle
        title="Inventory"
        description="The right stock. The right price. All in one place."
        eyebrow="PRODUCTS & STOCK"
      >
        <Button secondary onClick={() => setModal({ type: "import" })}>
          <Download size={16} />
          {t("Import products")}
        </Button>
        <Button
          onClick={() => {
            setImage("");
            setModal({ type: "product" });
          }}
        >
          <Plus size={17} />
          {t("Add product")}
        </Button>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              placeholder={t("Search products")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="muted">{data?.total || 0} products</span>
        </div>
        <Table
          rows={data?.rows || []}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (r) => (
                <div className="product-name">
                  <div className="product-mini">
                    {r.image ? <img src={r.image} /> : <Package size={18} />}
                  </div>
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {r.sku} · {r.category || "Uncategorized"}
                    </small>
                  </div>
                </div>
              ),
            },
            { key: "barcode", label: "Barcode" },
            {
              key: "cost",
              label: "Cost",
              render: (r) => (r.cost !== undefined ? money(r.cost) : "—"),
            },
            { key: "price", label: "Price", render: (r) => money(r.price) },
            {
              key: "stock",
              label: "Stock",
              render: (r) => (
                <span
                  className={
                    "badge " + (r.stock <= r.reorder ? "amber" : "green")
                  }
                >
                  {r.stock} {r.unit}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="row-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setImage(r.image || "");
                      setModal({ type: "product", product: r });
                    }}
                  >
                    {t("Edit")}
                  </button>
                  <button
                    className="icon-btn"
                    title="Stock adjustment"
                    onClick={() => setModal({ type: "stock", product: r })}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Barcode label"
                    onClick={() => setModal({ type: "label", product: r })}
                  >
                    <Barcode size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    title="History"
                    onClick={async () =>
                      setHistory(await api("/products/" + r._id + "/history"))
                    }
                  >
                    <History size={16} />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Archive"
                    onClick={() =>
                      window.confirm("Archive " + r.name + "?") &&
                      run(() => api("/products/" + r._id, { method: "DELETE" }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
        <div className="pagination">
          <Button
            secondary
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>Page {page}</span>
          <Button
            secondary
            disabled={page * 50 >= (data?.total || 0)}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </section>
      {modal?.type === "product" && (
        <Modal
          title={t(modal.product ? "Edit" : "Add product")}
          onClose={() => setModal(null)}
        >
          <Form
            fields={
              modal.product
                ? productFields.filter(
                    (f) => !["cost", "openingStock"].includes(f.name),
                  )
                : productFields
            }
            initial={
              modal.product
                ? {
                    ...modal.product,
                    price: modal.product.price / 100,
                    cost: modal.product.cost / 100,
                    wholesale: modal.product.wholesale / 100,
                  }
                : { unit: "Pieces", reorder: 5, taxRate: 0 }
            }
            busy={busy}
            onSubmit={(b) =>
              run(
                () =>
                  api(
                    "/products" +
                      (modal.product ? "/" + modal.product._id : ""),
                    {
                      method: modal.product ? "PATCH" : "POST",
                      body: { ...b, image },
                    },
                  ),
                () => setModal(null),
              )
            }
          >
            <Field label="Product image">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 1e6)
                    return notify("Choose an image under 1 MB", true);
                  const reader = new FileReader();
                  reader.onload = () => setImage(reader.result);
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
          </Form>
        </Modal>
      )}
      {modal?.type === "stock" && (
        <Modal
          title={t("Stock adjustment") + " · " + modal.product.name}
          onClose={() => setModal(null)}
        >
          <Form
            fields={[
              { ...f("quantity", "Quantity", "number", true), min: -1e8 },
              f("reason", "Reason", "text", true),
            ]}
            busy={busy}
            onSubmit={(b) =>
              run(
                () =>
                  api("/adjustments", {
                    method: "POST",
                    body: { ...b, product: modal.product._id, key: key() },
                  }),
                () => setModal(null),
              )
            }
          />
        </Modal>
      )}
      {modal?.type === "import" && <Import onClose={() => setModal(null)} />}{" "}
      {modal?.type === "label" && (
        <Label product={modal.product} onClose={() => setModal(null)} />
      )}{" "}
      {history && (
        <Modal title="Stock movement history" onClose={() => setHistory(null)}>
          <Table
            rows={history}
            columns={[
              {
                key: "createdAt",
                label: "Date",
                render: (r) => date(r.createdAt),
              },
              { key: "reason", label: "Reason" },
              { key: "quantity", label: "Quantity" },
              { key: "after", label: "Balance" },
            ]}
          />
        </Modal>
      )}
    </>
  );
}
function Label({ product, onClose }) {
  const ref = useRef();
  const [width, setWidth] = useState(50);
  useEffect(() => {
    if (product.barcode)
      JsBarcode(ref.current, product.barcode, {
        format: "CODE128",
        width: 1.5,
        height: 45,
        fontSize: 12,
      });
  }, [product]);
  return (
    <Modal title="Barcode label" onClose={onClose}>
      <Field label="Label width (mm)">
        <input
          type="number"
          min="25"
          max="100"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
      </Field>
      <div className="print-area barcode-label" style={{ width: width + "mm" }}>
        <strong>{product.name}</strong>
        {product.barcode ? (
          <svg ref={ref} />
        ) : (
          <p>Add a barcode to this product first.</p>
        )}
        <div>{money(product.price)}</div>
      </div>
      <Button onClick={() => window.print()}>
        <Printer size={17} />
        Print label
      </Button>
    </Modal>
  );
}
function Import({ onClose }) {
  const { notify } = useApp();
  const { busy, run } = useAction();
  const [data, setData] = useState(null),
    [mapping, setMapping] = useState({}),
    [update, setUpdate] = useState(false),
    [result, setResult] = useState(null);
  const fields = [
    "name",
    "sku",
    "barcode",
    "category",
    "brand",
    "unit",
    "price",
    "cost",
    "openingStock",
    "reorder",
    "taxRate",
  ];
  return (
    <Modal title="Import products · CSV / Excel" onClose={onClose}>
      <p className="muted">
        Preview and map your columns before importing. Stock on existing
        products is never overwritten.
      </p>
      <Button
        secondary
        onClick={() =>
          exportFile(
            [
              {
                name: "Sample product",
                sku: "SKU-001",
                barcode: "8900000001",
                category: "General",
                price: 150,
                cost: 100,
                openingStock: 20,
                reorder: 5,
                taxRate: 0,
              },
            ],
            "Product-template",
            true,
          )
        }
      >
        Download sample CSV
      </Button>
      <Field label="File">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={async (e) => {
            try {
              const b = new FormData();
              b.append("file", e.target.files[0]);
              const d = await api("/import/preview", {
                method: "POST",
                body: b,
              });
              setData(d);
              setMapping(
                Object.fromEntries(
                  fields.map((f) => [
                    f,
                    d.columns.find(
                      (c) => c.toLowerCase() === f.toLowerCase(),
                    ) || "",
                  ]),
                ),
              );
            } catch (e) {
              notify(e.message, true);
            }
          }}
        />
      </Field>
      {data && (
        <>
          <p>{data.rows.length} rows found. First 5 shown below.</p>
          <div className="form-grid">
            {fields.map((f) => (
              <Field key={f} label={f}>
                <select
                  value={mapping[f]}
                  onChange={(e) =>
                    setMapping({ ...mapping, [f]: e.target.value })
                  }
                >
                  <option value="">Skip / default</option>
                  {data.columns.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <Table
            rows={data.rows.slice(0, 5)}
            columns={data.columns
              .slice(0, 4)
              .map((c) => ({ key: c, label: c }))}
          />
          <label className="checkline">
            <input
              type="checkbox"
              checked={update}
              onChange={(e) => setUpdate(e.target.checked)}
            />
            Update existing products by SKU
          </label>
          <Button
            disabled={busy || !mapping.name || !mapping.sku || !mapping.price}
            onClick={() =>
              run(
                () =>
                  api("/import", {
                    method: "POST",
                    body: {
                      rows: data.rows.map((r) =>
                        Object.fromEntries(
                          fields
                            .filter((f) => mapping[f])
                            .map((f) => [f, String(r[mapping[f]])]),
                        ),
                      ),
                      updateExisting: update,
                    },
                  }),
                setResult,
              )
            }
          >
            Import {data.rows.length} rows
          </Button>
        </>
      )}
      {result && (
        <div className="notice">
          {result.added} added · {result.updated} updated ·{" "}
          {result.errors.length} errors
          <Table
            rows={result.errors}
            columns={[
              { key: "row", label: "Row" },
              { key: "error", label: "Error" },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
const partyFields = [
  f("name", "Name", "text", true),
  f("phone", "Phone"),
  f("address", "Address"),
  f("email", "Email", "email"),
  f("ntn", "CNIC / NTN"),
  f("province", "Province"),
  f("registrationType", "Registration", "", false, [
    "Unregistered",
    "Registered",
  ]),
  f("openingBalance", "Opening balance", "number"),
  f("creditLimit", "Credit limit", "number"),
  f("notes", "Notes"),
];
function PartyModal({ type, party, onClose }) {
  const { t } = useApp();
  const { busy, run } = useAction();
  return (
    <Modal
      title={t(
        party ? "Edit" : type === "customer" ? "Add customer" : "Add supplier",
      )}
      onClose={onClose}
    >
      <Form
        fields={
          party
            ? partyFields.filter((f) => f.name !== "openingBalance")
            : partyFields
        }
        initial={
          party
            ? { ...party, creditLimit: party.creditLimit / 100 }
            : { registrationType: "Unregistered" }
        }
        busy={busy}
        onSubmit={(b) =>
          run(
            () =>
              api("/parties" + (party ? "/" + party._id : ""), {
                method: party ? "PATCH" : "POST",
                body: { ...b, type },
              }),
            onClose,
          )
        }
      />
    </Modal>
  );
}
function Parties({ type }) {
  const { t } = useApp();
  const { data } = useData("/parties?type=" + type);
  const [modal, setModal] = useState(null),
    [search, setSearch] = useState("");
  const nav = useNavigate();
  const { run } = useAction();
  return (
    <>
      <PageTitle
        title={type === "customer" ? "Customers" : "Suppliers"}
        description="Good relationships start with clear records."
        eyebrow="PEOPLE & BALANCES"
      >
        <Button onClick={() => setModal({})}>
          <Plus size={17} />
          {t(type === "customer" ? "Add customer" : "Add supplier")}
        </Button>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table
          rows={(data || []).filter((r) =>
            (r.name + " " + r.phone)
              .toLowerCase()
              .includes(search.toLowerCase()),
          )}
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "address", label: "Address" },
            {
              key: "balance",
              label: "Balance",
              render: (r) => <strong>{money(r.balance)}</strong>,
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="row-actions">
                  <button className="text-button" onClick={() => setModal(r)}>
                    {t("Edit")}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      nav("/reports?type=" + type + "&party=" + r._id)
                    }
                  >
                    Statement
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      window.confirm("Archive " + r.name + "?") &&
                      run(() => api("/parties/" + r._id, { method: "DELETE" }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
      {modal && (
        <PartyModal
          type={type}
          party={modal._id ? modal : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
function Trade({ purchase = false }) {
  const { t, tenant, notify } = useApp();
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [cart, setCart] = useState([]),
    [party, setParty] = useState(""),
    [payments, setPayments] = useState([]),
    [payAmount, setPayAmount] = useState(""),
    [account, setAccount] = useState("cash"),
    [discount, setDiscount] = useState(0),
    [newParty, setNewParty] = useState(false),
    [camera, setCamera] = useState(false);
  const requestKey = useRef(key());
  const { busy, run } = useAction();
  const nav = useNavigate();
  const { data: products } = useData(
    "/products?limit=200&q=" + encodeURIComponent(q),
  );
  const { data: parties } = useData(
    "/parties?type=" + (purchase ? "supplier" : "customer"),
  );
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 180);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("pos-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const add = (p) => {
    setCart((c) =>
      c.some((x) => x.product === p._id)
        ? c.map((x) =>
            x.product === p._id ? { ...x, quantity: x.quantity + 1 } : x,
          )
        : [
            ...c,
            {
              product: p._id,
              name: p.name,
              quantity: 1,
              rate: (purchase ? p.cost : p.price) / 100,
              discount: 0,
              taxRate: p.taxRate,
              taxInclusive: p.taxInclusive,
              stock: p.stock,
            },
          ],
    );
    setSearch("");
  };
  const update = (id, k, v) =>
    setCart(cart.map((x) => (x.product === id ? { ...x, [k]: Number(v) } : x)));
  const calc = (x) => {
    let gross = x.rate * x.quantity - x.discount;
    const net =
      x.taxInclusive && !purchase ? gross / (1 + x.taxRate / 100) : gross;
    return {
      net,
      tax: x.taxInclusive && !purchase ? gross - net : (net * x.taxRate) / 100,
    };
  };
  const subtotal = cart.reduce((s, x) => s + calc(x).net, 0);
  const lineTax = cart.reduce((s, x) => s + calc(x).tax, 0);
  const tax = subtotal ? lineTax * (1 - discount / subtotal) : 0,
    total = Math.max(0, subtotal - discount + tax);
  const paid = payments.reduce((s, x) => s + Number(x.amount), 0);
  const cats = [
    ...new Set((products?.rows || []).map((x) => x.category).filter(Boolean)),
  ];
  const holdKey = "held-sale-" + tenant?._id;
  return (
    <>
      <PageTitle
        title={purchase ? "New purchase" : "Point of sale"}
        description={
          purchase
            ? "Receive stock and keep supplier balances up to date."
            : "A simple checkout, from product to receipt."
        }
        eyebrow={purchase ? "PURCHASING" : "SELL WITH CONFIDENCE"}
      >
        {!purchase && (
          <>
            <Button
              secondary
              onClick={() => {
                localStorage.setItem(
                  holdKey,
                  JSON.stringify({
                    cart,
                    party,
                    payments,
                    discount,
                    key: requestKey.current,
                  }),
                );
                setCart([]);
                setPayments([]);
                requestKey.current = key();
                notify("Sale held on this device");
              }}
            >
              {t("Hold sale")}
            </Button>
            <Button
              secondary
              onClick={() => {
                const h = JSON.parse(localStorage.getItem(holdKey) || "null");
                if (h) {
                  setCart(h.cart);
                  setParty(h.party);
                  setPayments(h.payments);
                  setDiscount(h.discount);
                  requestKey.current = h.key;
                  localStorage.removeItem(holdKey);
                } else notify("No held sale");
              }}
            >
              {t("Resume sale")}
            </Button>
          </>
        )}
      </PageTitle>
      <div className="pos-layout">
        <section className="panel product-picker">
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                id="pos-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search products") + " · F2"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const exact = products?.rows.find(
                      (p) => p.barcode === search || p.sku === search,
                    );
                    if (exact) add(exact);
                    else if (products?.rows.length === 1) add(products.rows[0]);
                  }
                }}
              />
              <Barcode size={19} />
            </div>
            <button
              className="icon-btn"
              title="Scan camera"
              onClick={() => setCamera(true)}
            >
              <Camera size={19} />
            </button>
          </div>
          <div className="category-tabs">
            <button
              className={!category ? "selected" : ""}
              onClick={() => setCategory("")}
            >
              {t("All categories")}
            </button>
            {cats.map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {(products?.rows || [])
              .filter((p) => !category || p.category === category)
              .map((p) => (
                <button
                  className="product-card"
                  key={p._id}
                  onClick={() => add(p)}
                >
                  <div className="product-visual">
                    {p.image ? (
                      <img src={p.image} />
                    ) : (
                      <Package size={32} strokeWidth={1.3} />
                    )}
                    <span className="product-plus">
                      <Plus size={16} />
                    </span>
                  </div>
                  <small>{p.category || "General"}</small>
                  <strong>{p.name}</strong>
                  <div>
                    <b>{money(purchase ? p.cost : p.price)}</b>
                    <span className={p.stock <= p.reorder ? "low" : ""}>
                      {p.stock} in stock
                    </span>
                  </div>
                </button>
              ))}
          </div>
          {!products?.rows.length && (
            <div className="empty">
              No products found. Add products from Inventory.
            </div>
          )}
        </section>
        <section className="panel cart-panel">
          <div className="panel-title">
            <h2>
              {t("Cart")}
              <span className="count">{cart.length}</span>
            </h2>
            <ShoppingBag size={20} />
          </div>
          <Field label={purchase ? "Supplier" : "Customer"}>
            <div className="inline-field">
              <select value={party} onChange={(e) => setParty(e.target.value)}>
                <option value="">
                  {purchase ? "Select supplier" : t("Walk-in customer")}
                </option>
                {parties?.map((p) => (
                  <option value={p._id} key={p._id}>
                    {p.name} · {money(p.balance)}
                  </option>
                ))}
              </select>
              <button
                className="icon-btn"
                onClick={() => setNewParty(true)}
                aria-label="Add customer or supplier"
              >
                <Plus size={18} />
              </button>
            </div>
          </Field>
          <div className="cart-items">
            {!cart.length && (
              <div className="empty">
                <ShoppingBag size={32} />
                <h3>Your cart is ready</h3>
                <p>Select a product or scan a barcode.</p>
              </div>
            )}
            {cart.map((x) => (
              <div className="cart-item" key={x.product}>
                <div className="cart-item-head">
                  <strong>{x.name}</strong>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      setCart(cart.filter((a) => a.product !== x.product))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="cart-fields">
                  <Field label="Quantity">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={x.quantity}
                      onChange={(e) =>
                        update(x.product, "quantity", e.target.value)
                      }
                    />
                  </Field>
                  {purchase && (
                    <Field label="Cost">
                      <input
                        type="number"
                        min="0"
                        step=".01"
                        value={x.rate}
                        onChange={(e) =>
                          update(x.product, "rate", e.target.value)
                        }
                      />
                    </Field>
                  )}
                  <Field label="Discount">
                    <input
                      type="number"
                      min="0"
                      step=".01"
                      value={x.discount}
                      onChange={(e) =>
                        update(x.product, "discount", e.target.value)
                      }
                    />
                  </Field>
                  {purchase && (
                    <Field label="Tax rate">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={x.taxRate}
                        onChange={(e) =>
                          update(x.product, "taxRate", e.target.value)
                        }
                      />
                    </Field>
                  )}
                  <strong>
                    {money(Math.round((calc(x).net + calc(x).tax) * 100))}
                  </strong>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(Math.round(subtotal * 100))}</strong>
            </div>
            <div>
              <span>{t("Discount")}</span>
              <input
                type="number"
                min="0"
                step=".01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div>
              <span>{t("Tax")}</span>
              <strong>{money(Math.round(tax * 100))}</strong>
            </div>
            <div className="grand-total">
              <span>{t("Total")}</span>
              <strong>{money(Math.round(total * 100))}</strong>
            </div>
          </div>
          <div className="payment-entry">
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {["cash", "bank", "card"].map((a) => (
                <option key={a} value={a}>
                  {t(a[0].toUpperCase() + a.slice(1))}
                </option>
              ))}
            </select>
            <input
              aria-label="Payment amount"
              type="number"
              step=".01"
              placeholder="Payment amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <button
              className="icon-btn"
              title="Add payment"
              onClick={() => {
                if (Number(payAmount) > 0) {
                  setPayments([
                    ...payments,
                    { account, amount: Number(payAmount) },
                  ]);
                  setPayAmount("");
                }
              }}
            >
              <Plus size={19} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() =>
              setPayments([{ account, amount: Math.round(total * 100) / 100 }])
            }
          >
            Mark fully paid by {account}
          </button>
          {payments.map((p, i) => (
            <div className="payment-line" key={i}>
              {p.account} · {money(Math.round(p.amount * 100))}
              <button
                onClick={() => setPayments(payments.filter((_, j) => i !== j))}
                className="icon-btn"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="balance-due">
            <span>{t("Balance")}</span>
            <strong>{money(Math.round((total - paid) * 100))}</strong>
          </div>
          <Button
            disabled={
              busy ||
              !cart.length ||
              cart.some((x) => x.quantity <= 0) ||
              paid > Math.round(total * 100) / 100 + 0.01
            }
            onClick={() =>
              run(
                () =>
                  api(purchase ? "/purchases" : "/sales", {
                    method: "POST",
                    body: {
                      items: cart,
                      party: party || undefined,
                      payments,
                      discount,
                      key: requestKey.current,
                    },
                  }),
                (d) => {
                  requestKey.current = key();
                  setCart([]);
                  setPayments([]);
                  nav("/invoice/" + d._id);
                },
              )
            }
          >
            {busy
              ? t("Loading…")
              : t(purchase ? "Post purchase" : "Complete sale")}
            <ArrowRight size={17} />
          </Button>
          <small className="checkout-note">
            Final totals are verified by the server.
          </small>
        </section>
      </div>
      {newParty && (
        <PartyModal
          type={purchase ? "supplier" : "customer"}
          onClose={() => setNewParty(false)}
        />
      )}{" "}
      {camera && (
        <CameraScan
          onClose={() => setCamera(false)}
          onScan={async (code) => {
            const d = await api("/products?q=" + encodeURIComponent(code));
            const p = d.rows.find((x) => x.barcode === code);
            if (p) add(p);
            else notify("Barcode not found", true);
            setCamera(false);
          }}
        />
      )}
    </>
  );
}
function CameraScan({ onClose, onScan }) {
  const { notify } = useApp();
  useEffect(() => {
    let scanner;
    let disposed = false;
    import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (disposed) return;
      scanner = new Html5Qrcode("camera-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 120 } },
          (code) => onScan(code),
          () => {},
        );
      } catch (e) {
        notify(
          "Camera unavailable. Use a USB scanner or enter the barcode.",
          true,
        );
      }
    });
    return () => {
      disposed = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, []);
  return (
    <Modal title="Scan barcode" onClose={onClose}>
      <div id="camera-reader" />
    </Modal>
  );
}
function Documents({ kind }) {
  const { t } = useApp();
  const nav = useNavigate();
  const [page, setPage] = useState(1),
    [returnDoc, setReturnDoc] = useState(null);
  const { data } = useData("/documents?kind=" + kind + "&page=" + page);
  return (
    <>
      <PageTitle
        title={kind === "sale" ? "Sales" : "Purchases"}
        description="Every invoice, with a clear trail."
        eyebrow="TRANSACTION HISTORY"
      >
        <Button onClick={() => nav(kind === "sale" ? "/pos" : "/purchase/new")}>
          <Plus size={17} />
          {t(kind === "sale" ? "New sale" : "New purchase")}
        </Button>
      </PageTitle>
      <section className="panel">
        <DocumentTable rows={data?.rows || []} onReturn={setReturnDoc} />
        <div className="pagination">
          <Button
            secondary
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          Page {page}
          <Button
            secondary
            disabled={page * 50 >= (data?.total || 0)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>
      {returnDoc && (
        <ReturnModal document={returnDoc} onClose={() => setReturnDoc(null)} />
      )}
    </>
  );
}
function ReturnModal({ document: d, onClose }) {
  const [items, setItems] = useState(
      d.items.map((x) => ({ ...x, quantity: 0, restock: true })),
    ),
    [account, setAccount] = useState("cash");
  const { busy, run } = useAction();
  const nav = useNavigate();
  const requestKey = useRef(key());
  return (
    <Modal title={"Return · " + d.number} onClose={onClose}>
      <p className="muted">
        Outstanding balance is reduced first. Any remainder is refunded through
        the selected account.
      </p>
      {items.map((x, i) => (
        <div className="return-row" key={x.product}>
          <strong>
            {x.name}
            <small>
              {d.items[i].quantity - d.items[i].returned} available to return
            </small>
          </strong>
          <input
            aria-label={"Return quantity " + x.name}
            type="number"
            min="0"
            max={d.items[i].quantity - d.items[i].returned}
            value={x.quantity}
            onChange={(e) =>
              setItems(
                items.map((a, j) =>
                  j === i ? { ...a, quantity: Number(e.target.value) } : a,
                ),
              )
            }
          />
          {d.kind === "sale" && (
            <label>
              <input
                type="checkbox"
                checked={x.restock}
                onChange={(e) =>
                  setItems(
                    items.map((a, j) =>
                      j === i ? { ...a, restock: e.target.checked } : a,
                    ),
                  )
                }
              />
              Sellable / restock
            </label>
          )}
        </div>
      ))}
      <Field label="Refund account">
        <select value={account} onChange={(e) => setAccount(e.target.value)}>
          {["cash", "bank", "card"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Button
        disabled={busy || !items.some((x) => x.quantity > 0)}
        onClick={() =>
          run(
            () =>
              api("/returns", {
                method: "POST",
                body: {
                  original: d._id,
                  items: items
                    .filter((x) => x.quantity > 0)
                    .map((x) => ({
                      product: x.product,
                      quantity: x.quantity,
                      restock: x.restock,
                    })),
                  account,
                  key: requestKey.current,
                },
              }),
            (r) => {
              onClose();
              nav("/invoice/" + r._id);
            },
          )
        }
      >
        Post return
      </Button>
    </Modal>
  );
}
function Payments() {
  const { data: parties } = useData("/parties");
  const { data: documents } = useData("/documents?kind=payment");
  const { busy, run } = useAction();
  const nav = useNavigate();
  const requestKey = useRef(key());
  return (
    <>
      <PageTitle
        title="Payments"
        description="Receive from customers. Pay your suppliers."
        eyebrow="MONEY IN & OUT"
      />
      <div className="split-layout">
        <section className="panel padded">
          <h2>Record payment</h2>
          <Form
            fields={[
              f(
                "party",
                "Customer / supplier",
                "",
                true,
                (parties || []).map((p) => ({
                  value: p._id,
                  label: p.name + " · " + p.type + " · " + money(p.balance),
                })),
              ),
              f("amount", "Amount", "number", true),
              f("account", "Account", "", true, ["cash", "bank", "card"]),
              f("notes", "Notes"),
            ]}
            initial={{ account: "cash" }}
            busy={busy}
            onSubmit={(b) =>
              run(
                () =>
                  api("/payments", {
                    method: "POST",
                    body: { ...b, key: requestKey.current },
                  }),
                (d) => {
                  requestKey.current = key();
                  nav("/invoice/" + d._id);
                },
              )
            }
          />
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Payment history</h2>
          </div>
          <DocumentTable rows={documents?.rows || []} />
        </section>
      </div>
    </>
  );
}
function Expenses() {
  const { data } = useData("/documents?kind=expense");
  const [modal, setModal] = useState(false);
  const { busy, run } = useAction();
  const requestKey = useRef(key());
  return (
    <>
      <PageTitle
        title="Expenses"
        description="Every business cost, neatly accounted for."
        eyebrow="OPERATING COSTS"
      >
        <Button
          onClick={() => {
            requestKey.current = key();
            setModal(true);
          }}
        >
          <Plus size={17} />
          Add expense
        </Button>
      </PageTitle>
      <section className="panel">
        <DocumentTable
          rows={data?.rows || []}
          onReverse={(d) =>
            window.confirm("Reverse expense " + d.number + "?") &&
            run(() =>
              api("/expenses/reverse", {
                method: "POST",
                body: {
                  original: d._id,
                  key: key(),
                  reason: "User requested reversal",
                },
              }),
            )
          }
        />
      </section>
      {modal && (
        <Modal title="Add expense" onClose={() => setModal(false)}>
          <Form
            fields={[
              f("category", "Category", "", true, [
                "Rent",
                "Electricity",
                "Internet",
                "Salary",
                "Transport",
                "Maintenance",
                "Packaging",
                "Other",
              ]),
              f("amount", "Amount", "number", true),
              f("account", "Account", "", true, ["cash", "bank", "card"]),
              f("notes", "Notes"),
            ]}
            initial={{ account: "cash" }}
            busy={busy}
            onSubmit={(b) =>
              run(
                () =>
                  api("/expenses", {
                    method: "POST",
                    body: { ...b, key: requestKey.current },
                  }),
                () => setModal(false),
              )
            }
          />
        </Modal>
      )}
    </>
  );
}
const reports = [
  ["Sales", "sales"],
  ["Purchases", "purchases"],
  ["Sales returns", "sales-returns"],
  ["Purchase returns", "purchase-returns"],
  ["Stock", "stock"],
  ["Stock valuation", "valuation"],
  ["Low stock", "low-stock"],
  ["Out of stock", "out-of-stock"],
  ["Stock movement", "movements"],
  ["Profit & loss", "profit-loss"],
  ["Expenses", "expenses"],
  ["Cash ledger", "cash-ledger"],
  ["Bank ledger", "bank-ledger"],
  ["Customer ledger", "customer-ledger"],
  ["Supplier ledger", "supplier-ledger"],
  ["Customer outstanding", "customers"],
  ["Supplier outstanding", "suppliers"],
  ["Receivables aging", "receivables-aging"],
  ["Payables aging", "payables-aging"],
  ["Product sales", "product-sales"],
  ["Category sales", "category-sales"],
  ["Customer sales", "customer-sales"],
  ["User sales", "user-sales"],
  ["Payment methods", "payment-methods"],
  ["Slow-moving products", "slow-moving"],
  ["Fast-moving products", "fast-moving"],
  ["Product profitability", "profitability"],
];
const cashColumns = new Set([
  "total",
  "net",
  "tax",
  "paid",
  "cost",
  "price",
  "value",
  "balance",
  "amount",
  "debit",
  "credit",
  "profit",
  "current",
  "days31to60",
  "days61to90",
  "over90",
]);
function Reports() {
  const { tenant, t } = useApp();
  const params = new URLSearchParams(window.location.search);
  const [type, setType] = useState(
    params.get("type") === "customer"
      ? "customer-ledger"
      : params.get("type") === "supplier"
        ? "supplier-ledger"
        : params.get("type") || "profit-loss",
  );
  const [party, setParty] = useState(params.get("party") || ""),
    [range, setRange] = useState(month());
  const { data, error } = useData(
    "/reports/" +
      type +
      "?" +
      new URLSearchParams({ ...range, ...(party ? { party } : {}) }),
  );
  const { data: parties } = useData("/parties");
  const rows = data?.rows || [];
  const visible = {
    sales: ["number", "date", "partyName", "net", "tax", "total", "paid"],
    purchases: ["number", "date", "partyName", "net", "tax", "total", "paid"],
    stock: ["name", "sku", "category", "stock", "unit", "price"],
    valuation: ["name", "stock", "cost", "value"],
    "profit-loss": ["name", "amount"],
    movements: [
      "createdAt",
      "product",
      "quantity",
      "before",
      "after",
      "reason",
    ],
  };
  const fields =
    visible[type] ||
    (rows[0]
      ? Object.keys(rows[0])
          .filter(
            (k) =>
              !k.startsWith("_") &&
              ![
                "tenant",
                "createdBy",
                "updatedAt",
                "payments",
                "items",
                "key",
                "original",
                "notes",
                "priceHistory",
                "image",
                "description",
                "active",
                "creditLimit",
                "registrationType",
                "reversed",
                "fbrStatus",
                "openingStock",
              ].includes(k) &&
              typeof rows[0][k] !== "object",
          )
          .slice(0, 8)
      : ["name", "amount"]);
  const reportName = reports.find((r) => r[1] === type)?.[0] || "Report";
  const exportRows = rows.map((r) =>
    Object.fromEntries(
      fields.map((k) => [
        k,
        cashColumns.has(k)
          ? (r[k] || 0) / 100
          : k === "date" || k === "createdAt"
            ? date(r[k])
            : k === "product"
              ? r.product?.name
              : r[k],
      ]),
    ),
  );
  return (
    <>
      <PageTitle
        title="Reports"
        description="Clear numbers. Confident decisions."
        eyebrow="YOUR REPORTS CENTER"
      />
      <section className="panel padded">
        <div className="report-controls">
          <Field label="Report">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setParty("");
              }}
            >
              {reports.map(([name, id]) => (
                <option key={id} value={id}>
                  {t(name)}
                </option>
              ))}
            </select>
          </Field>
          <DateFilter range={range} setRange={setRange} />
          {type.includes("ledger") && (
            <Field label="Customer / supplier">
              <select value={party} onChange={(e) => setParty(e.target.value)}>
                <option value="">All accounts</option>
                {parties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="report-buttons">
            <Button
              secondary
              onClick={() => exportFile(exportRows, reportName)}
            >
              <Download size={16} />
              {t("Export Excel")}
            </Button>
            <Button
              secondary
              onClick={() => exportFile(exportRows, reportName, true)}
            >
              CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              {t("Print")} / PDF
            </Button>
          </div>
        </div>
      </section>
      {error && <div className="notice">{error.message}</div>}
      <section className="panel print-area report-sheet">
        <div className="report-heading">
          <div className="eyebrow">{tenant.name}</div>
          <h2>{t(reportName)}</h2>
          <p>
            {range.from} — {range.to} · Currency: PKR
          </p>
          {data?.opening !== undefined && (
            <p>
              Opening: {money(data.opening)} · Closing: {money(data.closing)}
            </p>
          )}
        </div>
        <Table
          rows={rows}
          columns={fields.map((k) => ({
            key: k,
            label: k.replace(/([A-Z])/g, " $1"),
            render: (r) =>
              cashColumns.has(k)
                ? money(r[k])
                : k === "date" || k === "createdAt"
                  ? date(r[k])
                  : k === "product"
                    ? r.product?.name || "—"
                    : (r[k] ?? "—"),
          }))}
        />
        <div className="report-foot">
          {rows.length} records · Generated {date(new Date())} · Ahmed Solutions
        </div>
      </section>
    </>
  );
}
function Invoice() {
  const { id } = useParams();
  const { data, error } = useData("/documents/" + id);
  const [size, setSize] = useState("A4"),
    [qr, setQr] = useState(null);
  useEffect(() => {
    if (data) {
      setSize(data.tenant.settings.receiptSize || "A4");
      if (data.fbr?.status === "Accepted")
        QRCode.toDataURL(data.fbr.invoiceNumber).then(setQr);
    }
  }, [data]);
  if (error) return <div className="notice">{error.message}</div>;
  if (!data) return <div>Loading invoice…</div>;
  const { document: d, tenant: t, fbr } = data;
  return (
    <>
      <PageTitle
        title="Invoice & receipt"
        description="Ready to print or save as a PDF."
        eyebrow="SAVED SUCCESSFULLY"
      >
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          {["A4", "80mm", "58mm"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button onClick={() => window.print()}>
          <Printer size={17} />
          Print / Save PDF
        </Button>
      </PageTitle>
      <style>{`@media print { @page {size: ${size === "A4" ? "A4" : size + " auto"};margin:${size === "A4" ? "12mm" : "2mm"};} }`}</style>
      <article
        className={"invoice print-area " + (size === "A4" ? "a4" : "thermal")}
        style={size === "A4" ? {} : { width: size }}
      >
        <div className="invoice-header">
          <div>
            {t.settings.logo && (
              <img src={t.settings.logo} className="invoice-logo" />
            )}
            <div className="eyebrow">
              {d.kind.toUpperCase().replace("-", " ")}
            </div>
            <h2>{t.name}</h2>
            <p>
              {t.settings.address}
              <br />
              {t.settings.phone}
            </p>
            {t.settings.ntn && (
              <small>
                NTN: {t.settings.ntn} · STRN: {t.settings.strn}
              </small>
            )}
          </div>
          <div className="invoice-meta">
            <strong>{d.number}</strong>
            <p>
              {date(d.date)}
              <br />
              {new Date(d.date).toLocaleTimeString("en-PK", {
                timeZone: "Asia/Karachi",
              })}
            </p>
            <span className="badge green">Posted</span>
          </div>
        </div>
        <div className="invoice-party">
          <small>BILL TO / ACCOUNT</small>
          <strong>{d.partyName || d.category || "Business record"}</strong>
          <p>{d.notes}</p>
        </div>
        {d.items?.length > 0 ? (
          <Table
            rows={d.items}
            columns={[
              { key: "name", label: "Description" },
              { key: "quantity", label: "Quantity" },
              { key: "rate", label: "Price", render: (r) => money(r.rate) },
              { key: "total", label: "Total", render: (r) => money(r.total) },
            ]}
          />
        ) : (
          <div className="voucher-line">
            {d.category || d.kind}
            <strong>{money(d.total)}</strong>
          </div>
        )}
        <div className="invoice-totals">
          <div>
            <span>Net amount</span>
            <b>{money(d.net || d.total)}</b>
          </div>
          <div>
            <span>Tax</span>
            <b>{money(d.tax)}</b>
          </div>
          <div className="grand-total">
            <span>Total</span>
            <b>{money(d.total)}</b>
          </div>
          <div>
            <span>Paid / refunded</span>
            <b>{money(d.paid)}</b>
          </div>
          <div>
            <span>Invoice balance</span>
            <b>
              {money(
                ["sale", "purchase"].includes(d.kind) ? d.total - d.paid : 0,
              )}
            </b>
          </div>
        </div>
        {fbr?.status === "Accepted" ? (
          <div className="fbr-print">
            <img src={qr || ""} />
            <strong>
              FBR {fbr.environment === "sandbox" ? "SANDBOX · " : ""}
              {fbr.invoiceNumber}
            </strong>
          </div>
        ) : (
          d.kind === "sale" &&
          t.settings.fbrEnabled && (
            <div className="notice">
              FBR status: {d.fbrStatus} · This invoice has no confirmed FBR
              acceptance.
            </div>
          )
        )}
        <div className="invoice-footer">
          {t.settings.footer || "Thank you for shopping with us."}
          <small>Powered by Ahmed Solutions</small>
        </div>
      </article>
    </>
  );
}
function Settings() {
  const { setTenant, notify } = useApp();
  const { data } = useData("/settings");
  const { busy, run } = useAction();
  const [password, setPassword] = useState(false),
    [opening, setOpening] = useState(false);
  if (!data) return <div>Loading settings…</div>;
  return (
    <>
      <PageTitle
        title="Business settings"
        description="Make this workspace feel like your shop."
        eyebrow="SET UP YOUR BUSINESS"
      />
      <section className="panel padded settings-form">
        <Form
          key={JSON.stringify(data)}
          fields={[
            f("name", "Business name", "text", true),
            f("phone", "Phone"),
            f("address", "Address"),
            f("ntn", "NTN"),
            f("strn", "STRN"),
            f("invoicePrefix", "Invoice prefix", "text", true),
            f("receiptSize", "Receipt size", "", true, ["A4", "80mm", "58mm"]),
            f("footer", "Footer message"),
            f("negativeStock", "Allow negative stock", "checkbox"),
            f("creditSales", "Enable credit sales", "checkbox"),
            f("discounts", "Enable discounts", "checkbox"),
          ]}
          initial={data}
          busy={busy}
          submit="Save changes"
          onSubmit={(b) =>
            run(
              () => api("/settings", { method: "PATCH", body: b }),
              async () => {
                const d = await api("/me");
                setTenant(d.tenant);
              },
            )
          }
        />
      </section>
      <section className="panel padded settings-tools">
        <h2>Accounts & data</h2>
        <div className="title-actions">
          <Button secondary onClick={() => setOpening(true)}>
            Opening cash / bank
          </Button>
          <Button secondary onClick={() => setPassword(true)}>
            Change password
          </Button>
          <Button
            secondary
            onClick={async () => {
              const d = await api("/backup");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([JSON.stringify(d, null, 2)], {
                  type: "application/json",
                }),
              );
              a.download = "shop-backup.json";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download business backup
          </Button>
        </div>
        <p className="muted">
          This export is a tenant data archive. Full database restore
          instructions are included in the source package.
        </p>
      </section>
      {opening && (
        <Modal title="Opening cash / bank" onClose={() => setOpening(false)}>
          <Form
            fields={[
              f("cash", "Cash", "number", true),
              f("bank", "Bank", "number", true),
            ]}
            busy={busy}
            onSubmit={(b) =>
              run(
                () =>
                  api("/accounts/opening", {
                    method: "POST",
                    body: { ...b, key: key() },
                  }),
                () => setOpening(false),
              )
            }
          />
        </Modal>
      )}
      {password && (
        <Modal title="Change password" onClose={() => setPassword(false)}>
          <Form
            fields={[
              f("current", "Current password", "password", true),
              f("password", "New password", "password", true),
            ]}
            onSubmit={(b) =>
              run(
                () => api("/auth/password", { method: "POST", body: b }),
                () => setPassword(false),
              )
            }
          />
        </Modal>
      )}
    </>
  );
}
function Team() {
  const { data } = useData("/users");
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null);
  const { busy, run } = useAction();
  const permissions = [
    "products",
    "parties",
    "sales",
    "purchases",
    "payments",
    "expenses",
    "reports",
    "returns",
    "stock",
    "fbr",
  ];
  return (
    <>
      <PageTitle
        title="Team"
        description="The right access for every member of your shop."
        eyebrow="PEOPLE & PERMISSIONS"
      >
        <Button onClick={() => setModal(true)}>
          <Plus size={17} />
          Add team member
        </Button>
      </PageTitle>
      <section className="panel">
        <Table
          rows={data || []}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            {
              key: "active",
              label: "Status",
              render: (r) => (
                <span className={"badge " + (r.active ? "green" : "amber")}>
                  {r.active ? "Active" : "Disabled"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) =>
                r.role !== "owner" && (
                  <div className="row-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        setEditing({ ...r, permissions: r.permissions || [] })
                      }
                    >
                      Permissions
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        run(() =>
                          api("/users/" + r._id, {
                            method: "PATCH",
                            body: { active: !r.active },
                          }),
                        )
                      }
                    >
                      {r.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                ),
            },
          ]}
        />
      </section>
      {modal && (
        <Modal title="Add team member" onClose={() => setModal(false)}>
          <Form
            fields={[
              f("name", "Name", "text", true),
              f("email", "Email", "email", true),
              f("password", "Password", "password", true),
              f("role", "Role", "", true, [
                "manager",
                "cashier",
                "inventory",
                "accountant",
              ]),
            ]}
            busy={busy}
            onSubmit={(b) =>
              run(
                () => api("/users", { method: "POST", body: b }),
                () => setModal(false),
              )
            }
          />
        </Modal>
      )}
      {editing && (
        <Modal title="Configure permissions" onClose={() => setEditing(null)}>
          {permissions.map((p) => (
            <label className="checkline" key={p}>
              <input
                type="checkbox"
                checked={editing.permissions.includes(p)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    permissions: e.target.checked
                      ? [...editing.permissions, p]
                      : editing.permissions.filter((x) => x !== p),
                  })
                }
              />
              {p}
            </label>
          ))}
          <Button
            onClick={() =>
              run(
                () =>
                  api("/users/" + editing._id, {
                    method: "PATCH",
                    body: { permissions: editing.permissions },
                  }),
                () => setEditing(null),
              )
            }
          >
            Save permissions
          </Button>
        </Modal>
      )}
    </>
  );
}
function Audit() {
  const { data } = useData("/audit");
  return (
    <>
      <PageTitle
        title="Audit log"
        description="A clear record of important workspace changes."
      />
      <section className="panel">
        <Table
          rows={data || []}
          columns={[
            {
              key: "createdAt",
              label: "Date",
              render: (r) => date(r.createdAt),
            },
            { key: "action", label: "Action" },
            { key: "entity", label: "Reference" },
          ]}
        />
      </section>
    </>
  );
}
function Fbr() {
  const { data: config } = useData("/fbr/config");
  const { data: jobs } = useData("/fbr/submissions");
  const { data: docs } = useData("/documents?kind=sale");
  const { busy, run } = useAction();
  const [modal, setModal] = useState(false),
    [response, setResponse] = useState(null);
  return (
    <>
      <PageTitle
        title="FBR invoicing"
        description="Real submission records. Clear status for every invoice."
        eyebrow="DIGITAL INVOICING"
      >
        <Button secondary onClick={() => setModal(true)}>
          <Cog size={17} />
          Configure FBR
        </Button>
      </PageTitle>
      <div className={"notice " + (config?.enabled ? "" : "amber-notice")}>
        <ShieldCheck size={20} />
        <div>
          <strong>
            {config?.enabled
              ? "FBR " + config.environment + " enabled"
              : "Pending activation"}
          </strong>
          <p>
            {config?.enabled
              ? "Acceptance appears only after a valid gateway response."
              : "Add authorized credentials and validate your business mappings before submitting invoices."}
          </p>
        </div>
      </div>
      <section className="panel">
        <Table
          rows={jobs || []}
          columns={[
            {
              key: "document",
              label: "Invoice",
              render: (r) => r.document?.number,
            },
            { key: "environment", label: "Environment" },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span
                  className={
                    "badge " + (r.status === "Accepted" ? "green" : "amber")
                  }
                >
                  {r.status}
                </span>
              ),
            },
            { key: "invoiceNumber", label: "FBR reference" },
            { key: "error", label: "Details" },
            {
              key: "actions",
              label: "Actions",
              render: (r) =>
                r.status === "Retry Required" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      const reason = prompt(
                        "After confirming with the integrator that FBR did NOT receive this invoice, enter their confirmation reference.",
                      );
                      if (reason)
                        run(() =>
                          api("/fbr/" + r.document._id + "/reconcile", {
                            method: "POST",
                            body: { confirmedNotReceived: true, reason },
                          }),
                        );
                    }}
                  >
                    Reconcile
                  </button>
                ),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>Sales available for validation / submission</h2>
        </div>
        <Table
          rows={docs?.rows || []}
          columns={[
            { key: "number", label: "Reference" },
            { key: "total", label: "Total", render: (r) => money(r.total) },
            { key: "fbrStatus", label: "Status" },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="row-actions">
                  <button
                    className="text-button"
                    onClick={() =>
                      run(
                        () =>
                          api("/fbr/" + r._id + "/validate", {
                            method: "POST",
                          }),
                        setResponse,
                      )
                    }
                  >
                    Validate
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      window.confirm(
                        "Submit " +
                          r.number +
                          " to FBR " +
                          config?.environment +
                          "?",
                      ) &&
                      run(
                        () =>
                          api("/fbr/" + r._id + "/submit", { method: "POST" }),
                        setResponse,
                      )
                    }
                  >
                    Submit
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
      {modal && (
        <Modal title="FBR configuration" onClose={() => setModal(false)}>
          <Form
            fields={[
              f("enabled", "Enable FBR", "checkbox"),
              f("environment", "Environment", "", true, [
                "sandbox",
                "production",
              ]),
              f("businessName", "Business name", "text", true),
              f("ntn", "NTN", "text", true),
              f("province", "Province", "text", true),
              f("address", "Address", "text", true),
              f("token", "Authorized API token"),
              f("scenarioId", "Sandbox scenario ID"),
            ]}
            initial={{ ...config, token: "" }}
            busy={busy}
            onSubmit={(b) =>
              run(
                () => api("/fbr/config", { method: "PATCH", body: b }),
                () => setModal(false),
              )
            }
          />
        </Modal>
      )}
      {response && (
        <Modal title="Gateway response" onClose={() => setResponse(null)}>
          <pre className="json-response">
            {JSON.stringify(response, null, 2)}
          </pre>
        </Modal>
      )}
    </>
  );
}
function Admin() {
  const { setUser, notify } = useApp();
  const { data } = useData("/admin/shops");
  const [modal, setModal] = useState(null);
  const { busy, run } = useAction();
  return (
    <div className="admin">
      <header className="topbar">
        <div className="logo">
          <span>AS</span>Ahmed Solutions · Provider console
        </div>
        <Button
          secondary
          onClick={async () => {
            await api("/auth/logout", { method: "POST" });
            client.clear();
            setUser(null);
          }}
        >
          Sign out
        </Button>
      </header>
      <main className="content">
        <PageTitle
          title="Your shop network"
          description="Manage subscriptions and access, from one secure console."
          eyebrow="AHMED SOLUTIONS · SUPER ADMIN"
        >
          <Button onClick={() => setModal({ new: true })}>
            <Plus size={17} />
            Create shop
          </Button>
        </PageTitle>
        <div className="stats-grid">
          {[
            ["Total shops", data?.length || 0],
            [
              "Active shops",
              data?.filter((x) => x.status === "active").length || 0,
            ],
            [
              "Suspended",
              data?.filter((x) => x.status === "suspended").length || 0,
            ],
            ["Team seats", data?.reduce((s, x) => s + x.users, 0) || 0],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <Table
            rows={data || []}
            columns={[
              { key: "name", label: "Shop" },
              { key: "owner", label: "Owner", render: (r) => r.owner?.email },
              { key: "plan", label: "Plan" },
              {
                key: "expires",
                label: "Expiry",
                render: (r) => date(r.expires),
              },
              { key: "users", label: "Users" },
              { key: "products", label: "Products" },
              {
                key: "status",
                label: "Status",
                render: (r) => (
                  <span
                    className={
                      "badge " + (r.status === "active" ? "green" : "amber")
                    }
                  >
                    {r.status}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <div className="row-actions">
                    <button className="text-button" onClick={() => setModal(r)}>
                      Manage
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        run(() =>
                          api("/admin/shops/" + r._id, {
                            method: "PATCH",
                            body: {
                              status:
                                r.status === "active" ? "suspended" : "active",
                            },
                          }),
                        )
                      }
                    >
                      {r.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        const password = prompt(
                          "Enter new owner password (at least 12 characters).",
                        );
                        if (password)
                          run(() =>
                            api("/admin/shops/" + r._id + "/reset", {
                              method: "POST",
                              body: { password },
                            }),
                          );
                      }}
                    >
                      Reset access
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </section>
        {modal && (
          <Modal
            title={modal.new ? "Create shop" : "Manage subscription"}
            onClose={() => setModal(null)}
          >
            <Form
              fields={
                modal.new
                  ? [
                      f("name", "Business name", "text", true),
                      f("owner", "Owner name", "text", true),
                      f("email", "Owner email", "email", true),
                      f("password", "Initial password", "password", true),
                      f("plan", "Plan", "text", true),
                      f("expires", "Expiry", "date", true),
                      f("userLimit", "User limit", "number", true),
                    ]
                  : [
                      f("plan", "Plan", "text", true),
                      f("expires", "Expiry", "date", true),
                      f("userLimit", "User limit", "number", true),
                      f("status", "Status", "", true, ["active", "suspended"]),
                    ]
              }
              initial={
                modal.new
                  ? {
                      plan: "Standard",
                      userLimit: 5,
                      expires: new Date(Date.now() + 30 * 86400000)
                        .toISOString()
                        .slice(0, 10),
                    }
                  : { ...modal, expires: modal.expires?.slice(0, 10) }
              }
              busy={busy}
              onSubmit={(b) =>
                run(
                  () =>
                    api("/admin/shops" + (modal.new ? "" : "/" + modal._id), {
                      method: modal.new ? "POST" : "PATCH",
                      body: b,
                    }),
                  () => setModal(null),
                )
              }
            />
          </Modal>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
