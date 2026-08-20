# Proeduka — contexto do projeto

Documento vivo: descreve o que foi implementado, decisões técnicas e referência para manutenção. **Atualize este arquivo** sempre que houver mudanças relevantes em funcionalidade, APIs ou convenções.

---

## Visão geral

- **App:** Next.js (App Router), TypeScript.
- **Auth / dados:** Postgres direto (`DATABASE_URL`; sessões JWT HTTP-only via `SESSION_SECRET`). Tabela de alunos: `NEXT_PUBLIC_ALUNOS_TABLE` (ou legado `NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE`), padrão `proeduka_alunos`.
- **Arquivos:** Backblaze B2 (API compatível com S3). Upload **via servidor** (`/api/b2/upload`) para evitar falha de CORS no PUT direto do navegador para o bucket.
- **Perfis:** `profiles` (roles `master`, `admin`). Alunos autenticam com e-mail que existe na tabela de alunos.

---

## Área do aluno (`/aluno`)

### Portal (`AlunoPortal`, `aluno-portal.tsx`)

- Cabeçalho com logo, link “Site”, logout.
- Bloco com **foto 3×4** (avatar), progresso de documentos, boas-vindas.
- **Documentos:** lista por `DOC_KEYS_ORDERED`; upload para B2 + atualização da coluna correspondente na tabela (valor truthy, ex. `"true"`).
- **Foto 3×4:** hover (ou toque em telas sem hover) mostra **×** para **remover**; remove objetos `avatar.<ext>` no B2 e grava coluna `"Foto estilo 3x4"` como **`"false"`** (pendente). Só `"true"` conta como entregue (`isTruthyFlag`).
- Mensagens de erro de rede: `networkErrorMessage` (`fetch-api-json.ts`).

### Formulário “Seus dados” (`AlunoDadosForm`, `aluno-dados-form.tsx`)

- Campos mapeados em `INFO_KEYS_ORDERED` / `INFO_LABELS` (`aluno-tabela.ts`).
- **Modo edição:** botões **Editar** / **Salvar** / **Cancelar**. Sem autosave por tecla; persistência ao **Salvar** via API do servidor (Postgres direto).
- **Somente leitura na UI:** curso, e-mail (e outras chaves em `READONLY`). **Ocultos na UI do aluno** (não renderizados): `unidade`, `consultor`, `final` (`HIDDEN_ON_ALUNO_UI`).
- **Normalização ao salvar** (`aluno-field-normalize.ts`): CPF só dígitos; CEP mascarado; data ISO → BR; **maiúsculas:** nome pai/mãe, profissão, naturalidade.
- **CEP:** ViaCEP no blur (modo edição) e/ou ao salvar se 8 dígitos; preenche endereço localmente antes do persist.
- **Sexo:** select Masculino / Feminino / Outro.
- **Ajuda:** botão **?** por campo (`INFO_HINTS`), texto em **pt-BR**.
- **UI:** bordas azul-acinzentadas (`BR_*`), rótulos em **negrito** (`font-bold text-slate-900`), texto dos inputs **`text-neutral-950`**, `text-[15px]` para legibilidade.

### Middleware

- Matcher **exclui** `api` (e estáticos) para não interferir nas rotas de API.

---

## Área administrativa (`/admin`)

- CRUD de alunos/admins conforme rotas existentes; uploads de staff podem usar o mesmo cliente `uploadFileToB2` / `deleteB2Objects`.
- **Webhooks (somente master):** `/admin/webhooks` — URLs em `webhook_endpoints`. APIs sob Postgres direto (`DATABASE_URL` no servidor).

---

## Webhooks

- **Eventos** (`lib/webhooks/events.ts`): `birthday` (aniversário), `data_updated` (dados ou arquivo atualizado). Extensível para novos tipos.
- **Disparo `data_updated`:** `POST /api/webhooks/dispatch` (autenticado: aluno do próprio `studentId` ou staff). Corpo: `{ "event": "data_updated", "studentId", "fileKey"? }`. Payload enviado às URLs: `student.name`, `student.email`, `fileUrl?` (URL assinada B2, servidor `lib/webhooks/b2-presign-get-server.ts`).
- **Chamadas no cliente:** `fireDataUpdatedWebhook` em `lib/client/webhook-dispatch-client.ts` — após salvar formulário do aluno, após upload/remoção de documentos no portal, uploads em `staff-student-uploads`.
- **Aniversários:** `GET /api/cron/webhooks/birthdays` com `Authorization: Bearer <CRON_SECRET>` (ou `CRON_WEBHOOK_SECRET`). Compara `dt_nasc` (BR ou ISO) com o dia/mês atual em `America/Sao_Paulo`; dispara `birthday` com `date` (YYYY-MM-DD). Na VPS, agendar chamada HTTP diária (ex.: crontab) no horário desejado; definir `CRON_SECRET` no `.env`.

