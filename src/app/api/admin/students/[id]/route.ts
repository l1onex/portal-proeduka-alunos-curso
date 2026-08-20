import { NextResponse } from "next/server";
import {
  canEditValidacaoSuspensa,
  COLUNA_DESISTENTE,
  COLUNA_INADIMPLENTE,
  getAlunosTableName,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { dispatchInadimplenteWebhook } from "@/lib/webhooks/dispatch";
import { deleteStudentCascade } from "@/lib/api/student-delete-service";
import { getStaffSession } from "@/lib/api/staff-session";
import { getSql } from "@/lib/db/client";
import { alunosFqn } from "@/lib/db/alunos-table";
import { quotePgColumnIdentifier } from "@/lib/db/quote-pg-col";

type Ctx = { params: Promise<{ id: string }> };
/** Admin: flags pedagógicas e validação pública. */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  void getAlunosTableName();
  const fq = alunosFqn();
  const patch: Record<string, string | number | boolean | null> = {};
  let fireInadimplenteWebhook = false;

  if ("validacao_suspensa" in body) {
    const v = body.validacao_suspensa;
    if (typeof v !== "boolean") {
      return NextResponse.json(
        { error: "validacao_suspensa deve ser true ou false." },
        { status: 400 },
      );
    }

    let row: Record<string, unknown> | undefined;
    try {
      const rows =
        await service.unsafe<Array<Record<string, unknown>>>(`
          SELECT * FROM ${fq} WHERE id::text = $1 LIMIT 1`,
        [studentId.trim()],
      );
      row = rows[0];
    } catch {
      row = undefined;
    }

    if (!row) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    if (!canEditValidacaoSuspensa(row)) {
      return NextResponse.json(
        {
          error:
            "Só é possível alterar quando o cadastro está completo (documentos e dados de certificação) — como ao habilitar “Iniciar certificado”.",
        },
        { status: 400 },
      );
    }

    patch.validacao_suspensa = v;
  }

  if ("desistente" in body) {
    const v = body.desistente;
    if (typeof v !== "boolean") {
      return NextResponse.json(
        { error: "desistente deve ser true ou false." },
        { status: 400 },
      );
    }
    patch[COLUNA_DESISTENTE] = v;
  }

  if ("inadimplente" in body) {
    const v = body.inadimplente;
    if (typeof v !== "boolean") {
      return NextResponse.json(
        { error: "inadimplente deve ser true ou false." },
        { status: 400 },
      );
    }
    if (v === true) {
      let beforeRow: Record<string, unknown> | undefined;
      try {
        const rows =
          await service.unsafe<Array<Record<string, unknown>>>(`
            SELECT ${quotePgColumnIdentifier(COLUNA_INADIMPLENTE)}
            FROM ${fq}
            WHERE id::text = $1
            LIMIT 1
          `,
          [studentId.trim()],
        );
        beforeRow = rows[0];
      } catch {
        beforeRow = undefined;
      }
      if (!beforeRow) {
        return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
      }
      const wasInadimplente = isTruthyFlag(beforeRow[COLUNA_INADIMPLENTE]);
      fireInadimplenteWebhook = !wasInadimplente;
    }
    patch[COLUNA_INADIMPLENTE] = v;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo permitido para atualizar." },
      { status: 400 },
    );
  }

  const entries = Object.entries(patch);
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let i = 1;
  for (const [col, val] of entries) {
            sets.push(`${quotePgColumnIdentifier(col)} = $${i}`);
    params.push(val);
    i++;
  }
  params.push(studentId.trim());
  try {
    const q = `
      UPDATE ${fq}
      SET ${sets.join(", ")}
      WHERE id::text = $${i}
      RETURNING id::text`;
    const out = await service.unsafe<Array<{ id: string | null }>>(q, params);
    if (!out?.length) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao atualizar." },
      { status: 400 },
    );
  }

  if (fireInadimplenteWebhook) {
    try {
      await dispatchInadimplenteWebhook({ studentId });
    } catch (e) {
      console.error("[admin/students PATCH] webhook inadimplente", e);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  if (!studentId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let service;
  try {
    service = getSql();
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível." },
      { status: 503 },
    );
  }

  const result = await deleteStudentCascade(service, studentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
