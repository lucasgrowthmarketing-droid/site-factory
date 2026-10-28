import { supabase } from "./supabase";
import type { Database, Lead, Preview, Activity } from "./domain";
const storageKey = "sitefactory-sandbox-v1";
export function localRead(): Database {
  const raw = localStorage.getItem(storageKey);
  const db: Database = raw
    ? JSON.parse(raw)
    : { leads: [], previews: [], activities: [] };
  db.views = {};
  for (const event of db.events ?? [])
    db.views[event.previewId] = (db.views[event.previewId] ?? 0) + 1;
  return db;
}
export function localWrite(db: Database) {
  localStorage.setItem(storageKey, JSON.stringify(db));
}
export async function loadDatabase(): Promise<Database> {
  if (!supabase) return localRead();
  const client = supabase;
  async function readAll(table: string) {
    const rows: { data: unknown }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client!
        .from(table)
        .select("data")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return { data: rows, error: null };
  }
  const result = await Promise.all(
    ["business_leads", "site_previews", "commercial_activities"].map((t) =>
      readAll(t),
    ),
  );

  const { data: counts, error: countsError } = await client.rpc(
    "preview_view_counts",
  );
  if (countsError)
    throw new Error("Aplique a migration de analytics: " + countsError.message);
  return {
    views: Object.fromEntries(
      (counts ?? []).map((row: { preview_id: string; views: number }) => [
        row.preview_id,
        Number(row.views),
      ]),
    ),
    leads: result[0].data!.map((r) => r.data as Lead),
    previews: result[1].data!.map((r) => r.data as Preview),
    activities: result[2].data!.map((r) => r.data as Activity),
  };
}
export async function saveRecord(
  type: "lead" | "preview" | "activity",
  value: Lead | Preview | Activity,
  owner: string,
) {
  if (!supabase) return;
  const table = {
    lead: "business_leads",
    preview: "site_previews",
    activity: "commercial_activities",
  }[type];
  const row: Record<string, unknown> = {
    id: value.id,
    owner_id: owner,
    data: value,
  };
  if (type === "preview") {
    const p = value as Preview;
    Object.assign(row, {
      lead_id: p.leadId,
      token: p.token,
      active: p.active,
      config: p.config,
    });
  }
  if (type === "activity") row.lead_id = (value as Activity).leadId;
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw new Error(error.message);
}

// A single database statement keeps CSV imports and bulk stage updates atomic.
export async function saveLeads(leads: Lead[], owner: string) {
  if (!supabase || !leads.length) return;
  const { error } = await supabase
    .from("business_leads")
    .upsert(
      leads.map((lead) => ({ id: lead.id, owner_id: owner, data: lead })),
    );
  if (error) throw new Error(error.message);
}

export async function createPreview(preview: Preview, lead: Lead) {
  if (!supabase) return;
  const { error } = await supabase.rpc("create_site_preview", {
    preview_data: preview,
    updated_lead: lead,
  });
  if (error) throw new Error(error.message);
}

export async function saveCsvImport(
  leads: Lead[],
  owner: string,
  invalid: number,
  duplicates: number,
) {
  if (!supabase) return;
  const id = crypto.randomUUID();
  const { error: jobError } = await supabase.from("lead_import_jobs").insert({
    id,
    owner_id: owner,
    status: "running",
    details: { source: "CSV" },
  });
  if (jobError) throw new Error(jobError.message);
  const { error } = await supabase.rpc("import_lead_batch", {
    job_id: id,
    lead_data: leads,
    summary: { source: "CSV", invalid, duplicates },
  });
  if (error) {
    await supabase
      .from("lead_import_jobs")
      .update({
        status: "failed",
        details: { source: "CSV", error: "Falha ao salvar lote" },
      })
      .eq("id", id);
    throw new Error(error.message);
  }
}
