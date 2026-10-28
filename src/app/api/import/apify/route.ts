import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeApify } from "@/lib/apify";
export const runtime = "nodejs";
const schema = z.object({
  kind: z.enum(["dataset", "run", "actor"]),
  id: z.string().regex(/^[\w~-]{3,100}$/),
  limit: z.number().int().min(1).max(500),
  offset: z.number().int().min(0).max(100000),
  authorized: z.literal(true),
});
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    token = process.env.APIFY_TOKEN;
  if (!url || !key)
    return NextResponse.json(
      { error: "Configure o Supabase para importar dados externos." },
      { status: 503 },
    );
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer "))
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await client.auth.getUser(
    authorization.slice(7),
  );
  if (authError || !auth.user)
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!token)
    return NextResponse.json(
      { error: "Configure APIFY_TOKEN no servidor da Vercel." },
      { status: 503 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Informe origem, identificador, limite e autorização válidos." },
      { status: 400 },
    );
  const input = parsed.data,
    owner = auth.user.id;
  const { data: settings, error: settingsError } = await client
    .from("app_settings")
    .select("import_limit")
    .eq("owner_id", owner)
    .maybeSingle();
  if (settingsError)
    return NextResponse.json(
      { error: "Aplique as migrations do banco." },
      { status: 503 },
    );
  if (input.limit > (settings?.import_limit ?? 500))
    return NextResponse.json(
      { error: "Volume superior ao limite configurado." },
      { status: 400 },
    );
  const get = async (path: string) => {
    const response = await fetch("https://api.apify.com/v2/" + path, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        `Apify respondeu HTTP ${response.status}. Verifique permissão e identificador.`,
      );
    return response.json();
  };
  let jobId: string | undefined;
  try {
    let dataset = input.id,
      cost: number | null = null;
    if (input.kind !== "dataset") {
      const run = await get(
        input.kind === "run"
          ? `actor-runs/${input.id}`
          : `acts/${input.id}/runs/last?status=SUCCEEDED`,
      );
      if (run.data?.status !== "SUCCEEDED" || !run.data?.defaultDatasetId)
        throw new Error("Nenhuma execução concluída disponível.");
      dataset = run.data.defaultDatasetId;
      cost =
        typeof run.data.usageTotalUsd === "number"
          ? run.data.usageTotalUsd
          : null;
    }
    if (!/^[\w~-]{3,100}$/.test(dataset))
      throw new Error("Dataset retornado inválido.");
    const requestKey = `apify:${dataset}:${input.offset}:${input.limit}`;
    const { data: prior, error: priorError } = await client
      .from("lead_import_jobs")
      .select("id,status,updated_at")
      .eq("request_key", requestKey)
      .maybeSingle();
    if (priorError) throw new Error("Aplique a migration de importações.");
    if (prior && prior.status !== "failed")
      return NextResponse.json(
        {
          error:
            "Este lote já foi solicitado. Consulte o histórico ou utilize o próximo offset.",
        },
        { status: 409 },
      );
    jobId = prior?.id || crypto.randomUUID();
    const { error: claim } = await client.from("lead_import_jobs").upsert({
      id: jobId,
      owner_id: owner,
      request_key: requestKey,
      status: "running",
      details: {
        kind: input.kind,
        sourceId: input.id,
        dataset,
        offset: input.offset,
        limit: input.limit,
        costUsd: cost,
      },
    });
    if (claim) throw new Error("Lote em andamento ou indisponível.");
    const rows = await get(
      `datasets/${dataset}/items?format=json&clean=true&offset=${input.offset}&limit=${input.limit}`,
    );
    if (!Array.isArray(rows) || rows.length > input.limit)
      throw new Error("Resposta do dataset inválida.");
    const existing = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("business_leads")
        .select("data")
        .range(offset, offset + 999);
      if (error) throw new Error("Falha ao consultar duplicidades.");
      existing.push(...(data ?? []).map((r) => r.data));
      if (!data || data.length < 1000) break;
    }
    const result = normalizeApify(rows, existing, `Apify:${dataset}`);
    const { error: save } = await client.rpc("import_lead_batch", {
      job_id: jobId,
      lead_data: result.leads,
      summary: {
        received: rows.length,
        duplicates: result.duplicates,
        invalid: result.invalid,
        costUsd: cost,
        dataset,
        offset: input.offset,
        limit: input.limit,
      },
    });
    if (save)
      throw new Error(
        "Não foi possível salvar o lote. Recarregue os leads e tente novamente.",
      );
    return NextResponse.json({
      imported: result.leads.length,
      duplicates: result.duplicates,
      invalid: result.invalid,
      received: rows.length,
      nextOffset: input.offset + rows.length,
      costUsd: cost,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha na importação.";
    if (jobId)
      await client
        .from("lead_import_jobs")
        .update({ status: "failed", details: { error: message } })
        .eq("id", jobId);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
