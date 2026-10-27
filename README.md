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
