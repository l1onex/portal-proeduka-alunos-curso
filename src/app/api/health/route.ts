import { NextResponse } from "next/server";

/** Nome da tabela (apenas diagnóstico; mesma convenção que `getAlunosTableName`). */
function tableNameForDiag(): string {
  return (
    process.env.NEXT_PUBLIC_ALUNOS_TABLE?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE?.trim() ||
    "proeduka_alunos"
  );
}

/**
 * Diagnóstico rápido em produção (sem secrets). Ajuda quando o portal falha
 * silenciosamente — confira se runtime Postgres + sessão e URL pública existem.
 * NEXT_PUBLIC_* no cliente foram embutidos em `next build`.
 */
export async function GET() {
  const secretTrim = process.env.SESSION_SECRET?.trim() ?? "";
  const secretLen = secretTrim.length;

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasSessionSecret = secretLen >= 32;
  const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  let host: string | null = null;
  try {
    if (appUrlRaw) host = new URL(appUrlRaw).hostname;
  } catch {
    host = "invalid-url";
  }

  const ok = hasDatabaseUrl && hasSessionSecret && Boolean(appUrlRaw);

  return NextResponse.json(
    {
      ok,
      time: new Date().toISOString(),
      node: process.version,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT ?? "3000",
      listen: process.env.HOSTNAME ?? null,
      nextPublic: {
        appUrl: appUrlRaw || null,
        hostname: host,
        alunosTable: tableNameForDiag(),
      },
      serverRuntime: {
        hasDatabaseUrl,
        sessionSecretConfigured: hasSessionSecret,
      },
      notes: {
        clientBundle:
          "NEXT_PUBLIC_* no bundle do browser foram definidos na hora do `npm run build` / `docker build --build-arg`.",
        postgres:
          "Auth e dados usam Postgres direto: DATABASE_URL (runtime) + SESSION_SECRET (JWT do cookie HTTP-only).",
      },
    },
    { status: ok ? 200 : 503 },
  );
}
