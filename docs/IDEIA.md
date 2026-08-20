# Proeduca Alunos — ideia & brainstorm (vivo)

Documento de referência do que estamos construindo. Pode evoluir; o foco **agora** é estruturar a base funcional (alunos, escola/concurso, API alinhada ao que o sistema faz na mão).

## Identidade visual

- **Fundo:** branco (interface clara; não usar tema escuro como padrão).
- **Cores da marca**
  - Primária (laranja): `#F66828`
  - Secundária / profundidade (laranja escuro): `#D9571E`
  - Destaque / CTA (laranja): `#FF4D0C`
  - Superfície / base: **branco** `#FFFFFF`
- **Logo:** `https://proeduka.com.br/wp-content/uploads/2025/12/imageye___-_imgi_1_LOGO-V2-1.png`

## O que é o produto

- Plataforma **para alunos** de uma escola / processo de **concurso** — cadastro, documentação e acompanhamento.
- Três tipos de usuário:
  - **Master** (único): gestão total do sistema, inclusive API, tokens, webhooks, quem é administrador.
  - **Administradores:** operação (alunos, status, financeiro conforme regras); **não** mexem em configurações só do master (API, etc.).
  - **Alunos:** área do aluno (documentos, pendências, downloads, etc.).

## Funcionalidades já pensadas (resumo)

- **Dados do aluno** (unidade, datas, consultor, curso, nome, nascimento, CPF, contatos, RG, filiação, endereço completo, etc.) — registro na base de dados, muitas vezes preenchido via **API** a partir de formulário externo.
- **Documentos** no Storage (PDF ou foto legível): comprovante de residência, título de eleitor, reservista (sexo masculino), foto 3x4, certidão, histórico fundamental, formulário de matrícula assinado; **pendências** e alertas até completar.
- **Formulário de matrícula:** download em PDF no sistema → aluno preenche → reenvio.
- **Criação de aluno via API:** senha temporária na requisição; gerar **código**, **link de validação** e **QR Code** (ex.: base64) para certificado/histórico; link “válido” na prática quando status **aprovado**.
- **Página pública** `/validar/[código]` para conferir se o certificado é válido.
- **Webhooks** (configuráveis pelo master), primeiro caso: **aniversário** do aluno.
- **Futuro:** cobranças, Asaas, vencimentos, e-mail, bloqueio de acesso, etc.

## API — princípio que você pediu

**Tudo o que dá para fazer manualmente no sistema deve ter equivalente na API** (criar “lead”/aluno, alterar, apagar, listar, anexos, status, etc.), com autenticação por **token** (master gera; não expor operações sensíveis sem autorização).

Ideias de organização:

1. **Versionamento da API** — prefixo `/api/v1/...` para mudanças futuras sem quebrar integrações.
2. **Catálogo de recursos** — alunos (leads), documentos, tokens, webhooks, administradores (o que o master permitir).
3. **Contrato único** — OpenAPI/Swagger gerado ou documentado para você e parceiros.
4. **Idempotência** onde fizer sentido (ex.: reenvio de webhook).
5. **Filas / jobs** — aniversários e vencimentos rodando no servidor com `service_role`, não no browser.

## Próximos passos de estrutura (sugestão)

1. Autenticação (sessão) + papéis no `profiles`.
2. Rotas da API com token + espelho das ações do painel.
3. Área do aluno (upload, lista de pendências).
4. Painel admin + área master (API/webhooks).
5. Testes e monitoramento de webhooks (retentativas, log).

---

*Última atualização: alinhamento de cores Proeduka, logo e foco em interface branca.*
