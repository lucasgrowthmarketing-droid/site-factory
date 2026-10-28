import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeApify } from "@/lib/apify";
import { defaultConfig, templateFor, type Lead } from "@/lib/domain";
export const runtime = "nodejs";
export const maxDuration = 60;
const startSchema = z.object({
  requestId: z.string().uuid(),
  city: z.string().trim().min(2).max(150),
  niche: z.enum(["Barbearia", "Oficina mecânica", "Ambos"]),
  limit: z.number().int().min(1).max(500),
  budget: z.number().min(0.05).max(10),
  authorized: z.literal(true),
});
async function context(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase indisponível.");
  const bearer = req.headers.get("authorization") || "";
  const client = createClient(url, key, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(
    bearer.replace(/^Bearer /, ""),
  );
  if (error || !data.user) throw new Error("Autenticação necessária.");
  return { client, owner: data.user.id };
}
async function apify(path: string, body?: unknown) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Apify não configurada.");
  const response = await fetch("https://api.apify.com/v2/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `Apify retornou ${response.status}. Confira saldo e permissões.`,
    );
  return response.json();
}
export async function POST(req: Request) {
  try {
    const { client, owner } = await context(req);
    const input = startSchema.parse(await req.json());
    const { data: existing } = await client
      .from("lead_import_jobs")
      .select("*")
      .eq("request_key", "prospect:" + input.requestId)
      .maybeSingle();
    if (existing) return Response.json(existing);
    const job = {
      id: input.requestId,
      owner_id: owner,
      request_key: "prospect:" + input.requestId,
      status: "starting",
      details: { ...input, type: "prospect", offset: 0, generated: 0 },
    };
    const { error: claim } = await client.from("lead_import_jobs").insert(job);
    if (claim) throw new Error("Busca já solicitada. Atualize o histórico.");
    try {
      const run = await apify(
        `actors/compass~crawler-google-places/runs?maxTotalChargeUsd=${input.budget}&timeout=600`,
        {
          searchStringsArray:
            input.niche === "Ambos"
              ? ["barbearia", "oficina mecânica"]
              : [input.niche],
          locationQuery: input.city,
          maxCrawledPlacesPerSearch: input.limit,
          language: "pt-BR",
          maxImages: 0,
          maxReviews: 0,
          scrapeContacts: false,
          scrapePlaceDetailPage: true,
        },
      );
      const details = {
        ...job.details,
        runId: run.data.id,
        dataset: run.data.defaultDatasetId,
      };
      const { error } = await client
        .from("lead_import_jobs")
        .update({ status: "collecting", details })
        .eq("id", job.id);
      if (error)
        throw new Error(
          "Coleta iniciada; não repita. Consulte a execução na Apify.",
        );
      return Response.json({ ...job, status: "collecting", details });
    } catch (e) {
      await client
        .from("lead_import_jobs")
        .update({
          status: "attention",
          details: {
            ...job.details,
            error:
              e instanceof Error
                ? e.message
                : "Resposta incerta. Confira a Apify antes de iniciar outra busca.",
          },
        })
        .eq("id", job.id);
      throw e;
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Falha na busca." },
      { status: 400 },
    );
  }
}
export async function GET(req: Request) {
  try {
    const { client } = await context(req);
    const { data, error } = await client
      .from("lead_import_jobs")
      .select("*")
      .like("request_key", "prospect:%")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Sessão inválida." },
      { status: 401 },
    );
  }
}
export async function PATCH(req: Request) {
  try {
    const { client } = await context(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(await req.json());
    const { data: job, error } = await client
      .from("lead_import_jobs")
      .select("*")
      .eq("id", id)
      .like("request_key", "prospect:%")
      .single();
    if (error || !job) throw new Error("Busca não encontrada.");
    if (["completed", "attention", "failed"].includes(job.status))
      return Response.json(job);
    const details = job.details;
    if (!details.runId) return Response.json(job);
    const { data: run } = await apify(`actor-runs/${details.runId}`);
    if (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status))
      return Response.json({ ...job, runStatus: run.status });
    const offset = Number(details.offset) || 0;
    const rows = await apify(
      `datasets/${run.defaultDatasetId}/items?format=json&clean=true&offset=${offset}&limit=25`,
    );
    if (!Array.isArray(rows)) throw new Error("Resultados inválidos.");
    const normalized = normalizeApify(
      rows,
      [],
      `Apify:${run.defaultDatasetId}`,
    );
    const leads: Lead[] = normalized.leads.map((l) => ({
      ...l,
      notes: `Coletado do Google Maps em ${new Date().toLocaleDateString("pt-BR")}. ${l.website ? "Website informado na fonte." : "Nenhum website informado na fonte; ausência de site ainda não confirmada."}`,
      stage:
        !l.website && templateFor(l.category) ? "Qualificado" : "Novo lead",
    }));
    const previews = leads
      .filter((l) => l.stage === "Qualificado")
      .map((l) => ({
        id: crypto.randomUUID(),
        leadId: l.id,
        token:
          crypto.randomUUID().replaceAll("-", "") +
          crypto.randomUUID().replaceAll("-", ""),
        active: true,
        createdAt: new Date().toISOString(),
        config: defaultConfig(l),
      }));
    const { error: save } = await client.rpc("process_prospect_batch", {
      job_id: id,
      expected_offset: offset,
      lead_data: leads,
      preview_data: previews,
      next_offset: offset + rows.length,
      is_done: rows.length < 25,
      run_cost: run.usageTotalUsd ?? null,
    });
    if (save)
      throw new Error(
        "Falha ao salvar. Tente retomar esta busca: " + save.message,
      );
    const { data: updated } = await client
      .from("lead_import_jobs")
      .select("*")
      .eq("id", id)
      .single();
    return Response.json(updated);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Falha ao processar." },
      { status: 400 },
    );
  }
}
