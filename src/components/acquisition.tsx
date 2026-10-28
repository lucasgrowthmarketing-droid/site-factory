"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Acquisition({
  onImported,
}: {
  onImported: () => void;
}) {
  const [kind, setKind] = useState("dataset"),
    [id, setId] = useState(""),
    [limit, setLimit] = useState(100),
    [offset, setOffset] = useState(0),
    [authorized, setAuthorized] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  async function refresh() {
    if (!supabase) return;
    const { data, error } = await supabase!
      .from("lead_import_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error)
      setMessage(
        "Aplique a migration de importações para habilitar o histórico.",
      );
    else setJobs(data ?? []);
  }
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase!.auth.getSession();
      const response = await fetch("/api/import/apify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ kind, id, limit, offset, authorized }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        `${result.imported} importados · ${result.duplicates} duplicados · ${result.invalid} inválidos. Próximo offset: ${result.nextOffset}.`,
      );
      onImported();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha de conexão.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }
  return (
    <details className="panel" style={{ padding: 20, marginBottom: 20 }}>
      <summary style={{ cursor: "pointer" }}>
        Importar da Apify e consultar histórico
      </summary>
      <p className="hint">
        Importe um dataset ou resultados de uma execução concluída de um Actor
        autorizado. Nenhuma nova coleta é iniciada.
      </p>
      {supabase ? (
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Origem
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="dataset">Dataset</option>
                <option value="run">Execução concluída</option>
                <option value="actor">
                  Última execução concluída do Actor
                </option>
              </select>
            </label>
            <label>
              Identificador
              <input
                required
                pattern="[\w~\-]{3,100}"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </label>
            <label>
              Limite por lote
              <input
                type="number"
                required
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </label>
            <label>
              Offset (posição inicial)
              <input
                type="number"
                required
                min={0}
                max={100000}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              required
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
            />{" "}
            Confirmo que tenho autorização para utilizar esses dados.
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Importando…" : "Importar lote"}
          </button>
        </form>
      ) : (
        <p>
          Conecte o Supabase e configure APIFY_TOKEN no servidor para habilitar
          a importação.
        </p>
      )}
      {message && (
        <p role="status" className="hint">
          {message}
        </p>
      )}
      {supabase && (
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={async () => {
            const { data } = await supabase!.auth.getUser();
            if (!data.user) return;
            const { error } = await supabase!
              .from("app_settings")
              .upsert({ owner_id: data.user.id, import_limit: limit });
            setMessage(
              error ? error.message : "Limite por lote salvo: " + limit,
            );
          }}
        >
          Salvar limite por lote ({limit})
        </button>
      )}
      <button
        className="text-button"
        type="button"
        onClick={() => void refresh()}
      >
        Atualizar histórico
      </button>
      <h3 style={{ marginTop: 20 }}>Últimas importações</h3>
      {jobs.map((job) => (
        <div
          key={String(job.id)}
          style={{
            borderBottom: "1px solid #293640",
            padding: "12px 0",
            fontSize: 12,
          }}
        >
          {new Date(String(job.created_at)).toLocaleString("pt-BR")} ·{" "}
          {String(job.status)} · {String(job.imported_count)} importados
          <p className="hint">{JSON.stringify(job.details)}</p>
        </div>
      ))}
      {!jobs.length && (
        <p className="hint">Nenhuma importação remota registrada.</p>
      )}
    </details>
  );
}
