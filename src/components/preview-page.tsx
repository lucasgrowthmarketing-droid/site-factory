"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Barber from "./barber";
import { supabase } from "@/lib/supabase";
import { localRead, localWrite } from "@/lib/repository";
import { configSchema, type SiteConfig } from "@/lib/domain";
export default function PreviewPage({ token }: { token: string }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [status, setStatus] = useState("Carregando demonstração…");
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        let c: unknown;
        if (supabase) {
          const { data, error } = await supabase.rpc("get_public_preview", {
            access_token: token,
          });
          if (error) throw error;
          c = data;
        } else {
          const p = localRead().previews.find(
            (p) => p.token === token && p.active,
          );
          c = p?.config;
        }
        if (!c)
          throw new Error(
            "Demonstração indisponível ou desativada. No modo de teste, abra o link no mesmo navegador em que foi criado.",
          );
        const parsed = configSchema.parse(c);
        const eventKey = "sitefactory-view-" + token;
        if (!sessionStorage.getItem(eventKey)) {
          const eventId = crypto.randomUUID();
          sessionStorage.setItem(eventKey, eventId);
          if (supabase) {
            const { error } = await supabase.rpc("record_preview_view", {
              access_token: token,
              event_id: eventId,
            });
            if (error) sessionStorage.removeItem(eventKey);
          } else {
            const db = localRead();
            const preview = db.previews.find(
              (p) => p.token === token && p.active,
            );
            if (preview) {
              localWrite({
                ...db,
                events: [
                  ...(db.events ?? []),
                  {
                    id: eventId,
                    previewId: preview.id,
                    createdAt: new Date().toISOString(),
                  },
                ],
              });
              sessionStorage.setItem(eventKey, eventId);
            }
          }
        }
        if (live) setConfig(parsed);
      } catch (e) {
        if (live) setConfig(null);
        if (live)
          setStatus(
            e instanceof Error
              ? e.message
              : "Não foi possível abrir a demonstração.",
          );
      }
    }
    load();
    window.addEventListener("storage", load);
    return () => {
      live = false;
      window.removeEventListener("storage", load);
    };
  }, [token]);
  return config ? (
    <Barber config={config} />
  ) : (
    <main className="preview-status">
      <h1>SiteFactory</h1>
      <p>{status}</p>
      <Link href="/">Voltar à plataforma</Link>
    </main>
  );
}