---

## APIs B2

| Rota | Função |
|------|--------|
| `POST /api/b2/upload` | Multipart: `key`, `file`. Autenticação aluno (próprio `students/<uuid>/...`) ou staff. `PutObject` no servidor. |
| `POST /api/b2/delete` | JSON: `{ keys: string[] }`. `DeleteObject` por chave; mesma autorização. |
| `POST /api/b2/presign-get` | URL assinada para **leitura** (ex.: exibir avatar). |
| `POST /api/b2/presign-put` | Mantida; upload principal migrou para `/api/b2/upload`. |

Chaves e permissões: `lib/b2/object-keys.ts` (`assertStudentKeyAllowed`).

Documentos / chaves de arquivo: `lib/proeduka-doc-b2.ts` (`b2ObjectKeyForDoc`, `tableValueAfterUpload`, `tableValueDocPending`).

---

## Cliente (browser)

- `lib/client/b2-upload.ts` — `uploadFileToB2`, `deleteB2Objects`.
- `lib/client/b2-presign.ts` — `fetchPresignedGetUrl` (e presign PUT se ainda usado em algum fluxo).
- `lib/client/fetch-api-json.ts` — `readJsonResponse`, `networkErrorMessage`.

---

## Idioma e tom

- Interface do aluno em **português brasileiro** (você, salvar, arquivo, etc.).

---

## Variáveis de ambiente (referência)

- Postgres + sessão: `DATABASE_URL`, `SESSION_SECRET` (≥32 caracteres). Opcional: `AUTH_INSTANCE_ID`.
- Públicas embutidas no build: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ALUNOS_TABLE` (nome legado ainda aceite: `NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE`).
- B2: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_S3_ENDPOINT`, `B2_REGION` (opcional), `B2_BUCKET_NAME`.
- Cron webhooks: `CRON_SECRET` (ou `CRON_WEBHOOK_SECRET`).

---

## RLS e segurança

- Com Postgres próprio costuma usar-se um papel de servidor com bypass RLS ou políticas permissivas para o papel que `DATABASE_URL` utiliza na app.
- Não commitar segredos; rotacionar chaves se expostas.

---

## Changelog / histórico de implementação

_Use esta seção como log incremental. Copie o bloco modelo abaixo para cada entrega relevante._

### Modelo de entrada

```text
### YYYY-MM-DD — título curto
- O que mudou (bullets).
- Arquivos ou áreas tocadas (opcional).
```

### 2026-04-01 — documentação inicial (`context.md`)

- Criado este arquivo com visão geral do stack, área do aluno (portal + formulário com Editar/Salvar), B2 via upload/delete no servidor, remoção da foto 3×4, campos ocultos (`unidade`, `consultor`, `final`), normalização de dados e UI (contraste, pt-BR, ajuda por campo).
- Referência para manter o documento atualizado a cada implementação.

### 2026-04-01 — sistema de webhooks (master)

- Tabela `webhook_endpoints`, página `/admin/webhooks`, APIs CRUD, disparo `data_updated` (nome, e-mail, link opcional) e cron de aniversários (`birthday`). Cliente `fireDataUpdatedWebhook`; `GET /api/cron/webhooks/birthdays` + `CRON_SECRET` (cron na VPS).
- Migração: `supabase/migrations/003_webhook_endpoints.sql` (executar no Supabase).

---

## Como manter este documento

1. Após implementar uma funcionalidade ou alterar contrato de API, adicione uma entrada em **Changelog** com data e bullets objetivos.
2. Se mudar variáveis de ambiente, rotas ou regras de negócio, atualize as seções correspondentes (não só o changelog).
3. Mantenha tom técnico e direto; evite duplicar código inteiro — prefira caminhos de arquivo e nomes de funções.
