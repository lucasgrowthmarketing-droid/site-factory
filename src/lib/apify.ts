import { newLead, duplicate, isMapsUrl, type Lead } from "./domain";
export function normalizeApify(
  rows: unknown[],
  existing: Lead[],
  source: string,
) {
  const leads: Lead[] = [];
  let duplicates = 0,
    invalid = 0;
  for (const value of rows) {
    if (!value || typeof value !== "object") {
      invalid++;
      continue;
    }
    const r = value as Record<string, unknown>;
    const str = (...keys: string[]) => {
      for (const k of keys)
        if (typeof r[k] === "string" && String(r[k]).trim())
          return String(r[k]).trim();
      return "";
    };
    const name = str("title", "name", "businessName", "nome");
    if (!name) {
      invalid++;
      continue;
    }
    const website = str("website", "websiteUrl", "urlWebsite");
    const number = (...keys: string[]) => {
      for (const k of keys) {
        if (
          r[k] !== null &&
          r[k] !== undefined &&
          r[k] !== "" &&
          Number.isFinite(Number(r[k]))
        )
          return Number(r[k]);
      }
      return null;
    };
    const lead = newLead({
      name: name.slice(0, 150),
      category: str("categoryName", "category", "categoria") || "Não informado",
      city: str("city", "cidade"),
      address: str("address", "street", "endereco"),
      phone: str("phone", "phoneUnformatted", "telefone"),
      website,
      logoUrl: str("logoUrl", "logo"),
      logoCandidates: [
        str("imageUrl"),
        ...(Array.isArray(r.imageUrls) ? r.imageUrls : []),
      ]
        .filter(
          (v): v is string => typeof v === "string" && v.startsWith("https://"),
        )
        .slice(0, 4),
      logoAuthorized: r.logoAuthorized === true,
      mapsUrl: isMapsUrl(str("googleMapsUrl", "mapsUrl", "url"))
        ? str("googleMapsUrl", "mapsUrl", "url")
        : "",
      externalId: str("placeId", "cid", "id", "externalId"),
      source,
      rating: number("totalScore", "rating", "stars"),
      reviews: number("reviewsCount", "reviewCount"),
      verification: website ? "Possui site" : "Possivelmente sem site",
    });
    if ([...existing, ...leads].some((x) => duplicate(x, lead))) duplicates++;
    else leads.push(lead);
  }
  return { leads, duplicates, invalid };
}
