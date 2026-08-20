import { COLUNAS_IGNORADAS_APP, COLUNAS_WEBHOOK_IGNORADAS } from "@/lib/aluno-tabela";
import {
  buildPublicValidatorUrl,
  buildQrImagePublicUrl,
} from "@/lib/certificate/public-url";
import type { CursoRow } from "@/lib/api/cursos";

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * URL do PNG do QR para automações (nunca confiar só no valor da BD —
 * pode ter sido gravado com localhost em dev).
 */
function qrCertificadoUrlForWebhook(row: Record<string, unknown>): string | null {
  const id = row.id;
  if (typeof id === "string") {
    const sid = id.trim();
    if (UUID_RX.test(sid)) return buildQrImagePublicUrl(sid);
  }
  const qrRaw = row.qr_certificado_url;
  if (typeof qrRaw === "string" && qrRaw.trim()) return qrRaw.trim();
  return null;
}
import {
  WEBHOOK_EVENT,
  type WebhookPayloadCertificatePrint,
  type WebhookPayloadCertificateRequested,
} from "@/lib/webhooks/events";

/** Campos da linha do aluno enviados em webhooks (sem pastas Google Drive e sem colunas privadas/redundantes). */
export function stripStudentRowForWebhook(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const student: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (COLUNAS_IGNORADAS_APP.has(k)) continue;
    if (COLUNAS_WEBHOOK_IGNORADAS.has(k)) continue;
    student[k] = v;
  }
  return student;
}

/** Curso que originou o pedido/emissão do certificado (payload de webhook). */
export type WebhookCursoSnapshot = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  criado_em: string;
};

function snapshotFromCursoRow(c: CursoRow): WebhookCursoSnapshot {
  return {
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    image_key: c.image_key,
    criado_em: c.criado_em,
  };
}

/**
 * Payload completo: `student` com todos os campos da linha (exceto pastas Google
 * e colunas privadas); `certificate` reúne código, URL do QR e link do validador.
 * Quando `curso` é informado, vai como bloco independente (mais útil p/ automações).
 */
export function buildCertificatePrintPayload(
  row: Record<string, unknown>,
  opts: { curso?: CursoRow | null } = {},
): WebhookPayloadCertificatePrint {
  const student = stripStudentRowForWebhook(row);

  // Garante `certificado_solicitado_em` no payload mesmo se a coluna for null
  // (no fluxo novo por curso, ela pode nem ter sido gravada — usamos `null`).
  if (!("certificado_solicitado_em" in student)) {
    const v = row.certificado_solicitado_em;
    student.certificado_solicitado_em =
      typeof v === "string" && v.trim() ? v.trim() : null;
  }

  const codigo =
    typeof row.codigo_validacao === "string"
      ? row.codigo_validacao.trim()
      : "";
  const qr = qrCertificadoUrlForWebhook(row);
  if (qr !== null) student.qr_certificado_url = qr;

  const payload: WebhookPayloadCertificatePrint = {
    event: WEBHOOK_EVENT.CERTIFICATE_PRINT,
    student,
    certificate: {
      codigo_validacao: codigo || null,
      qr_certificado_url: qr,
      validador_url: codigo ? buildPublicValidatorUrl(codigo) : null,
    },
  };
  if (opts.curso) {
    payload.curso = snapshotFromCursoRow(opts.curso);
  }
  return payload;
}

/** Pedido de certificado pelo aluno: mesma forma de `student` que em `certificate_print`. */
export function buildCertificateRequestedPayload(
  row: Record<string, unknown>,
  requestedAtIso: string,
  opts: { curso?: CursoRow | null } = {},
): WebhookPayloadCertificateRequested {
  const payload: WebhookPayloadCertificateRequested = {
    event: WEBHOOK_EVENT.CERTIFICATE_REQUESTED,
    student: stripStudentRowForWebhook(row),
    requested_at: requestedAtIso,
  };
  if (opts.curso) {
    payload.curso = snapshotFromCursoRow(opts.curso);
  }
  return payload;
}
