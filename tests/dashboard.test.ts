import { test } from "node:test";
import assert from "node:assert/strict";
import { activityFeed, dashboardData } from "../src/lib/dashboard";
import { newLead, defaultConfig, type Database } from "../src/lib/domain";
const now = Date.parse("2026-10-27T15:00:00Z");
test("dashboard aplica período e conta etapas avançadas sem incluir leads perdidos", () => {
  const db: Database = {
    leads: [
      newLead({
        name: "Atual",
        stage: "Proposta enviada",
        createdAt: "2026-10-25T12:00:00Z",
      }),
      newLead({
        name: "Antigo",
        stage: "Cliente fechado",
        createdAt: "2026-08-01T12:00:00Z",
      }),
      newLead({
        name: "Perdido",
        stage: "Perdido",
        createdAt: "2026-10-20T12:00:00Z",
      }),
    ],
    previews: [],
    activities: [],
  };
  const data = dashboardData(db, 30, now);
  assert.equal(data.leads.length, 2);
  assert.equal(data.qualified, 1);
  assert.equal(data.closed, 0);
  assert.equal(data.funnel.find((f) => f.label === "Contatados")?.value, 1);
  assert.equal(dashboardData(db, 0, now).closed, 1);
});
test("funil conta empresas distintas com demonstração", () => {
  const lead = newLead({ name: "Atlas", createdAt: "2026-10-25T12:00:00Z" });
  const p = {
    id: "p",
    leadId: lead.id,
    token: "token",
    active: true,
    createdAt: "2026-10-26T12:00:00Z",
    config: defaultConfig(lead),
  };
  const db: Database = {
    leads: [lead],
    previews: [p, { ...p, id: "p2" }],
    activities: [],
  };
  assert.equal(
    dashboardData(db, 30, now).funnel.find((f) => f.label === "Demonstrações")
      ?.value,
    1,
  );
});
test("feed usa somente registros existentes e ordena do mais recente", () => {
  const lead = newLead({ name: "Atlas", createdAt: "2026-10-25T12:00:00Z" });
  const db: Database = {
    leads: [lead],
    previews: [],
    activities: [
      {
        id: "a",
        leadId: lead.id,
        text: "Contato registrado",
        createdAt: "2026-10-26T12:00:00Z",
      },
    ],
  };
  const feed = activityFeed(db);
  assert.equal(feed.length, 2);
  assert.equal(feed[0].title, "Contato registrado");
  assert.equal(feed[0].detail, "Atlas");
  assert.equal(
    activityFeed({ leads: [], previews: [], activities: [] }).length,
    0,
  );
});
