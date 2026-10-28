import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newLead,
  duplicate,
  importCsv,
  defaultConfig,
  configSchema,
} from "../src/lib/domain";
test("deduplica telefone com prefixo internacional", () => {
  assert.ok(
    duplicate(
      newLead({ phone: "+55 (11) 99999-8888" }),
      newLead({ phone: "11999998888" }),
    ),
  );
});
test("deduplica nomes com acentos e cidades normalizadas", () => {
  assert.ok(
    duplicate(
      newLead({ name: "Barbearía Atlas", city: "São Paulo" }),
      newLead({ name: "barbearia atlas ", city: "sao paulo" }),
    ),
  );
});
test("não duplica identificador de fontes diferentes", () => {
  assert.equal(
    duplicate(
      newLead({ name: "A", externalId: "1", source: "a" }),
      newLead({ name: "B", externalId: "1", source: "b" }),
    ),
    false,
  );
});
test("CSV aceita aspas e ponto e vírgula sem confirmar ausência de site", () => {
  const r = importCsv(
    'nome;cidade;telefone\n"Atlas; Studio";Curitiba;41999998888',
    [],
  );
  assert.equal(r.leads[0].name, "Atlas; Studio");
  assert.equal(r.leads[0].verification, "Possivelmente sem site");
});
test("CSV ignora duplicados no lote e linhas sem nome", () => {
  const r = importCsv("nome,cidade\nA,Curitiba\nA,Curitiba\n,Curitiba", []);
  assert.equal(r.leads.length, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.invalid, 1);
});
test("CSV impõe limite", () =>
  assert.throws(() => importCsv("nome\nA\nB", [], 1), /Limite/));
test("website informado não é classificado como ausência", () => {
  assert.equal(
    importCsv("nome,website\nA,https://example.com", []).leads[0].verification,
    "Possui site",
  );
});
test("configuração padrão válida não inventa serviços confirmados", () => {
  const c = defaultConfig(newLead({ name: "Atlas" }));
  assert.ok(configSchema.safeParse(c).success);
  assert.equal(c.services.length, 0);
});
test("configuração rejeita URL insegura e cores inválidas", () => {
  assert.equal(
    configSchema.safeParse({
      ...defaultConfig(newLead({ name: "Atlas" })),
      imageUrl: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    configSchema.safeParse({
      ...defaultConfig(newLead({ name: "Atlas" })),
      color: "red",
    }).success,
    false,
  );
});

test("oficina recebe template próprio e mantém dados comerciais", () => {
  const config = defaultConfig(
    newLead({
      name: "Oficina Teste",
      category: "Oficina mecânica",
      address: "Rua Comercial, 10",
      logoUrl: "https://example.com/logo.png",
      logoAuthorized: true,
      mapsUrl: "https://maps.app.goo.gl/exemplo",
    }),
  );
  assert.equal(config.templateId, "mechanic-pro");
  assert.equal(config.businessName, "Oficina Teste");
  assert.equal(config.address, "Rua Comercial, 10");
  assert.equal(config.logoAuthorized, true);
  assert.ok(configSchema.safeParse(config).success);
  assert.equal(
    configSchema.safeParse({
      ...config,
      mapsUrl: "https://evil.example/?google.com",
    }).success,
    false,
  );
});
test("configurações antigas continuam válidas e imagens inseguras são recusadas", () => {
  const config = defaultConfig(newLead({ name: "Atlas", category: "Barbearia" }));
  delete config.logoUrl;
  delete config.logoAuthorized;
  delete config.mapsUrl;
  delete config.gallery;
  delete config.about;
  assert.ok(configSchema.safeParse(config).success);
  assert.equal(
    configSchema.safeParse({ ...config, logoUrl: "javascript:alert(1)" })
      .success,
    false,
  );
});

