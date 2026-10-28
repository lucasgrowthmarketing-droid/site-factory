import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeApify } from "../src/lib/apify";
import { newLead } from "../src/lib/domain";
test("normaliza saída de Actor sem presumir ausência confirmada", () => {
  const r = normalizeApify(
    [
      {
        title: "Atlas",
        city: "Curitiba",
        phone: "+55 41 99999-0000",
        placeId: "a",
        totalScore: 4.8,
        reviewsCount: 45,
      },
    ],
    [],
    "Apify:test",
  );
  assert.equal(r.leads[0].verification, "Possivelmente sem site");
  assert.equal(r.leads[0].rating, 4.8);
  assert.equal(r.leads[0].externalId, "a");
});
test("normalizador trata inválidos, site e duplicados", () => {
  const existing = newLead({ name: "Atlas", city: "Curitiba" });
  const r = normalizeApify(
    [
      null,
      {},
      { name: "Atlas", city: "Curitiba" },
      { name: "Novo", website: "https://example.com" },
    ],
    [existing],
    "test",
  );
  assert.equal(r.invalid, 2);
  assert.equal(r.duplicates, 1);
  assert.equal(r.leads[0].verification, "Possui site");
});
