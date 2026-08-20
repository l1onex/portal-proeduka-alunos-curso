import { NextResponse } from "next/server";
import type { Sql } from "@/lib/db/client";
import {
  deleteAuthUserCascade,
  findAuthUserIdByEmail,
  insertAuthUserReturningId,
} from "@/lib/auth/auth-users-db";
import {
  buildProedukaAlunoInsert,
  emptyToNull,
  type CreateAlunoBody,
} from "@/lib/map-proeduka-aluno";
import { issueCertificateForStudent } from "@/lib/certificate/issue-for-student";
import { fetchNextNumeroMatricula } from "@/lib/api/next-numero-matricula";
import { alunosFqn } from "@/lib/db/alunos-table";
import { quotePgColumnIdentifier } from "@/lib/db/quote-pg-col";

async function insertAlunoRowReturningId(
  sql: Sql,
  row: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  try {
    const entries = Object.entries(row).filter(
      ([, v]) => v !== undefined,
    ) as Array<[string, unknown]>;

    const fq = alunosFqn();
    const cols = entries.map(([k]) => quotePgColumnIdentifier(k)).join(", ");
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
    const q = `INSERT INTO ${fq} (${cols}) VALUES (${placeholders}) RETURNING id::text AS id`;

    const out = await sql.unsafe<Array<{ id: string }>>(
      q,
      entries.map(([, val]) => val as string | number | boolean | Date | null),
    );

    const id = out?.[0]?.id;
    if (!id?.trim()) {
      return { error: "Falha ao guardar os dados do aluno." };
    }
    return { id: id.trim() };
  } catch (e) {
    console.error("[insertAlunoRow]", e);
    return {
      error:
        e instanceof Error ? e.message : "Falha ao guardar os dados do aluno.",
    };
  }
}

export async function createStudentPostResponse(
  service: Sql,
  body: CreateAlunoBody,
): Promise<NextResponse> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : "";

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Informe e-mail, senha temporária e nome completo." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  const fq = alunosFqn();
  const normEmail = email.toLowerCase();

  const existingHits = await service.unsafe<Array<{ id: string }>>(
    `SELECT id::text AS id FROM ${fq} WHERE lower(trim(email::text)) = $1 LIMIT 1`,
    [normEmail],
  );
  const existingId = existingHits[0]?.id?.trim() ?? "";

  let userRow = await insertAuthUserReturningId(service, { email, password });
  if ("error" in userRow && userRow.error === "email_duplicate") {
    const existingUserId = await findAuthUserIdByEmail(service, email);
    if (!existingUserId) {
      return NextResponse.json(
        {
          error:
            "Já existe uma conta no Auth com este e-mail. Usa “Esqueci a senha” no login ou escolhe outro e-mail.",
        },
        { status: 400 },
      );
    }
    userRow = { id: existingUserId };
  } else if ("error" in userRow) {
    return NextResponse.json({ error: userRow.error }, { status: 400 });
  }

  const userId = userRow.id;

  if (existingId) {
    let certificateIssued = true;
    try {
      const prevRows =
        await service.unsafe<
          Array<{
            codigo_validacao?: string | null;
            numero_matricula?: string | null;
          }>
        >(
          `SELECT codigo_validacao, numero_matricula FROM ${fq} WHERE id::text = $1 LIMIT 1`,
          [existingId],
        );
      const prev = prevRows[0];
      const matPrev = prev?.numero_matricula;
      const hasMatricula =
        typeof matPrev === "string" && matPrev.trim().length > 0;
      if (!hasMatricula) {
        const matRes = await fetchNextNumeroMatricula(service);
        if (matRes.ok) {
          await service.unsafe(
            `UPDATE ${fq} SET numero_matricula = $1 WHERE id::text = $2`,
            [matRes.value, existingId],
          );
        } else {
          console.error(
            "fetchNextNumeroMatricula (linha existente):",
            matRes.error,
          );
        }
      }

      const cv = prev?.codigo_validacao;
      const hasCode = typeof cv === "string" && cv.trim().length > 0;
      if (!hasCode) {
        await issueCertificateForStudent(service, existingId);
      }
    } catch (e) {
      console.error("issueCertificateForStudent (linked row):", e);
      certificateIssued = false;
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      student_id: existingId,
      linked_existing_row: true,
      certificate_issued: certificateIssued,
      message:
        "Conta de acesso criada e associada ao cadastro de aluno que já existia com este e-mail.",
    });
  }

  const matRes = await fetchNextNumeroMatricula(service);
  if (!matRes.ok) {
    await deleteAuthUserCascade(service, userId);
    return NextResponse.json(
      {
        error:
          matRes.error ||
          "Não foi possível gerar o número da matrícula. Verifique a migração da base.",
      },
      { status: 503 },
    );
  }

  const row = buildProedukaAlunoInsert({
    ...body,
    email,
    full_name: fullName,
  });

  const emailInRow = emptyToNull(email);
  if (!emailInRow) {
    await deleteAuthUserCascade(service, userId);
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  row.email = emailInRow;
  row.numero_matricula = matRes.value;

  const inserted = await insertAlunoRowReturningId(service, row);
  if ("error" in inserted) {
    await deleteAuthUserCascade(service, userId);
    return NextResponse.json({ error: inserted.error }, { status: 400 });
  }

  let certificateIssued = true;
  try {
    await issueCertificateForStudent(service, inserted.id);
  } catch (e) {
    console.error("issueCertificateForStudent:", e);
    certificateIssued = false;
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    student_id: inserted.id,
    linked_existing_row: false,
    certificate_issued: certificateIssued,
  });
}
