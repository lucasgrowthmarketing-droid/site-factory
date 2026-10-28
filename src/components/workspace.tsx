"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  Bell,
  House,
  Monitor,
  Copy,
  ExternalLink,
  Globe,
  Layers3,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Scissors,
  KanbanSquare,
  Upload,
  PanelLeftClose,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  loadDatabase,
  localWrite,
  saveRecord,
  saveLeads,
  saveCsvImport,
  createPreview,
} from "@/lib/repository";
import {
  stages,
  verifications,
  newLead,
  duplicate,
  importCsv,
  defaultConfig,
  seed,
  templateFor,
  isMapsUrl,
  configSchema,
  type Lead,
  type Preview,
  type Database,
  type SiteConfig,
} from "@/lib/domain";
import Barber from "./barber";
import Acquisition from "./acquisition";
import Dashboard, { ActivityList } from "./dashboard";
import { activityFeed } from "@/lib/dashboard";
const nav = [
  ["Dashboard", House],
  ["Leads", Users],
  ["Vitrines", Globe],
  ["Pipeline Comercial", KanbanSquare],
  ["Templates", Layers3],
  ["Configurações", Settings2],
] as const;
const empty: Database = { leads: [], previews: [], activities: [] };
const date = (s: string) => new Date(s).toLocaleDateString("pt-BR");
export default function Workspace() {
  const [user, setUser] = useState<string | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(true),
    [db, setDb] = useState<Database>(empty),
    [tab, setTab] = useState("Dashboard"),
    [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [stage, setStage] = useState(""),
    [verification, setVerification] = useState(""),
    [category, setCategory] = useState(""),
    [rating, setRating] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [leadModal, setLeadModal] = useState<Lead | null>(null),
    [editor, setEditor] = useState<Preview | null>(null),
    [showPreview, setShowPreview] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [note, setNote] = useState(""),
    [menu, setMenu] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [globalQuery, setGlobalQuery] = useState(""),
    [activitiesOpen, setActivitiesOpen] = useState(false);
  const [activityNow] = useState(() => Date.now());
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const file = useRef<HTMLInputElement>(null);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!supabase) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    const client = supabase;
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user.id ?? null);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user.id ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) return;
    const refresh = () =>
      loadDatabase()
        .then(setDb)
        .catch((e) => notify(e.message));
    void refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  function commit(next: Database) {
    if (!supabase) localWrite(next);
    setDb(next);
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (!supabase)
        throw new Error(
          "Supabase ainda não configurado. Utilize o ambiente de teste.",
        );
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    });
  }
  async function saveLead(lead: Lead) {
    if (!lead.name.trim()) throw new Error("Informe o nome da empresa.");
    if (lead.logoUrl && !/^https:\/\//.test(lead.logoUrl))
      throw new Error("Use uma URL HTTPS para a logo.");
    if (lead.mapsUrl && !isMapsUrl(lead.mapsUrl))
      throw new Error("Use um link do Google Maps.");
    if (db.leads.some((l) => l.id !== lead.id && duplicate(l, lead)))
      throw new Error(
        "Esta empresa já existe: nome/cidade, telefone ou identificador duplicado.",
      );
    await saveRecord("lead", lead, user!);
    commit({
      ...db,
      leads: [lead, ...db.leads.filter((l) => l.id !== lead.id)],
    });
    setLeadModal(null);
    notify("Lead salvo com sucesso.");
  }
  async function updateStage(leads: Lead[], nextStage: Lead["stage"]) {
    const updates = leads.map((l) => ({ ...l, stage: nextStage }));
    await saveLeads(updates, user!);
    commit({
      ...db,
      leads: db.leads.map((l) => updates.find((u) => u.id === l.id) || l),
    });
    setSelected([]);
    notify("Etapa comercial atualizada.");
  }
  async function generate(lead: Lead) {
    if (!templateFor(lead.category))
      throw new Error(
        "Escolha uma categoria de barbearia ou oficina mecânica.",
      );
    if (lead.stage !== "Qualificado")
      throw new Error("Qualifique o lead antes de gerar a demonstração.");
    const existing = db.previews.find((p) => p.leadId === lead.id);
    if (existing) {
      setEditor(existing);
      return;
    }
    const p: Preview = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      token:
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", ""),
      active: true,
      createdAt: new Date().toISOString(),
      config: defaultConfig(lead),
    };
    const updated = { ...lead, stage: "Demonstração criada" as const };
    await createPreview(p, updated);
    commit({
      ...db,
      previews: [p, ...db.previews],
      leads: db.leads.map((l) => (l.id === lead.id ? updated : l)),
    });
    setLeadModal(null);
    setEditor(p);
    notify("Vitrine criada. Nenhuma chamada de IA, nenhum novo deploy.");
  }
  async function savePreview(p: Preview) {
    p = {
      ...p,
      config: configSchema.parse({
        ...p.config,
        services: p.config.services.map((s) => s.trim()).filter(Boolean),
      }),
    };
    await saveRecord("preview", p, user!);
    commit({
      ...db,
      previews: db.previews.map((v) => (v.id === p.id ? p : v)),
    });
    notify("Vitrine atualizada.");
  }
  async function handleCsv(f: File) {
    await run(async () => {
      if (f.size > 2_000_000) throw new Error("O arquivo deve ter até 2 MB.");
      let importLimit = 500;
      if (supabase) {
        const { data, error } = await supabase
          .from("app_settings")
          .select("import_limit")
          .eq("owner_id", user!)
          .maybeSingle();
        if (error) throw error;
        importLimit = data?.import_limit ?? 500;
      }
      const r = importCsv(await f.text(), db.leads, importLimit);
      await saveCsvImport(r.leads, user!, r.invalid, r.skipped);
      commit({ ...db, leads: [...r.leads, ...db.leads] });
      setImportOpen(false);
      notify(
        `${r.leads.length} importados · ${r.skipped} duplicados ignorados · ${r.invalid} inválidos.`,
      );
    });
  }
  function downloadExample() {
    const a = document.createElement("a");
    a.href = "/exemplo-leads.csv";
    a.download = "exemplo-leads.csv";
    a.click();
  }
  const filtered = db.leads.filter(
    (l) =>
      (!search ||
        `${l.name} ${l.city} ${l.phone}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!city || l.city === city) &&
      (!stage || l.stage === stage) &&
      (!verification || l.verification === verification) &&
      (!category || l.category === category) &&
      (!rating || (l.rating !== null && l.rating >= Number(rating))),
  );
  const feed = activityFeed(db);
  const query = globalQuery.trim().toLocaleLowerCase("pt-BR");
  const searchLeads = db.leads
    .filter(
      (l) =>
        !query ||
        `${l.name} ${l.city} ${l.category} ${l.phone}`
          .toLocaleLowerCase("pt-BR")
          .includes(query),
    )
    .slice(0, 6);
  const searchPreviews = db.previews
    .filter(
      (p) =>
        !query ||
        p.config.businessName.toLocaleLowerCase("pt-BR").includes(query),
    )
    .slice(0, 4);
  const previews = db.previews.filter(
    (p) =>
      !search ||
      p.config.businessName.toLowerCase().includes(search.toLowerCase()),
  );
  async function copyLink(p: Preview) {
    await navigator.clipboard.writeText(
      `${location.origin}/preview/${p.token}`,
    );
    notify(
      supabase
        ? "Link copiado. Quem tiver o link pode ver a demonstração."
        : "Link local copiado: funciona somente neste navegador até conectar o Supabase.",
    );
  }
  if (loading)
    return (
      <main className="preview-status">
        <h1>
          SiteFactory<span className="mint">.</span>
        </h1>
        <p>Preparando sua operação…</p>
      </main>
    );
  if (!user)
    return (
      <main className="login-page">
        <div className="login-story">
          <div className="brand">
            <span className="brand-icon">
              <Layers3 size={22} />
            </span>
            sitefactory<span className="mint">.</span>
          </div>
          <div>
            <p className="eyebrow">DA OPORTUNIDADE À PRESENÇA DIGITAL</p>
            <h1>
              Grandes negócios.
              <br />
              Começam com
              <br />
              <em>uma boa vitrine.</em>
            </h1>
            <p>
              Prospecte com clareza. Apresente com confiança.
              <br />
              Transforme o potencial em presença.
            </p>
          </div>
          <small>UM TEMPLATE. MIL POSSIBILIDADES. ZERO IA POR GERAÇÃO.</small>
        </div>
        <div className="login-form">
          <span className="pill">
            <span className="status-dot" /> SEU CENTRO DE OPERAÇÕES
          </span>
          <h2>Bem-vindo à SiteFactory</h2>
          <p>Entre para continuar construindo oportunidades.</p>
          <form onSubmit={login}>
            <label>
              E-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                minLength={6}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy || !supabase}>
              Entrar na plataforma <ArrowRight size={17} />
            </button>
          </form>
          {!supabase && (
            <div className="sandbox-invite">
              <ShieldCheck size={20} />
              <p>
                <b>Ambiente pronto para experimentar</b>
                <br />O Supabase ainda não está conectado. Teste o fluxo com
                dados salvos apenas neste navegador.
              </p>
              <button className="secondary" onClick={() => setUser("sandbox")}>
                Explorar ambiente de teste <ArrowUpRight size={17} />
              </button>
            </div>
          )}
          <small>
            Operação interna • Sem disparos automáticos de mensagens
          </small>
        </div>
        {toast && (
          <div role="status" className="toast">
            {toast}
          </div>
        )}
      </main>
    );
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setTab("Dashboard");
          }}
        >
          <span className="brand-icon">
            <Layers3 size={21} />
          </span>
          sitefactory<span className="mint">.</span>
        </Link>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(name);
                setSearch("");
                setMenu(false);
              }}
            >
              <Icon size={18} />
              {name}
              {name === "Leads" && (
                <span className="nav-count">{db.leads.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-card">
            <span>
              <ShieldCheck size={15} />
              {supabase ? "Sua operação" : "Ambiente de teste"}
            </span>
            <p>
              {supabase
                ? "Seu próximo cliente está a uma boa apresentação de distância."
                : "Explore o fluxo completo. Seus dados ficam salvos neste navegador."}
            </p>
            <div className="workspace-progress" aria-hidden="true">
              <span />
            </div>
            <button
              className="secondary"
              onClick={() => setTab("Configurações")}
            >
              {supabase ? "Configurações" : "Configurar minha operação"}
              <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="profile"
            onClick={() =>
              run(async () => {
                if (supabase) await supabase.auth.signOut();
                setUser(null);
                setDb(empty);
              })
            }
          >
            <span className="workspace-avatar">SF</span>
            <span>
              SiteFactory
              <small>{supabase ? "Operador" : "Lucas · modo de teste"}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-search-group">
            <button
              className="mobile-toggle icon-button"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <PanelLeftClose size={20} />
            </button>
            <button
              className="global-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar leads, vitrines ou empresas"
            >
              <Search size={17} />
              <span>Buscar leads, vitrines ou empresas...</span>
              <kbd>⌘ K</kbd>
            </button>
          </div>
          <div className="topbar-account">
            <button
              className="notification-button"
              aria-label="Ver atividades recentes"
              onClick={() => setActivitiesOpen(true)}
            >
              <Bell size={20} strokeWidth={1.6} />
              {feed.length > 0 && <span />}
            </button>
            <button
              className="avatar"
              aria-label="Configurações do workspace"
              onClick={() => setTab("Configurações")}
            >
              SF
            </button>
          </div>
        </header>
        <main className="content">
          {tab !== "Dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SUA OPERAÇÃO, EM PERSPECTIVA</p>
                  <h1>{tab === "Dashboard" ? "Visão geral" : tab}</h1>
                  <p>
                    {
                      (
                        {
                          Dashboard:
                            "Acompanhe oportunidades. Crie presenças digitais. Feche negócios.",
                          Leads:
                            "O próximo grande cliente pode estar na sua lista.",
                          Vitrines:
                            "Cada negócio merece uma presença à sua altura.",
                          "Pipeline Comercial":
                            "Da primeira oportunidade ao próximo negócio fechado.",
                          Templates:
                            "Design que se repete. Identidades que se destacam.",
                          Configurações:
                            "A base de uma operação eficiente e segura.",
                        } as Record<string, string>
                      )[tab]
                    }
                  </p>
                </div>
                <div className="heading-actions">
                  {tab === "Leads" && (
                    <button
                      className="secondary"
                      onClick={() => setImportOpen(true)}
                    >
                      <Upload size={16} /> Importar CSV
                    </button>
                  )}
                  {["Dashboard", "Leads"].includes(tab) && (
                    <button
                      className="primary"
                      onClick={() => setLeadModal(newLead({}))}
                    >
                      <Plus size={17} /> Novo lead
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          {tab === "Dashboard" && (
            <Dashboard
              db={db}
              name={supabase ? "Operador" : "Lucas"}
              selected={selected}
              onSelection={setSelected}
              onLead={setLeadModal}
              onNavigate={setTab}
              onNewLead={() => setLeadModal(newLead({}))}
              onActivities={() => setActivitiesOpen(true)}
              onCreatePreview={() => {
                setTab("Leads");
                setStage("Qualificado");
                setSearch("");
                setCity("");
                setVerification("");
                setCategory("");
                setRating("");
                if (!db.leads.some((l) => l.stage === "Qualificado"))
                  notify(
                    "Qualifique um lead de barbearia ou oficina para criar sua primeira demonstração.",
                  );
              }}
            />
          )}
          {tab === "Leads" && (
            <Acquisition
              onImported={() => {
                loadDatabase()
                  .then(setDb)
                  .catch((e) => notify(e.message));
              }}
            />
          )}
          {tab === "Leads" && (
            <section className="panel">
              <div className="filters">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Buscar leads"
                    placeholder="Buscar empresa, cidade ou telefone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filtrar cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">Todas as cidades</option>
                  {[...new Set(db.leads.map((l) => l.city))]
                    .filter(Boolean)
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
                <select
                  aria-label="Filtrar etapa"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="">Todas as etapas</option>
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar presença digital"
                  value={verification}
                  onChange={(e) => setVerification(e.target.value)}
                >
                  <option value="">Presença digital</option>
                  {verifications.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar categoria"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todos os nichos</option>
                  {[...new Set(db.leads.map((l) => l.category))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Avaliação mínima"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value="">Avaliação mínima</option>
                  <option value="4">4+ estrelas</option>
                  <option value="4.5">4,5+ estrelas</option>
                </select>
                <button
                  className="icon-button"
                  aria-label="Limpar filtros"
                  onClick={() => {
                    setCity("");
                    setStage("");
                    setVerification("");
                    setCategory("");
                    setRating("");
                    setSearch("");
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {selected.length > 0 && (
                <div className="bulk-bar">
                  <span>{selected.length} selecionados</span>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        updateStage(
                          db.leads.filter((l) => selected.includes(l.id)),
                          "Qualificado",
                        ),
                      )
                    }
                  >
                    <Check size={15} /> Qualificar selecionados
                  </button>
                </div>
              )}
              {leadTable(filtered)}
              <div className="panel-foot">
                {filtered.length} empresas encontradas · {selected.length}{" "}
                selecionadas
              </div>
            </section>
          )}
          {tab === "Vitrines" && (
            <>
              <div className="filters">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Buscar vitrines"
                    value={search}
                    placeholder="Buscar demonstração…"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="preview-grid">
                {previews.map((p) => (
                  <article className="preview-card" key={p.id}>
                    <div
                      className="preview-cover"
                      style={
                        { "--gold": p.config.color } as React.CSSProperties
                      }
                    >
                      <Scissors size={25} />
                      <h3>{p.config.businessName}</h3>
                      <p>{p.config.headline}</p>
                      <span className="tag">
                        {p.active ? "Ativa" : "Desativada"}
                      </span>
                    </div>
                    <div className="preview-info">
                      <h3>{p.config.businessName}</h3>
                      <p>
                        {p.config.templateId === "mechanic-pro"
                          ? "Oficina · Mechanic Pro"
                          : "Barbearia · Barber Premium"}
                      </p>
                      <small>
                        Criada em {date(p.createdAt)} · Visualizações:{" "}
                        {db.views?.[p.id] ?? 0}
                      </small>
                      <div>
                        <button
                          className="secondary"
                          onClick={() => {
                            setEditor(p);
                            setShowPreview(false);
                          }}
                        >
                          Editar
                        </button>
                        <a
                          className="icon-button"
                          aria-label="Abrir demonstração"
                          href={`/preview/${p.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={17} />
                        </a>
                        <button
                          className="icon-button"
                          aria-label="Copiar link"
                          onClick={() => run(() => copyLink(p))}
                        >
                          <Copy size={17} />
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            run(() => savePreview({ ...p, active: !p.active }))
                          }
                        >
                          {p.active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!previews.length && (
                <Empty
                  title="Sua primeira vitrine começa aqui"
                  text="Qualifique um lead de barbearia e gere uma demonstração personalizada."
                  action={() => setTab("Leads")}
                  label="Explorar leads"
                />
              )}
            </>
          )}
          {tab === "Pipeline Comercial" && (
            <div className="pipeline">
              {stages.map((s) => (
                <section key={s} className="pipeline-col">
                  <h3>
                    <span className="status-dot" />
                    {s}
                    <span>{db.leads.filter((l) => l.stage === s).length}</span>
                  </h3>
                  {db.leads
                    .filter((l) => l.stage === s)
                    .map((l) => (
                      <article key={l.id}>
                        <button
                          className="pipeline-name"
                          onClick={() => setLeadModal(l)}
                        >
                          {l.name}
                          <MoreHorizontal size={16} />
                        </button>
                        <p>
                          {l.category} · {l.city || "Cidade não informada"}
                        </p>
                        <span className="tag">{l.verification}</span>
                        <select
                          aria-label={`Etapa de ${l.name}`}
                          value={l.stage}
                          disabled={busy}
                          onChange={(e) =>
                            run(() =>
                              updateStage([l], e.target.value as Lead["stage"]),
                            )
                          }
                        >
                          {stages.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </article>
                    ))}
                  {!db.leads.some((l) => l.stage === s) && (
                    <small className="empty-column">
                      Novas oportunidades por aqui em breve
                    </small>
                  )}
                </section>
              ))}
            </div>
          )}
          {tab === "Templates" && (
            <div className="template-layout">
              <article className="template-feature">
                <div
                  className="template-art"
                  style={{
                    background:
                      "linear-gradient(#17120e88,#17120ebb),url(/templates/barber-hero.webp) center/cover",
                  }}
                >
                  <Scissors size={45} />
                  <h2>
                    BARBER
                    <br />
                    <em>PREMIUM</em>
                  </h2>
                  <span>TRADIÇÃO. IDENTIDADE. PRESENÇA.</span>
                </div>
                <div className="template-info">
                  <span className="pill">DISPONÍVEL</span>
                  <h2>Barber Premium</h2>
                  <Link href="/templates/barber-premium" target="_blank">
                    Visualizar site completo ↗
                  </Link>
                  <p>
                    Um conceito editorial para barbearias. Tipografia marcante,
                    tons quentes e uma experiência que coloca o negócio em
                    primeiro plano.
                  </p>
                  <div className="feature-tags">
                    <span>Responsivo</span>
                    <span>Cores configuráveis</span>
                    <span>Sem IA</span>
                    <span>Uma única aplicação</span>
                  </div>
                  <button className="primary" onClick={() => setTab("Leads")}>
                    Usar em um lead <ArrowRight size={16} />
                  </button>
                </div>
              </article>
              <article className="template-feature" style={{ marginTop: 24 }}>
                <div
                  className="template-art"
                  style={{
                    background:
                      "linear-gradient(#101b29aa,#0e1623aa),url(/templates/mechanic-hero.webp) center/cover",
                  }}
                >
                  <h2>
                    MECHANIC
                    <br />
                    <em>PRO</em>
                  </h2>
                  <span>PRECISÃO. CONFIANÇA. PRESENÇA.</span>
                </div>
                <div className="template-info">
                  <span className="pill">DISPONÍVEL</span>
                  <h2>Mechanic Pro</h2>
                  <Link href="/templates/mechanic-pro" target="_blank">
                    Visualizar site completo ↗
                  </Link>
                  <p>
                    Um site completo para oficinas mecânicas: serviços com
                    imagens, apresentação, processo de atendimento e Google
                    Maps.
                  </p>
                  <button className="primary" onClick={() => setTab("Leads")}>
                    Usar em uma oficina
                  </button>
                </div>
              </article>
              <section className="panel expansion">
                <Layers3 size={24} />
                <h3>O próximo nicho, a mesma estrutura.</h3>
                <p>
                  O motor está preparado para receber novos templates.
                  Restaurantes, estética automotiva e outros nichos ficam para
                  as próximas etapas.
                </p>
              </section>
            </div>
          )}
          {tab === "Configurações" && (
            <div className="settings-grid">
              <section className="panel settings-card">
                <ShieldCheck size={23} />
                <h2>Conexão e autenticação</h2>
                <span className="tag">
                  {supabase ? "Supabase configurado" : "Modo de teste local"}
                </span>
                <p>
                  {supabase
                    ? "A sessão autenticada acessa registros protegidos por RLS."
                    : "Para ativar a operação persistente, configure as variáveis na Vercel e aplique a migration do repositório."}
                </p>
                <code>
                  NEXT_PUBLIC_SUPABASE_URL
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>
                <p>
                  Crie os operadores no Supabase Auth. Não existe cadastro
                  público na interface.
                </p>
              </section>
              <section className="panel settings-card">
                <SlidersHorizontal size={23} />
                <h2>Importação e geração</h2>
                <p>
                  Limite: 500 linhas e 2 MB por CSV. Deduplicação por
                  identificador, telefone ou nome e cidade.
                </p>
                <p>
                  Uma vitrine por lead. Templates: barbearia e oficina. A
                  ausência de site no CSV é classificada como indício, nunca
                  como confirmação.
                </p>
                <button className="secondary" onClick={downloadExample}>
                  <ArrowDownToLine size={15} /> Baixar CSV de exemplo
                </button>
              </section>
              <section className="panel settings-card">
                <Layers3 size={23} />
                <h2>Dados para validação</h2>
                <p>
                  Os exemplos são explicitamente fictícios. Use-os para
                  percorrer o fluxo sem envolver empresas reais.
                </p>
                <button
                  className="secondary"
                  disabled={busy || !!supabase}
                  onClick={() =>
                    run(async () => {
                      const data = seed();
                      const leads = data.leads.filter(
                        (l) => !db.leads.some((x) => duplicate(x, l)),
                      );
                      commit({ ...db, leads: [...db.leads, ...leads] });
                      notify(`${leads.length} exemplos fictícios adicionados.`);
                    })
                  }
                >
                  Adicionar exemplos fictícios
                </button>
                {supabase && (
                  <small>
                    Exemplos disponíveis apenas no ambiente de teste.
                  </small>
                )}
              </section>
              <section className="panel settings-card">
                <Sparkles size={23} />
                <h2>Integrações e acompanhamento</h2>
                <p>
                  Apify: importação de datasets e execuções concluídas,
                  adaptador de dados e histórico de lotes.
                </p>
                <p>
                  Acessos às vitrines registrados sem IP ou identificação
                  pessoal. Dashboard com filtros por período, nicho e cidade.
                </p>
              </section>
            </div>
          )}
        </main>
      </div>
      <input
        ref={file}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCsv(f);
          e.target.value = "";
        }}
      />
      {searchOpen && (
        <Modal
          title="Encontre sua próxima oportunidade"
          close={() => setSearchOpen(false)}
          wide
        >
          <label className="command-search">
            <Search size={20} />
            <input
              aria-label="Buscar em toda a operação"
              placeholder="Nome da empresa, cidade, categoria..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </label>
          <div className="command-results">
            <p className="command-section-label">
              LEADS <span>{searchLeads.length}</span>
            </p>
            {searchLeads.map((lead) => (
              <button
                className="command-result"
                key={lead.id}
                onClick={() => {
                  setSearchOpen(false);
                  setLeadModal(lead);
                }}
              >
                <span className="command-icon">
                  <Users size={18} />
                </span>
                <span>
                  <b>{lead.name}</b>
                  <small>
                    {lead.category} · {lead.city || "Cidade não informada"}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            <p className="command-section-label">
              VITRINES <span>{searchPreviews.length}</span>
            </p>
            {searchPreviews.map((preview) => (
              <button
                className="command-result"
                key={preview.id}
                onClick={() => {
                  setSearchOpen(false);
                  setEditor(preview);
                  setShowPreview(false);
                }}
              >
                <span className="command-icon">
                  <Monitor size={18} />
                </span>
                <span>
                  <b>{preview.config.businessName}</b>
                  <small>
                    {preview.active
                      ? "Demonstração ativa"
                      : "Demonstração desativada"}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!searchLeads.length && !searchPreviews.length && (
              <p className="command-empty">
                Nenhum resultado. Tente outro nome ou cidade.
              </p>
            )}
          </div>
        </Modal>
      )}
      {activitiesOpen && (
        <Modal
          title="Atividades da operação"
          close={() => setActivitiesOpen(false)}
          wide
        >
          <ActivityList
            items={feed.slice(0, 40)}
            now={activityNow}
            onSelect={(id) => {
              const lead = db.leads.find((l) => l.id === id);
              if (lead) {
                setActivitiesOpen(false);
                setLeadModal(lead);
              }
            }}
          />
        </Modal>
      )}
      {importOpen && (
        <Modal
          title="Importar oportunidades"
          close={() => setImportOpen(false)}
        >
          <p>
            CSV com cabeçalho. Campos: nome, categoria, cidade, telefone,
            endereco, website, external_id e fonte. Apenas nome é obrigatório.
          </p>
          <button
            className="upload-zone"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            <Upload size={30} />
            <strong>{busy ? "Importando…" : "Escolher arquivo CSV"}</strong>
            <span>Até 500 empresas · 2 MB · vírgula ou ponto e vírgula</span>
          </button>
          <button className="text-button" onClick={downloadExample}>
            <ArrowDownToLine size={16} /> Baixar exemplo fictício
          </button>
          <p className="hint">
            Duplicidades serão ignoradas. Importe apenas dados de fontes
            autorizadas.
          </p>
        </Modal>
      )}
      {leadModal && (
        <Modal
          title={
            db.leads.some((l) => l.id === leadModal.id)
              ? "Detalhes da oportunidade"
              : "Novo lead"
          }
          close={() => setLeadModal(null)}
          wide
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveLead(leadModal));
            }}
          >
            <div className="form-grid">
              {(
                [
                  ["name", "Nome comercial"],
                  ["category", "Categoria"],
                  ["city", "Cidade"],
                  ["phone", "Telefone comercial"],
                  ["address", "Endereço"],
                  ["logoUrl", "Logo (URL HTTPS)"],
                  ["mapsUrl", "Link do Google Maps"],
                  ["website", "Website"],
                  ["externalId", "Identificador externo"],
                  ["source", "Fonte dos dados"],
                ] as const
              ).map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required={k === "name"}
                    maxLength={k === "name" ? 150 : 300}
                    value={leadModal[k] ?? ""}
                    onChange={(e) =>
                      setLeadModal({ ...leadModal, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Etapa comercial
                <select
                  value={leadModal.stage}
                  onChange={(e) =>
                    setLeadModal({
                      ...leadModal,
                      stage: e.target.value as Lead["stage"],
                    })
                  }
                >
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Presença digital
                <select
                  value={leadModal.verification}
                  onChange={(e) =>
                    setLeadModal({
                      ...leadModal,
                      verification: e.target.value as Lead["verification"],
                      verifiedAt: new Date().toISOString(),
                    })
                  }
                >
                  {verifications.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!leadModal.logoAuthorized}
                onChange={(e) =>
                  setLeadModal({
                    ...leadModal,
                    logoAuthorized: e.target.checked,
                  })
                }
              />{" "}
              Tenho autorização para usar a logo nesta demonstração.
            </label>
            <label>
              Observações
              <textarea
                maxLength={5000}
                rows={3}
                value={leadModal.notes}
                onChange={(e) =>
                  setLeadModal({ ...leadModal, notes: e.target.value })
                }
              />
            </label>
            <p className="hint">
              Ausência de website no cadastro não confirma ausência de site.
              Registre a evidência nas observações.
              {leadModal.verifiedAt &&
                ` Última verificação: ${date(leadModal.verifiedAt)}.`}
            </p>
            {leadModal.fictional && (
              <span className="tag">Empresa fictícia para testes</span>
            )}
            <div className="modal-actions">
              {db.leads.some((l) => l.id === leadModal.id) &&
                leadModal.stage === "Qualificado" && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => run(() => generate(leadModal))}
                  >
                    <Sparkles size={16} /> Gerar demonstração
                  </button>
                )}
              <button className="primary" disabled={busy}>
                Salvar lead <Check size={16} />
              </button>
            </div>
          </form>
          {db.leads.some((l) => l.id === leadModal.id) && (
            <section className="activity-section">
              <h3>Histórico e interações</h3>
              {db.activities
                .filter((a) => a.leadId === leadModal.id)
                .map((a) => (
                  <div key={a.id}>
                    <small>{date(a.createdAt)}</small>
                    <p>{a.text}</p>
                  </div>
                ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    if (!note.trim()) return;
                    const a = {
                      id: crypto.randomUUID(),
                      leadId: leadModal.id,
                      text: note.trim(),
                      createdAt: new Date().toISOString(),
                    };
                    await saveRecord("activity", a, user!);
                    commit({ ...db, activities: [a, ...db.activities] });
                    setNote("");
                  });
                }}
              >
                <label>
                  Registrar interação
                  <textarea
                    required
                    value={note}
                    maxLength={3000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className="secondary" disabled={busy}>
                  Adicionar registro
                </button>
              </form>
            </section>
          )}
        </Modal>
      )}
      {editor && (
        <Modal
          title="Sua próxima presença digital"
          close={() => {
            setEditor(null);
            setShowPreview(false);
          }}
          wide
        >
          <div className="editor-toolbar">
            <span className="tag">
              {editor.config.templateId === "mechanic-pro"
                ? "Mechanic Pro"
                : "Barber Premium"}
            </span>
            <button
              className="secondary"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Voltar ao editor" : "Visualizar"}
            </button>
            <a
              className="icon-button"
              href={`/preview/${editor.token}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir vitrine salva"
            >
              <ExternalLink size={17} />
            </a>
            <button
              className="secondary"
              onClick={() => run(() => copyLink(editor))}
            >
              <Copy size={15} /> Copiar link salvo
            </button>
          </div>
          {!supabase && (
            <p className="hint">
              Link de teste local: disponível apenas neste navegador. Para
              compartilhar entre dispositivos, conecte o Supabase.
            </p>
          )}
          {showPreview ? (
            <div className="editor-preview">
              <Barber config={editor.config} />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => savePreview(editor));
              }}
            >
              <div className="form-grid">
                <label>
                  Template
                  <select
                    value={editor.config.templateId}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        config: {
                          ...editor.config,
                          templateId: e.target
                            .value as SiteConfig["templateId"],
                          imageUrl:
                            e.target.value === "mechanic-pro"
                              ? "/templates/mechanic-hero.webp"
                              : "/templates/barber-hero.webp",
                          color:
                            e.target.value === "mechanic-pro"
                              ? "#ed4935"
                              : "#c5a46e",
                        },
                      })
                    }
                  >
                    <option value="barber-premium">Barber Premium</option>
                    <option value="mechanic-pro">Mechanic Pro</option>
                  </select>
                </label>
                {(
                  [
                    ["businessName", "Nome do negócio"],
                    ["headline", "Texto principal"],
                    ["city", "Cidade"],
                    ["phone", "Telefone"],
                    ["address", "Endereço"],
                    [
                      "imageUrl",
                      "Imagem de destaque (URL HTTPS ou imagem padrão)",
                    ],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k}>
                    {label}
                    <input
                      required={k === "businessName" || k === "headline"}
                      maxLength={300}
                      value={editor.config[k] ?? ""}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          config: { ...editor.config, [k]: e.target.value },
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Cor de destaque
                  <input
                    type="color"
                    value={editor.config.color}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        config: { ...editor.config, color: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Tipografia
                  <select
                    value={editor.config.font}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        config: {
                          ...editor.config,
                          font: e.target.value as SiteConfig["font"],
                        },
                      })
                    }
                  >
                    <option value="classic">Clássica editorial</option>
                    <option value="modern">Moderna</option>
                  </select>
                </label>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={editor.config.logoAuthorized ?? false}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      config: {
                        ...editor.config,
                        logoAuthorized: e.target.checked,
                      },
                    })
                  }
                />{" "}
                Uso autorizado da logo
              </label>
              <label>
                Sobre a empresa (informações confirmadas)
                <textarea
                  value={editor.config.about ?? ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      config: { ...editor.config, about: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Fotos autorizadas (URLs HTTPS, uma por linha)
                <textarea
                  value={(editor.config.gallery ?? []).join("\n")}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      config: {
                        ...editor.config,
                        gallery: e.target.value.split("\n").filter(Boolean),
                      },
                    })
                  }
                />
              </label>
              <label>
                Descrição
                <textarea
                  maxLength={1500}
                  rows={4}
                  value={editor.config.description}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      config: { ...editor.config, description: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Serviços confirmados (um por linha)
                <textarea
                  rows={3}
                  value={editor.config.services.join("\n")}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      config: {
                        ...editor.config,
                        services: e.target.value.split("\n"),
                      },
                    })
                  }
                />
              </label>
              <p className="hint">
                Use apenas textos, serviços e imagens autorizados. Campos
                ausentes exibem conteúdo demonstrativo identificado.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const lead = db.leads.find((l) => l.id === editor.leadId);
                    if (lead)
                      setEditor({ ...editor, config: defaultConfig(lead) });
                  }}
                >
                  Restaurar padrão no formulário
                </button>
                <button className="primary" disabled={busy}>
                  Salvar alterações <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
  function leadTable(leads: Lead[]) {
    return !leads.length ? (
      <Empty
        title="Espaço para novas oportunidades"
        text="Cadastre sua primeira empresa ou importe uma lista CSV para começar."
        action={() => setLeadModal(newLead({}))}
        label="Cadastrar primeiro lead"
      />
    ) : (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os leads visíveis"
                  checked={
                    leads.length > 0 &&
                    leads.every((l) => selected.includes(l.id))
                  }
                  onChange={(e) =>
                    setSelected(e.target.checked ? leads.map((l) => l.id) : [])
                  }
                />
              </th>
              <th>EMPRESA</th>
              <th>LOCALIZAÇÃO</th>
              <th>PRESENÇA DIGITAL</th>
              <th>ETAPA COMERCIAL</th>
              <th>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => (
              <tr key={l.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${l.name}`}
                    checked={selected.includes(l.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, l.id]
                          : selected.filter((x) => x !== l.id),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="company-cell"
                    onClick={() => setLeadModal(l)}
                  >
                    <span className={`company-avatar tone-${i % 3}`}>
                      <Scissors size={18} />
                    </span>
                    <span>
                      {l.name}
                      <small>
                        {l.category}
                        {l.rating !== null
                          ? ` · ★ ${l.rating} (${l.reviews ?? "—"})`
                          : ""}
                      </small>
                    </span>
                  </button>
                </td>
                <td>{l.city || "Não informada"}</td>
                <td>
                  <span
                    className={`tag ${l.verification === "Sem site confirmado" ? "green" : ""}`}
                  >
                    {l.verification}
                  </span>
                </td>
                <td>
                  <span
                    className={`stage-label ${l.stage === "Qualificado" ? "mint" : ""}`}
                  >
                    <span className="status-dot" />
                    {l.stage}
                  </span>
                </td>
                <td>
                  {l.stage === "Qualificado" ? (
                    <button
                      className="generate-button"
                      disabled={busy}
                      onClick={() => run(() => generate(l))}
                    >
                      <Sparkles size={14} /> Gerar vitrine
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label={`Editar ${l.name}`}
                      onClick={() => setLeadModal(l)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty-state">
      <Users size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="secondary" onClick={action}>
        {label}
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    ref.current?.focus();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={`dialog ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Fechar janela"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
