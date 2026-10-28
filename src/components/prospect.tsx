"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
type Job = {
  id: string;
  status: string;
  imported_count: number;
  details: {
    city: string;
    niche: string;
    generated?: number;
    offset?: number;
    costUsd?: number;
    error?: string;
  };
};
export default function Prospect({ onUpdated }: { onUpdated: () => void }) {
  const [city, setCity] = useState("Porto Alegre, RS"),
    [niche, setNiche] = useState("Ambos"),
    [limit, setLimit] = useState(100),
    [budget, setBudget] = useState(0.5),
    [authorized, setAuthorized] = useState(false),
    [jobs, setJobs] = useState<Job[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const requestId = useRef<string | null>(null),
    running = useRef(false),
    updated = useRef(onUpdated);
  useEffect(() => { updated.current = onUpdated; }, [onUpdated]);
  async function api(method: string, body?: unknown) {
    const { data } = await supabase!.auth.getSession();
    const r = await fetch("/api/prospect", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    return result;
  }
  useEffect(() => {
    if (!supabase) return;
    let stopped = false;
    async function tick() {
      if (running.current) return;
      running.current = true;
      try {
        const list: Job[] = await api("GET");
        if (stopped) return;
        setJobs(list);
        const active = list.find((j) =>
          ["collecting", "processing"].includes(j.status),
        );
        if (active) {
          const result: Job = await api("PATCH", { id: active.id });
          if (!stopped) {
            setJobs(list.map((j) => (j.id === result.id ? result : j)));
            if (result.status === "completed" || result.status === "processing")
              updated.current();
          }
        }
      } catch (e) {
        if (!stopped)
          setMessage(e instanceof Error ? e.message : "Falha de conexão.");
      } finally {
        running.current = false;
      }
    }
    void tick();
    const timer = setInterval(() => void tick(), 8000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  if (!supabase)
    return (
      <p className="hint">
        A prospecção automática fica disponível no ambiente conectado.
      </p>
    );
  return (
    <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
      <h2>Encontrar leads e gerar sites</h2>
      <p className="hint">
        Busca no Google Maps, separa empresas sem website informado e cria suas
        vitrines automaticamente. A falta de website na fonte ainda precisa de
        confirmação.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setMessage("");
          requestId.current ??= crypto.randomUUID();
          try {
            const job = await api("POST", {
              requestId: requestId.current,
              city,
              niche,
              limit,
              budget,
              authorized,
            });
            setJobs((current) => [
              job,
              ...current.filter((j) => j.id !== job.id),
            ]);
            requestId.current = null;
            setMessage("Busca iniciada. Você pode acompanhar abaixo.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Falha ao iniciar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Cidade / região
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label>
            Nicho
            <select value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option>Ambos</option>
              <option>Barbearia</option>
              <option>Oficina mecânica</option>
            </select>
          </label>
          <label>
            Máximo por nicho
            <input
              type="number"
              min="1"
              max="500"
              required
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </label>
          <label>
            Limite de gasto total (US$)
            <input
              type="number"
              min="0.05"
              max="10"
              step="0.05"
              required
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
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
          Autorizo esta coleta na Apify até US$ {budget.toFixed(2)} e o uso dos
          dados comerciais.
        </label>
        <button
          className="primary"
          disabled={
            busy ||
            jobs.some((j) =>
              ["starting", "collecting", "processing"].includes(j.status),
            )
          }
        >
          {busy ? "Iniciando…" : "Buscar e gerar demonstrações"}
        </button>
      </form>
      {message && (
        <p role="status" className="hint">
          {message}
        </p>
      )}
      <p className="hint">
        A coleta continua na Apify se você fechar a página. O processamento
        retoma automaticamente quando voltar a Leads.
      </p>
      {jobs.map((j) => (
        <article
          key={j.id}
          style={{ borderTop: "1px solid #293640", padding: "14px 0" }}
        >
          <strong>
            {j.details.niche} · {j.details.city}
          </strong>
          <p>
            {(
              {
                starting: "Iniciando",
                collecting: "Coletando",
                processing: "Gerando sites",
                completed: "Concluído",
                attention: "Precisa de atenção",
                failed: "Falhou",
              } as Record<string, string>
            )[j.status] ?? j.status}{" "}
            · {j.imported_count ?? 0} leads · {j.details.generated ?? 0} sites ·{" "}
            {j.details.offset ?? 0} resultados processados
          </p>
          {j.details.costUsd != null && (
            <small>Custo informado: US$ {j.details.costUsd.toFixed(3)}</small>
          )}
          {j.details.error && <p role="alert">{j.details.error}</p>}
        </article>
      ))}
    </section>
  );
}
