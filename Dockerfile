# syntax=docker/dockerfile:1
# Build-args públicos (embutidos no bundle Next.js):
#   NEXT_PUBLIC_APP_URL        — HTTPS do portal (obrigatório)
# Opcional:
#   NEXT_PUBLIC_ALUNOS_TABLE   — nome da tabela de alunos em public.* (default: proeduka_alunos)
#
# Scripts: deploy/build.sh | deploy/build.ps1 (lê deploy/stack.env e passa os mesmos --build-arg).
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ALUNOS_TABLE=proeduka_alunos

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ALUNOS_TABLE=$NEXT_PUBLIC_ALUNOS_TABLE
# Compatível com código que ainda lê NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE no bundle
ENV NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE=$NEXT_PUBLIC_ALUNOS_TABLE

RUN if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then \
  echo "ERRO: Passe --build-arg NEXT_PUBLIC_APP_URL (HTTPS do portal)." >&2; \
  exit 1; \
fi

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CHROMIUM_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
