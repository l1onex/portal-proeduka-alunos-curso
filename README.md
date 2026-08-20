# Proeduca Alunos

Área do aluno (Next.js): documentos, validação de certificado e base para API/webhooks.

## Começar

1. Copie `.env.example` para `.env` e preencha as variáveis necessárias (app, armazenamento B2, etc.).
2. `npm install` e `npm run dev` — abra [http://localhost:3000](http://localhost:3000).

## Rotas úteis

- `/` — landing
- `/validar/[código]` — página pública de validação (integração de dados em curso)

## Próximos passos sugeridos

- Login (master / admin / aluno) e painéis
- API autenticada por token para criar aluno + upload
- Cron de aniversário e disparo de webhooks
