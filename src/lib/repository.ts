import { supabase } from "./supabase";
import type { Database, Lead, Preview, Activity } from "./domain";
const storageKey = "sitefactory-sandbox-v1";
export function localRead(): Database {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : { leads: [], previews: [], activities: [] };
}
export function localWrite(db: Database) {
  localStorage.setItem(storageKey, JSON.stringify(db));
}
export async function loadDatabase(): Promise<Database> {
  if (!supabase) return localRead();
  const client = supabase;
  const result = await Promise.all(
    ["business_leads", "site_previews", "commercial_activities"].map((t) =>
      client.from(t).select("data").order("created_at", { ascending: false }),
    ),
  );
  for (const r of result) if (r.error) throw new Error(r.error.message);
  return {
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
