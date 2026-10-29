# SiteFactory

MVP em Next.js 16 + TypeScript + Tailwind CSS, ícones Lucide e Supabase. Fases 1, 2 e 3 implementadas no código; integração remota depende das variáveis e da aplicação da migration.

## Rodar

Node 24 e npm. Execute `npm ci`, `npm run dev` e acesse http://localhost:3000. Sem variáveis Supabase, a tela oferece um ambiente de teste identificado, com dados no localStorage. Não é autenticação, backup ou armazenamento compartilhado. Links de vitrines desse modo funcionam apenas no mesmo navegador e origem. Exemplos fictícios são opcionais em Configurações; o painel começa vazio.

## Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/migrations/202610270001_foundation.sql` no SQL Editor, ou use a CLI Supabase com `supabase db push`.
3. Copie `.env.example` para `.env.local`. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e chave pública anon do projeto. Nunca coloque service_role no cliente.
4. Crie os operadores em Authentication > Users no Supabase. Desabilite novos cadastros públicos se o projeto for exclusivamente interno. O app não oferece cadastro.
5. Reinicie o servidor. O modo de teste desaparece e login por e-mail/senha passa a ser obrigatório. As tabelas internas possuem RLS por proprietário. Nesta versão, cada operador possui seus próprios registros; colaboração entre operadores não está implementada.

A tabela de leads usa um documento tipado e colunas geradas indexadas para nome, nicho, cidade, telefone, etapa, presença e origem. Isso preserva o contrato TypeScript sem duplicar atualizações. Vitrines e atividades têm chaves estrangeiras que também validam o proprietário. Fontes, import jobs e app settings estão preparados para a fase 4; a interface CSV aplica limite fixo de 500 registros / 2 MB nesta versão.

## Fluxo

Cadastrar/importar CSV → qualificar → gerar vitrine → editar formulário → salvar → abrir/copiar link. Uma nova vitrine cria apenas dados de configuração. Não cria arquivos, deploy ou chamadas de LLM. Apenas barbearias têm template disponível. O pipeline admite dez etapas. A ausência de website no CSV gera indício, não confirmação.

CSV aceita vírgulas/ponto e vírgula e campos com aspas. Cabeçalho `nome` obrigatório; opcionais: categoria, cidade, telefone, endereco, website, external_id, fonte. Deduplica por fonte/ID externo, telefone normalizado, ou nome/cidade. Exemplo: `public/exemplo-leads.csv`. Datas de coleta, fonte e verificação são preservadas, e interações podem ser registradas nos detalhes do lead.

As vitrines têm tokens aleatórios de 256 bits e são consultadas pela RPC `get_public_preview`. A RPC retorna somente configuração de uma vitrine ativa: não retorna dados de CRM. O token é uma credencial de acesso por posse do link. Desative a vitrine para interromper novas consultas. Uma página já carregada pode continuar visível até ser atualizada. Todas as páginas têm noindex/nofollow e robots bloqueia indexação. Não existe sitemap. Botões de contato são demonstrativos e não iniciam mensagens/telefonemas.

## Templates e imagens

`src/components/barber.tsx` renderiza `SiteConfig`; `src/lib/domain.ts` contém tipos, validação e configuração padrão. Para adicionar um nicho, crie outro componente, registre seu ID em `templates`, amplie schema/seleção por categoria e mantenha o mesmo contrato de configuração persistida. Não gere código por empresa.

A ilustração SVG local foi criada para o projeto e é identificada como conceitual. Não há fotos, marcas, depoimentos, preços ou horários atribuídos a empresas sem confirmação. Imagens externas exigem URL HTTPS e autorização do operador; podem fazer requisições ao provedor da imagem.

## GitHub e Vercel

Importe o repositório na Vercel, com framework Next.js e diretório raiz do repositório. Instalação: `npm ci`; build: `npm run build`; Node 24. Sem variáveis, publica o sandbox para validação. Para operação real, configure as duas variáveis Supabase em Production e Preview, aplique a migration e faça novo deploy. Não envie `.env.local` ou credenciais ao GitHub.

## Validação

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Testes verificam normalização, CSV, deduplicação, limites e configurações de template. Integração Supabase e políticas precisam ser validadas no projeto provisionado: a existência de código/migration não prova integração ativa.

## Pendente

Fase 4: Apify, credencial exclusivamente no servidor, adaptadores, limite configurável persistido, logs de jobs e custos. Não há integração Apify ativa nem chamadas automáticas. Fase 5: eventos de visualização sem PII, dashboard avançado com período/nicho/cidade, refinamentos e testes remotos. Os indicadores atuais são contagens dos registros existentes, sem números inventados. Eventos de acesso e métricas de visualização não estão implementados. Colaboração entre operadores e site definitivo/domínio próprio são etapas futuras.

## Interface de operação

O dashboard usa o design de referência: grafite, verde-menta, busca global (Ctrl/Cmd+K), filtro de período, funil com seis etapas, oportunidades e atividades recentes. O período considera a data de cadastro dos leads e de criação das vitrines; o funil mostra o estágio atual desses leads. O feed é composto por cadastros, vitrines e interações realmente existentes. Nenhum ganho percentual, receita ou prazo de assinatura é simulado.

