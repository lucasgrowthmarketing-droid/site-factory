import Papa from "papaparse";
import { z } from "zod";

export const stages = [
  "Novo lead",
  "Em qualificação",
  "Qualificado",
  "Demonstração criada",
  "Aguardando contato",
  "Contatado",
  "Respondeu",
  "Proposta enviada",
  "Cliente fechado",
  "Perdido",
] as const;
export const verifications = [
  "Possivelmente sem site",
  "Sem site confirmado",
  "Possui site",
  "Necessita revisão",
] as const;
export type Lead = {
  id: string;
  name: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  externalId: string;
  rating: number | null;
  reviews: number | null;
  verification: (typeof verifications)[number];
  stage: (typeof stages)[number];
  source: string;
  createdAt: string;
  verifiedAt: string | null;
  notes: string;
  fictional: boolean;
};
export type Activity = {
  id: string;
  leadId: string;
  text: string;
  createdAt: string;
};
export type Preview = {
  id: string;
  leadId: string;
  token: string;
  active: boolean;
  createdAt: string;
  config: SiteConfig;
};
export type SiteConfig = {
  businessName: string;
  city: string;
  address: string;
  phone: string;
  templateId: "barber-premium";
  color: string;
  headline: string;
  description: string;
  services: string[];
  imageUrl: string;
  font: "classic" | "modern";
};
export type Database = {
  views?: Record<string, number>;
  events?: { id: string; previewId: string; createdAt: string }[];
  leads: Lead[];
  previews: Preview[];
  activities: Activity[];
};
export const configSchema = z.object({
  businessName: z.string().trim().min(1).max(150),
  city: z.string().max(150),
  address: z.string().max(300),
  phone: z.string().max(40),
  templateId: z.literal("barber-premium"),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  headline: z.string().trim().min(1).max(180),
  description: z.string().max(1500),
  services: z.array(z.string().min(1).max(150)).max(20),
  imageUrl: z
    .string()
    .refine(
      (v) => !v || v === "/barber.svg" || /^https:\/\//.test(v),
      "Use uma URL HTTPS",
    ),
  font: z.enum(["classic", "modern"]),
});
export const phoneKey = (s: string) => {
  const p = s.replace(/\D/g, "");
  return p.length === 13 && p.startsWith("55") ? p.slice(2) : p;
};
const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export function duplicate(a: Lead, b: Lead) {
  return !!(
    (a.externalId &&
      b.externalId &&
      a.source === b.source &&
      a.externalId === b.externalId) ||
    (phoneKey(a.phone).length >= 10 &&
      phoneKey(a.phone) === phoneKey(b.phone)) ||
    (key(a.name) === key(b.name) && a.city && key(a.city) === key(b.city))
  );
}
export const isBarber = (category: string) => /barb|barber/i.test(category);
export function newLead(data: Partial<Lead>): Lead {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "Barbearia",
    city: "",
    address: "",
    phone: "",
    website: "",
    externalId: "",
    rating: null,
    reviews: null,
    verification: data.website ? "Possui site" : "Possivelmente sem site",
    stage: "Novo lead",
    source: "Cadastro manual",
    createdAt: new Date().toISOString(),
    verifiedAt: null,
    notes: "",
    fictional: false,
    ...data,
  };
}
export function defaultConfig(lead: Lead): SiteConfig {
  return {
    businessName: lead.name,
    city: lead.city,
    address: lead.address,
    phone: lead.phone,
    templateId: "barber-premium",
    color: "#bda16d",
    headline: "Estilo que carrega a sua identidade.",
    description:
      "Uma nova perspectiva para o seu cuidado. Este é um conceito visual demonstrativo, criado para apresentar as possibilidades do seu negócio na internet.",
    services: [],
    imageUrl: "/barber.svg",
    font: "classic",
  };
}
export function importCsv(text: string, existing: Lead[], limit = 500) {
  const parsed = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ""),
    { header: true, skipEmptyLines: "greedy", transformHeader: (h) => key(h) },
  );
  const errors = parsed.errors.filter(
    (e) => e.code !== "UndetectableDelimiter",
  );
  if (errors.length) throw new Error("CSV inválido: " + errors[0].message);
  if (
    !parsed.meta.fields?.some((h) =>
      ["nome", "name", "businessname"].includes(h),
    )
  )
    throw new Error("Inclua o cabeçalho nome no CSV.");
  if (parsed.data.length > limit)
    throw new Error(`Limite de ${limit} linhas por importação.`);
  const leads: Lead[] = [];
  let skipped = 0;
  let invalid = 0;
  for (const row of parsed.data) {
    const name = row.nome || row.name || row.businessname;
    if (!name?.trim()) {
      invalid++;
      continue;
    }
    const website = row.website || row.site || "";
    const lead = newLead({
      name: name.trim().slice(0, 150),
      category: row.categoria || row.category || "Barbearia",
      city: row.cidade || row.city || "",
      address: row.endereco || row["endereço"] || row.address || "",
      phone: row.telefone || row.phone || "",
      website,
      externalId: row.external_id || row.id || "",
      source: row.fonte || row.source || "CSV",
      fictional: /fict[ií]ci/i.test(row.fonte || row.source || name),
      verification: website ? "Possui site" : "Possivelmente sem site",
    });
    if ([...existing, ...leads].some((l) => duplicate(l, lead))) skipped++;
    else leads.push(lead);
  }
  return { leads, skipped, invalid };
}
export function seed(): Database {
  return {
    leads: [
      newLead({
        name: "Barbearia Atlas · Fictícia",
        city: "São Paulo",
        phone: "",
        source: "Exemplo fictício",
        stage: "Qualificado",
        fictional: true,
      }),
      newLead({
        name: "Studio Dom · Fictício",
        city: "Curitiba",
        source: "Exemplo fictício",
        fictional: true,
      }),
      newLead({
        name: "Barbearia Horizonte · Fictícia",
        city: "Porto Alegre",
        source: "Exemplo fictício",
        stage: "Em qualificação",
        fictional: true,
      }),
    ],
    previews: [],
    activities: [],
  };
}
