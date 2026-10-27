import { stages, type Database, type Lead } from "./domain";

export type FeedItem = {
  id: string;
  leadId: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "lead" | "preview" | "activity";
};

export function activityFeed(db: Database): FeedItem[] {
  const names = new Map(db.leads.map((lead) => [lead.id, lead.name]));
  return [
    ...db.leads.map((lead) => ({
      id: `lead-${lead.id}`,
      leadId: lead.id,
      title: "Novo lead cadastrado",
      detail: lead.name,
      createdAt: lead.createdAt,
      kind: "lead" as const,
    })),
    ...db.previews.map((preview) => ({
      id: `preview-${preview.id}`,
      leadId: preview.leadId,
      title: "Nova vitrine criada",
      detail: preview.config.businessName,
      createdAt: preview.createdAt,
      kind: "preview" as const,
    })),
    ...db.activities.map((activity) => ({
      id: activity.id,
      leadId: activity.leadId,
      title: activity.text,
      detail: names.get(activity.leadId) || "Oportunidade",
      createdAt: activity.createdAt,
      kind: "activity" as const,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function dashboardData(db: Database, days: number, now: number) {
  const since = days ? now - days * 86400000 : 0;
  const leads = db.leads.filter(
    (lead) => new Date(lead.createdAt).getTime() >= since,
  );
  const previews = db.previews.filter(
    (preview) => new Date(preview.createdAt).getTime() >= since,
  );
  const atLeast = (stage: Lead["stage"]) =>
    leads.filter(
      (lead) =>
        lead.stage !== "Perdido" &&
        stages.indexOf(lead.stage) >= stages.indexOf(stage),
    ).length;
  const qualified = atLeast("Qualificado");
  const closed = atLeast("Cliente fechado");
  const leadIds = new Set(leads.map((lead) => lead.id));
  const previewLeads = new Set(
    db.previews.filter((p) => leadIds.has(p.leadId)).map((p) => p.leadId),
  );
  const funnel = [
    { label: "Leads", value: leads.length },
    { label: "Qualificados", value: qualified },
    { label: "Demonstrações", value: previewLeads.size },
    { label: "Contatados", value: atLeast("Contatado") },
    { label: "Propostas", value: atLeast("Proposta enviada") },
    { label: "Fechados", value: closed },
  ];
  return { leads, previews, qualified, closed, funnel };
}

export function relativeTime(value: string, now: number) {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  const days = Math.floor(minutes / 1440);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}