A imagem conceitual e a documentação do prompt estão em ASSETS.md. Todo o código de apresentação do dashboard está em src/components/dashboard.tsx e src/app/workspace.css.

## Entrega das fases 4 e 5 (28/10/2026)

Implementado: importação Apify autenticada no servidor, datasets/execuções/última execução concluída de Actor, normalização, limites de lote, deduplicação, histórico, falhas e custo disponível da execução. Nenhum Actor é iniciado automaticamente. Configure APIFY_TOKEN como segredo na Vercel. A implementação usa os endpoints documentados em https://docs.apify.com/api/v2 e autorização Bearer.

Aplique também a migration `202610280001_imports_and_analytics.sql`. Ela adiciona jobs idempotentes, importação transacional, eventos sem IP/user-agent e contagem de visualizações. Um acesso é registrado por sessão de aba, não representa visitantes únicos. CSV usa o mesmo histórico no Supabase. Dashboard oferece período, cidade, nicho e acessos acumulados; a contagem de acessos está explicitamente rotulada como total acumulado.

Validação: testes de domínio/normalização e build; migrations executadas em PostgreSQL local (PGlite), incluindo isolamento de proprietário, acesso público restrito, idempotência dos eventos e desativação. Isso não substitui a validação com credenciais e dados autorizados na infraestrutura real.

Bloqueio de provisionamento identificado: conta Supabase no limite de projetos gratuitos. Nenhum projeto existente foi pausado, excluído ou atualizado para plano pago. Integração real ainda depende de liberar uma vaga/selecionar projeto e configurar as variáveis; não deve ser considerada homologada até o teste remoto.

## Ambiente de produção conectado (28/10/2026)

SiteFactory conectado ao projeto Supabase existente `supabase-cordovan-engine` (`kxtdyqhorflvbhryyauu`), por autorização do proprietário. As duas migrations foram executadas com sucesso pelo SQL Editor. Antes da instalação foram verificadas as tabelas e funções existentes: as quatro tabelas `audit_*` foram preservadas. URL e chave publicável foram configuradas na Vercel, e APIFY_TOKEN foi salvo como segredo de produção.

Validação remota: as tabelas internas negam acesso anônimo; `get_public_preview` aceita a chave pública e retorna null para token inválido. Endpoint Apify exige sessão autenticada (401 sem sessão). Publicação de infraestrutura: READY. A criação da senha do operador exige ação do proprietário no Supabase; os testes autenticados de ponta a ponta ainda dependem dessa conta.

A execução antiga do Google Maps Scraper aparece no histórico de uso, mas a lista atual de runs está vazia por retenção. Para homologar importação de dados reais, será necessário fornecer um dataset atual autorizado ou executar uma nova coleta com limite/custo aprovado. Nenhuma nova coleta paga foi iniciada.

### Templates comerciais completos

Barbearias (`barber-premium`) e oficinas mecânicas (`mechanic-pro`) possuem páginas completas com fotografias, serviços sugeridos, apresentação, processo, galeria, perguntas frequentes e localização. Catálogo público: `/templates/barber-premium` e `/templates/mechanic-pro`.

Nome, endereço e cidade vêm do lead. `logoUrl` só é exibida quando `logoAuthorized` está habilitado. `mapsUrl` aceita links HTTPS do Google Maps; sem link, a localização usa nome e endereço, mediante clique do visitante. Sem endereço completo, nenhum pin exato é inventado. Campos também disponíveis no editor; até oito imagens HTTPS próprias na galeria. Apify aceita `logoUrl`/`logo`, `googleMapsUrl`/`mapsUrl`/`url` (apenas Maps). CSV aceita `logo_url`, `logo_autorizada=sim` e `maps_url`.

Aplicar também a migração `supabase/migrations/202610280002_mechanic_template.sql`, que habilita o segundo template e sincroniza sua identificação no banco.

## Operação validada em 29/10/2026

Em Leads, escolha cidade, nicho, máximo por nicho e teto total em dólares; confirme a coleta e clique em Buscar e gerar demonstrações. A Apify respeita `maxTotalChargeUsd`. Resultados sem website informado e de nicho compatível recebem uma vitrine automaticamente. Ausência de website no Maps é indício: revise a presença digital no cadastro antes da abordagem comercial. Os demais resultados são preservados para revisão.

A coleta continua na Apify com a página fechada; o processamento em lotes retoma ao abrir Leads. Cada lote é transacional e idempotente. Não é um processamento permanente em segundo plano. Links `/preview/token` ficam salvos em Vitrines e não mudam ao editar. Não há deploy nem chamada de IA por lead.

Logo: enviar PNG/JPG/WebP, arrastar ou colar Ctrl+V no cadastro/editor. Conversão automática até 512px e 192KB, bucket público `sitefactory-logos` com escrita isolada por proprietário. O envio via colagem foi validado em produção, incluindo persistência e carregamento no mesmo link público. Imagens candidatas da fonte podem ser escolhidas manualmente; fotos do Google Maps não são identificadas automaticamente como logos.

Migrations adicionais aplicadas: `202610280003_logo_uploads.sql` e `202610280004_prospect.sql`. Homologação real: 84 leads importados, 50 vitrines criadas, custo informado US$ 0,498 (teto US$ 0,50). O painel total inclui também um lead/vitrine fictício anterior.
