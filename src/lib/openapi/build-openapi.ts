import { DOCUMENT_UPLOAD_CATALOG, FOTO_3X4_CATALOG } from "@/lib/api/document-upload-catalog";
import { listStudentPatchableKeys } from "@/lib/api/student-patch-v1";

const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

/** OpenAPI 3.0 — documentação da API externa (chave `pek_…`). */
export function buildOpenApiDocument(baseUrl: string): Record<string, unknown> {
  const patchKeys = listStudentPatchableKeys().join(", ");

  const documentExamplesPresign: Record<
    string,
    { summary: string; value: { key: string; contentType: string } }
  > = {};
  for (const d of DOCUMENT_UPLOAD_CATALOG) {
    const slug = d.b2_slug;
    const id = `presign_${slug}`;
    documentExamplesPresign[id] = {
      summary: d.label,
      value: {
        key: `students/${PLACEHOLDER_UUID}/documents/${slug}.pdf`,
        contentType: "application/pdf",
      },
    };
  }
  documentExamplesPresign.presign_foto_3x4 = {
    summary: FOTO_3X4_CATALOG.label,
    value: {
      key: `students/${PLACEHOLDER_UUID}/avatar.jpg`,
      contentType: "image/jpeg",
    },
  };

  const patchDocExamples: Record<string, { summary: string; value: Record<string, string> }> =
    {};
  for (const d of DOCUMENT_UPLOAD_CATALOG) {
    const id = `patch_${d.b2_slug}`;
    patchDocExamples[id] = {
      summary: `Marcar enviado: ${d.label}`,
      value: { [d.column_key]: "true" },
    };
  }
  patchDocExamples.patch_foto = {
    summary: "Marcar enviado: foto 3×4",
    value: { [FOTO_3X4_CATALOG.column_key]: "true" },
  };

  return {
    openapi: "3.0.3",
    info: {
      title: "Proeduka API",
      version: "1.0.0",
      description:
        "Autenticação: `Authorization: Bearer <pek_…>` ou header `X-API-Key`. " +
        "Fluxo de **documentos**: ver tag **Documentos** — `GET /api/v1/documents/catalog`, " +
        "`POST /api/b2/presign-put`, `PUT` no URL, `PATCH /api/v1/students/{id}`.",
    },
    servers: [{ url: baseUrl }],
    tags: [
      {
        name: "Alunos",
        description: "CRUD e filtros na tabela de alunos (`/api/v1/students`).",
      },
      {
        name: "Documentos",
        description:
          "Upload no B2: (1) `GET /api/v1/documents/catalog` — colunas e slugs; " +
          "(2) `POST /api/b2/presign-put` — URL assinada; (3) `PUT` do ficheiro; " +
          "(4) `PATCH /api/v1/students/{id}` — coluna do documento = `\"true\"`.",
      },
      {
        name: "Armazenamento B2",
        description: "URLs pré-assinadas Backblaze (`/api/b2/presign-put`, `/api/b2/presign-get`).",
      },
      {
        name: "Administradores",
        description: "Criar conta admin ou master (`as_master` em `/api/v1/admins`).",
      },
      {
        name: "Cursos",
        description:
          "Catálogo de cursos e atribuição a alunos (`/api/v1/cursos`, " +
          "`/api/v1/students/{id}/courses`).",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Alternativa ao Bearer.",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
        },
      },
      schemas: {
        DocumentCatalogItem: {
          type: "object",
          required: ["label", "column_key", "b2_slug", "key_example"],
          properties: {
            label: { type: "string", example: "Identidade (RG)" },
            column_key: { type: "string", description: "Nome da coluna no PATCH" },
            b2_slug: { type: "string", description: "Nome do ficheiro em documents/" },
            key_example: {
              type: "string",
              example: `students/${PLACEHOLDER_UUID}/documents/identidade.pdf`,
            },
          },
        },
        DocumentsCatalogResponse: {
          type: "object",
          required: ["documents", "foto_3x4", "flow"],
          properties: {
            documents: {
              type: "array",
              items: { $ref: "#/components/schemas/DocumentCatalogItem" },
            },
            foto_3x4: {
              type: "object",
              properties: {
                label: { type: "string" },
                column_key: { type: "string" },
                key_example: { type: "string" },
                note: { type: "string" },
              },
            },
            flow: {
              type: "array",
              items: { type: "string" },
              example: [
                "POST /api/b2/presign-put",
                "PUT ficheiro",
                "PATCH /api/v1/students/{id}",
              ],
            },
          },
        },
        PresignPutRequest: {
          type: "object",
          required: ["key"],
          properties: {
            key: {
              type: "string",
              description: "Caminho completo no bucket (ver catálogo de documentos).",
            },
            contentType: {
              type: "string",
              example: "application/pdf",
            },
          },
        },
        PresignGetRequest: {
          type: "object",
          required: ["key"],
          properties: {
            key: { type: "string" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
    paths: {
      "/api/v1/documents/catalog": {
        get: {
          tags: ["Documentos"],
          operationId: "documentsCatalog",
          summary: "Catálogo de documentos (colunas + chaves B2)",
          description:
            "Lista os documentos de ficheiro e a foto 3×4. " +
            "Substitua o UUID de exemplo pelo `id` real do aluno nos `key_example` ao pedir presign.\n\n" +
            "**curl**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/documents/catalog"\n` +
            "```",
          responses: {
            "200": {
              description: "Catálogo e passos do fluxo",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DocumentsCatalogResponse" },
                },
              },
            },
            "401": { description: "Chave inválida" },
          },
        },
      },
      "/api/v1/students": {
        get: {
          tags: ["Alunos"],
          operationId: "listStudents",
          summary: "Listar alunos (filtros opcionais)",
          description:
            "**curl (e-mail)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students?email=aluno@exemplo.com"\n` +
            "```\n\n" +
            "**curl (CPF dígitos)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students?cpf=12345678901"\n` +
            "```\n\n" +
            "**curl (telefone dígitos)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students?telefone=11999998888"\n` +
            "```\n\n" +
            "**curl (nome ilike)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students?nome=Maria&limit=20&offset=0"\n` +
            "```",
          parameters: [
            { name: "email", in: "query", schema: { type: "string" } },
            { name: "cpf", in: "query", schema: { type: "string" } },
            { name: "telefone", in: "query", schema: { type: "string" } },
            { name: "nome", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "Lista em `students`",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      students: { type: "array", items: { type: "object" } },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                    },
                  },
                },
              },
            },
            "401": { description: "Chave inválida" },
          },
        },
        post: {
          tags: ["Alunos"],
          operationId: "createStudent",
          summary: "Criar aluno (Auth + linha na tabela)",
          description:
            "**curl**\n```bash\n" +
            `curl -sS -X POST "${baseUrl}/api/v1/students" \\\n` +
            `  -H "Authorization: Bearer $PEK" -H "Content-Type: application/json" \\\n` +
            `  -d '{"email":"novo@exemplo.com","password":"senha123","full_name":"Nome Completo","cpf":"12345678901"}'\n` +
            "```",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "full_name"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string", minLength: 6 },
                    full_name: { type: "string" },
                    cpf: { type: "string" },
                    phone: { type: "string" },
                    birth_date: { type: "string", description: "yyyy-mm-dd" },
                    possui_deficiencia: {
                      type: "string",
                      description: "Sim ou Não",
                    },
                    orgao_expedidor: { type: "string" },
                    estado_civil: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "ok, student_id, user_id, …" },
            "400": { description: "Erro de validação" },
            "401": { description: "Chave inválida" },
          },
        },
      },
      "/api/v1/students/{id}": {
        get: {
          tags: ["Alunos"],
          operationId: "getStudent",
          summary: "Obter um aluno por UUID",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          description:
            "**curl**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students/STUDENT_UUID"\n` +
            "```",
          responses: {
            "200": { description: "{ student: { … } }" },
            "404": { description: "Não encontrado" },
          },
        },
        patch: {
          tags: ["Alunos", "Documentos"],
          operationId: "patchStudent",
          summary: "Atualizar campos (cadastro, notas, documentos, validação)",
          description:
            "Inclui marcar documento como enviado após o PUT no B2 (coluna = `\"true\"`). " +
            "Campos permitidos (entre outros): " +
            patchKeys +
            ".\n\n" +
            "**curl (genérico)**\n```bash\n" +
            `curl -sS -X PATCH "${baseUrl}/api/v1/students/STUDENT_UUID" \\\n` +
            `  -H "Authorization: Bearer $PEK" -H "Content-Type: application/json" \\\n` +
            `  -d '{"telefone":"11988887777","validacao_suspensa":false}'\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
                examples: patchDocExamples,
              },
            },
          },
          responses: {
            "200": { description: "{ ok: true }" },
            "400": { description: "Validação" },
            "401": { description: "Chave inválida" },
          },
        },
        delete: {
          tags: ["Alunos"],
          operationId: "deleteStudent",
          summary: "Excluir aluno (tabela + Auth + profile)",
          description:
            "**curl**\n```bash\n" +
            `curl -sS -X DELETE -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students/STUDENT_UUID"\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "{ ok: true }" },
            "404": { description: "Não encontrado" },
          },
        },
      },
      "/api/v1/students/{id}/certificate": {
        post: {
          tags: ["Alunos"],
          operationId: "issueCertificate",
          summary: "Gerar código e QR do validador (aprovação)",
          description:
            "**curl**\n```bash\n" +
            `curl -sS -X POST -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students/STUDENT_UUID/certificate"\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "codigo_validacao, qr_certificado_url" },
            "409": { description: "Já gerado" },
          },
        },
      },
      "/api/v1/admins": {
        post: {
          tags: ["Administradores"],
          operationId: "createAdmin",
          summary: "Criar administrador (comum ou master)",
          description:
            "`as_master: true` cria perfil com role master; omitido ou `false` cria admin comum.\n\n" +
            "**curl**\n```bash\n" +
            `curl -sS -X POST "${baseUrl}/api/v1/admins" \\\n` +
            `  -H "Authorization: Bearer $PEK" -H "Content-Type: application/json" \\\n` +
            `  -d '{"email":"admin@exemplo.com","password":"senha123","full_name":"Nome Admin","as_master":false}'\n` +
            "```",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "full_name"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                    full_name: { type: "string" },
                    as_master: {
                      type: "boolean",
                      description: "Se true, cria utilizador com role master",
                    },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "{ ok: true, user_id }" } },
        },
      },
      "/api/b2/presign-put": {
        post: {
          tags: ["Documentos", "Armazenamento B2"],
          operationId: "presignPut",
          summary: "URL assinada para upload (PUT) no B2",
          description:
            "Passo 2 do fluxo de documentos. Use `key` conforme `GET /api/v1/documents/catalog`. " +
            "Depois faça **PUT** do ficheiro no `url` devolvido.\n\n" +
            "**curl (exemplo identidade)**\n```bash\n" +
            `curl -sS -X POST "${baseUrl}/api/b2/presign-put" \\\n` +
            `  -H "Authorization: Bearer $PEK" -H "Content-Type: application/json" \\\n` +
            `  -d '{"key":"students/STUDENT_UUID/documents/identidade.pdf","contentType":"application/pdf"}'\n` +
            "```",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PresignPutRequest" },
                examples: documentExamplesPresign,
              },
            },
          },
          responses: {
            "200": {
              description: "URL para PUT do ficheiro",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/b2/presign-get": {
        post: {
          tags: ["Armazenamento B2"],
          operationId: "presignGet",
          summary: "URL assinada para leitura (GET) no B2",
          description:
            "**curl**\n```bash\n" +
            `curl -sS -X POST "${baseUrl}/api/b2/presign-get" \\\n` +
            `  -H "Authorization: Bearer $PEK" -H "Content-Type: application/json" \\\n` +
            `  -d '{"key":"students/STUDENT_UUID/documents/identidade.pdf"}'\n` +
            "```",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PresignGetRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "URL para GET",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { url: { type: "string", format: "uri" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/cursos": {
        get: {
          tags: ["Cursos"],
          operationId: "listCursosV1",
          summary: "Listar cursos do sistema",
          description:
            "Lista todos os cursos (`proeduka_cursos`). Cada item já vem " +
            "com `image_url` pré-assinada (B2, 1h) — basta exibir. " +
            "Use `?q=…` para filtrar por nome e `?limit`/`?offset` para paginar.\n\n" +
            "**curl**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/cursos?q=ensino&limit=20"\n` +
            "```",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "Lista paginada",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      cursos: { type: "array", items: { type: "object" } },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
            "401": { description: "Chave inválida" },
          },
        },
      },
      "/api/v1/students/{id}/courses": {
        get: {
          tags: ["Cursos"],
          operationId: "listStudentCoursesV1",
          summary: "Listar cursos atribuídos a um aluno",
          description:
            "Com `?disponiveis=1` devolve os cursos do sistema que o aluno " +
            "AINDA não tem (use para escolher o `curso_id` antes de atribuir).\n\n" +
            "**curl (atribuídos)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students/STUDENT_UUID/courses"\n` +
            "```\n\n" +
            "**curl (disponíveis)**\n```bash\n" +
            `curl -sS -H "Authorization: Bearer $PEK" "${baseUrl}/api/v1/students/STUDENT_UUID/courses?disponiveis=1"\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            { name: "disponiveis", in: "query", schema: { type: "integer", enum: [1] } },
          ],
          responses: {
            "200": { description: "{ cursos: [...] }" },
            "401": { description: "Chave inválida" },
            "404": { description: "Aluno não encontrado" },
          },
        },
        post: {
          tags: ["Cursos"],
          operationId: "assignCourseToStudentV1",
          summary: "Atribuir um curso a um aluno",
          description:
            "Idempotente: se a atribuição já existir, devolve a existente. " +
            "O `curso_id` deve existir em `proeduka_cursos`.\n\n" +
            "**curl**\n```bash\n" +
            `curl -sS -X POST -H "Authorization: Bearer $PEK" \\\n` +
            `  -H "Content-Type: application/json" \\\n` +
            `  -d '{"curso_id":"CURSO_UUID"}' \\\n` +
            `  "${baseUrl}/api/v1/students/STUDENT_UUID/courses"\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["curso_id"],
                  properties: {
                    curso_id: {
                      type: "string",
                      format: "uuid",
                      description: "UUID do curso em proeduka_cursos.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "{ ok: true, curso: {...} }" },
            "400": { description: "curso_id inválido" },
            "401": { description: "Chave inválida" },
            "404": { description: "Aluno ou curso não encontrado" },
          },
        },
        delete: {
          tags: ["Cursos"],
          operationId: "unassignCourseFromStudentV1",
          summary: "Remover um curso atribuído ao aluno",
          description:
            "**curl**\n```bash\n" +
            `curl -sS -X DELETE -H "Authorization: Bearer $PEK" \\\n` +
            `  -H "Content-Type: application/json" \\\n` +
            `  -d '{"curso_id":"CURSO_UUID"}' \\\n` +
            `  "${baseUrl}/api/v1/students/STUDENT_UUID/courses"\n` +
            "```",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["curso_id"],
                  properties: {
                    curso_id: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "{ ok: true }" },
            "401": { description: "Chave inválida" },
            "404": { description: "Curso não estava atribuído" },
          },
        },
      },
    },
  };
}
