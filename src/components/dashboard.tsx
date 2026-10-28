"use client";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChartNoAxesColumnIncreasing,
  MessageSquare,
  Monitor,
  MoreVertical,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  activityFeed,
  dashboardData,
  relativeTime,
  type FeedItem,
} from "@/lib/dashboard";
import type { Database, Lead } from "@/lib/domain";

type Props = {
  db: Database;
  name: string;
  selected: string[];
  onSelection: (ids: string[]) => void;
  onLead: (lead: Lead) => void;
  onNavigate: (tab: string) => void;
  onNewLead: () => void;
  onActivities: () => void;
  onCreatePreview: () => void;
};

export function ActivityList({
  items,
  now,
  onSelect,
}: {
  items: FeedItem[];
  now: number;
  onSelect: (id: string) => void;
}) {
  if (!items.length)
    return (
      <div className="activity-empty">
        <MessageSquare size={26} />
        <p>
          As próximas oportunidades
          <br />
          começam por aqui.
        </p>
        <small>Suas atividades aparecerão neste espaço.</small>
      </div>
    );
  return (
    <ol className="activity-feed">
      {items.map((item) => {
        const Icon =
          item.kind === "preview"
            ? Monitor
            : item.kind === "lead"
              ? Users
              : MessageSquare;
        return (
          <li key={item.id}>
            <button
              className="activity-row"
              onClick={() => onSelect(item.leadId)}
            >
              <span className={`activity-symbol ${item.kind}`}>
                <Icon size={19} strokeWidth={1.6} />
              </span>
              <span className="activity-copy">
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </span>
              <time dateTime={item.createdAt}>
                {relativeTime(item.createdAt, now)}
              </time>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function Dashboard({
  db,
  name,
  selected,
  onSelection,
  onLead,
  onNavigate,
  onNewLead,
  onActivities,
  onCreatePreview,
}: Props) {
  const [days, setDays] = useState(30);
  const [now] = useState(() => Date.now());
  const [city, setCity] = useState(""),
    [category, setCategory] = useState("");
  const scoped = {
    ...db,
    leads: db.leads.filter(
      (l) =>
        (!city || l.city === city) && (!category || l.category === category),
    ),
    previews: db.previews.filter((p) => {
      const l = db.leads.find((l) => l.id === p.leadId);
      return (
        !!l &&
        (!city || l.city === city) &&
        (!category || l.category === category)
      );
    }),
  };
  const data = dashboardData(scoped, days, now);
  const percent = (n: number) =>
    data.leads.length ? Math.round((n / data.leads.length) * 100) : 0;
  const recent = [...data.leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const events = activityFeed(db).slice(0, 5);
  const metrics = [
    {
      label: "Leads cadastrados",
      value: data.leads.length,
      icon: Users,
      tone: "neutral",
      note: days ? "Novas oportunidades no período" : "Todas as oportunidades",
      destination: "Leads",
    },
    {
      label: "Leads qualificados",
      value: data.qualified,
      icon: ShieldCheck,
      tone: "mint",
      note: `${percent(data.qualified)}% de qualificação`,
      destination: "Leads",
    },
    {
      label: "Vitrines criadas",
      value: data.previews.length,
      icon: Monitor,
      tone: "blue",
      note: `${data.previews.filter((p) => p.active).length} demonstrações ativas`,
      destination: "Vitrines",
    },
    {
      label: "Negócios fechados",
      value: data.closed,
      icon: ChartNoAxesColumnIncreasing,
      tone: "neutral",
      note: `${percent(data.closed)}% dos leads do período`,
      destination: "Pipeline Comercial",
    },
  ];
  return (
    <div className="dashboard-layout">
      <div className="dashboard-primary">
        <div className="filters" style={{ padding: 0, marginBottom: 16 }}>
          <select
            aria-label="Cidade do dashboard"
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
            aria-label="Nicho do dashboard"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todos os nichos</option>
            {[...new Set(db.leads.map((l) => l.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="hint">
            {Object.entries(db.views ?? {})
              .filter(([id]) => scoped.previews.some((p) => p.id === id))
              .reduce((total, [, n]) => total + n, 0)}{" "}
            acessos às vitrines · total acumulado
          </span>
        </div>
        <div className="dashboard-welcome">
          <div>
            <p className="eyebrow">
              OLÁ, {name.toUpperCase()} <span aria-hidden="true">👋</span>
            </p>
            <h1>
              Sua operação em <span>movimento.</span>
            </h1>
            <p>
              Acompanhe seus leads, crie demonstrações e feche novos negócios.
            </p>
          </div>
          <label className="period-control">
            <CalendarDays size={15} />
            <select
              aria-label="Período do dashboard"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={0}>Todo o período</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <section
          className="overview-metrics"
          aria-label="Indicadores da operação"
        >
          {metrics.map((metric) => (
            <button
              className={`overview-metric ${metric.tone}`}
              key={metric.label}
              onClick={() => onNavigate(metric.destination)}
            >
              <span className="metric-label">
                <span className="metric-symbol">
                  <metric.icon size={21} strokeWidth={1.6} />
                </span>
                {metric.label}
              </span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </button>
          ))}
        </section>
        <section className="dashboard-panel commercial-funnel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Seu funil comercial</h2>
              <p>Transforme oportunidades em clientes.</p>
            </div>
            <button
              className="quiet-button"
              onClick={() => onNavigate("Pipeline Comercial")}
            >
              Funil completo <ArrowRight size={14} />
            </button>
          </div>
          <div
            className="commercial-chart"
            role="img"
            aria-label={data.funnel
              .map((item) => `${item.label}: ${item.value}`)
              .join(", ")}
          >
            {data.funnel.map((item, index) => (
              <div
                className={`chart-column chart-tone-${index}`}
                key={item.label}
              >
                <div className="chart-bar-area">
                  <span>{item.value}</span>
                  <div
                    className="chart-bar"
                    style={{
                      height: `${data.leads.length ? Math.max(0, (item.value / data.leads.length) * 92) : 0}px`,
                    }}
                  />
                </div>
                <div className="chart-label">
                  <span>{item.label}</span>
                  <small>{percent(item.value)}%</small>
                </div>
              </div>
            ))}
          </div>
          <p className="chart-caption">
            Etapas atuais dos leads cadastrados no período selecionado.
          </p>
        </section>
        <section className="dashboard-panel recent-opportunities">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Oportunidades recentes</h2>
              <p>Últimos leads adicionados na sua operação.</p>
            </div>
            <button
              className="quiet-button"
              onClick={() => onNavigate("Leads")}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          {recent.length ? (
            <div className="table-scroll">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Selecionar oportunidades recentes"
                        checked={recent.every((l) => selected.includes(l.id))}
                        onChange={(e) =>
                          onSelection(
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...selected,
                                    ...recent.map((l) => l.id),
                                  ]),
                                ]
                              : selected.filter(
                                  (id) => !recent.some((l) => l.id === id),
                                ),
                          )
                        }
                      />
                    </th>
                    <th>EMPRESA</th>
                    <th>CIDADE</th>
                    <th>CATEGORIA</th>
                    <th>STATUS</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((lead, index) => (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${lead.name}`}
                          checked={selected.includes(lead.id)}
                          onChange={(e) =>
                            onSelection(
                              e.target.checked
                                ? [...selected, lead.id]
                                : selected.filter((id) => id !== lead.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="overview-company"
                          onClick={() => onLead(lead)}
                        >
                          <span className={`business-mark mark-${index % 5}`}>
                            <Scissors size={13} />
                          </span>
                          <span>{lead.name}</span>
                        </button>
                      </td>
                      <td>{lead.city || "Não informada"}</td>
                      <td>{lead.category}</td>
                      <td>
                        <span
                          className={`commercial-status status-${lead.stage === "Qualificado" ? "qualified" : lead.stage === "Demonstração criada" ? "preview" : lead.stage === "Cliente fechado" ? "won" : lead.stage === "Proposta enviada" ? "proposal" : lead.stage === "Novo lead" ? "new" : "contact"}`}
                        >
                          <i />
                          {lead.stage}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Detalhes de ${lead.name}`}
                          onClick={() => onLead(lead)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dashboard-empty">
              <span>
                <Users size={23} />
              </span>
              <h3>O próximo cliente começa aqui.</h3>
              <p>
                Adicione uma empresa para colocar sua operação em movimento.
              </p>
              <button className="primary" onClick={onNewLead}>
                <Plus size={15} /> Cadastrar primeiro lead
              </button>
            </div>
          )}
          {selected.length > 0 && (
            <div className="overview-selection">
              <span>
                {selected.length} selecionado{selected.length > 1 ? "s" : ""}
              </span>
              <button onClick={() => onNavigate("Leads")}>
                Gerenciar seleção <ArrowRight size={13} />
              </button>
            </div>
          )}
        </section>
      </div>
      <aside className="dashboard-secondary" aria-label="Vitrines e atividades">
        <section className="showcase-promo">
          <Image
            src="/showcase-laptop.webp"
            alt="Mockup ilustrativo de um site de barbearia em um notebook"
            fill
            sizes="(max-width: 700px) 100vw, 420px"
            className="showcase-image"
            priority
          />
          <div className="promo-shade" />
          <div className="showcase-copy">
            <span className="promo-tag">VITRINES</span>
            <h2>
              Sites que
              <br />
              abrem <span>portas.</span>
            </h2>
            <p>
              Crie demonstrações profissionais em minutos e apresente o
              potencial do negócio.
            </p>
            <button onClick={onCreatePreview}>
              Criar uma demonstração <ArrowRight size={17} />
            </button>
          </div>
          <span className="promo-disclaimer">IMAGEM CONCEITUAL</span>
        </section>
        <section className="dashboard-panel recent-activity">
          <div className="dashboard-panel-heading">
            <h2>Atividades recentes</h2>
            <button className="quiet-button" onClick={onActivities}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <ActivityList
            items={events}
            now={now}
            onSelect={(id) => {
              const lead = db.leads.find((l) => l.id === id);
              if (lead) onLead(lead);
            }}
          />
        </section>
        <div className="dashboard-signature">
          <Sparkles size={13} />
          <span>Uma boa presença faz a diferença.</span>
        </div>
      </aside>
    </div>
  );
}
