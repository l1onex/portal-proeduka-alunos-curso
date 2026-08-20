/**
 * Eventos de webhook suportados.
 * Novos eventos: adicionar aqui + UI em admin/webhooks + lógica de disparo.
 */
export const WEBHOOK_EVENT = {
  /** Aniversário do aluno — disparo por cron (ex.: VPS) no horário que configurar. */
  BIRTHDAY: "birthday",
  /** Dado ou arquivo atualizado (aluno ou admin). */
  DATA_UPDATED: "data_updated",
  /** Certificado aprovado / pronto para impressão (admin). */
  CERTIFICATE_PRINT: "certificate_print",
  /** Aluno solicitou análise do certificado no portal (pedido explícito). */
  CERTIFICATE_REQUESTED: "certificate_requested",
  /** Administrador marcou o aluno como inadimplente (financeiro). */
  INADIMPLENTE: "inadimplente",
  /** Aluno solicitou um curso pelo portal (criação em proeduka_curso_solicitacoes). */
  COURSE_REQUESTED: "course_requested",
  /** Administrador liberou (aprovou) um pedido de curso do aluno. */
  COURSE_APPROVED: "course_approved",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENT)[keyof typeof WEBHOOK_EVENT];

/** Nome curto na interface (português). */
export const WEBHOOK_EVENT_NAMES_PT: Record<WebhookEventType, string> = {
  [WEBHOOK_EVENT.BIRTHDAY]: "Aniversário",
  [WEBHOOK_EVENT.DATA_UPDATED]: "Envio de dados",
  [WEBHOOK_EVENT.CERTIFICATE_PRINT]: "Impressão do certificado",
  [WEBHOOK_EVENT.CERTIFICATE_REQUESTED]: "Pedido de certificado (aluno)",
  [WEBHOOK_EVENT.INADIMPLENTE]: "Inadimplência",
  [WEBHOOK_EVENT.COURSE_REQUESTED]: "Pedido de curso (aluno)",
  [WEBHOOK_EVENT.COURSE_APPROVED]: "Curso liberado (admin)",
};

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  [WEBHOOK_EVENT.BIRTHDAY]:
    "No dia do aniversário do aluno (disparo diário no horário em que o cron da VPS chamar o endpoint; data comparada em Brasília).",
  [WEBHOOK_EVENT.DATA_UPDATED]:
    "Quando dados ou arquivos forem atualizados; o payload inclui um rótulo (tipo de documento ou dados cadastrais) e link do arquivo quando houver.",
  [WEBHOOK_EVENT.CERTIFICATE_PRINT]:
    "Quando o administrador clicar em “Iniciar certificado” (documentação completa, dados obrigatórios preenchidos). O corpo inclui todos os campos do aluno (matrícula, registro, notas, etc.), mais código de validação e URLs do QR e do validador.",
  [WEBHOOK_EVENT.CERTIFICATE_REQUESTED]:
    "Quando o aluno concluir “Solicitar certificado” no portal (sem pendências). O corpo inclui a linha completa do aluno (nome, e-mail, telefone, matrícula, registo escolar, notas, etc.) e o instante do pedido.",
  [WEBHOOK_EVENT.INADIMPLENTE]:
    "Quando um administrador marcar o aluno como inadimplente (campo financeiro na ficha). Dispara só na transição para inadimplente (não ao repetir ou ao voltar para em dia).",
  [WEBHOOK_EVENT.COURSE_REQUESTED]:
    "Quando o aluno clicar em “Solicitar curso” no portal (/aluno/cursos). O corpo inclui os dados do aluno, o snapshot do curso solicitado e o instante do pedido.",
  [WEBHOOK_EVENT.COURSE_APPROVED]:
    "Quando o administrador clicar em “Liberar curso” numa solicitação. O corpo inclui os dados do aluno, o snapshot do curso e o instante da liberação.",
};

/** Converte chaves técnicas salvas na BD para rótulos em português para exibição. */
export function formatWebhookEventsToPt(events: string[] | null | undefined): string {
  if (!events?.length) return "—";
  return events
    .map((k) => WEBHOOK_EVENT_NAMES_PT[k as WebhookEventType] ?? k)
    .join(", ");
}

/** Payload enviado no POST para cada URL cadastrada. */
export type WebhookPayloadBirthday = {
  event: typeof WEBHOOK_EVENT.BIRTHDAY;
  student: { name: string; email: string };
  /** Data do aniversário no fuso de Brasília (YYYY-MM-DD). */
  date: string;
};

export type WebhookPayloadDataUpdated = {
  event: typeof WEBHOOK_EVENT.DATA_UPDATED;
  student: { name: string; email: string };
  /** Descrição do que foi atualizado (ex.: tipo de documento, dados cadastrais). */
  label?: string;
  /** URL temporária (B2) quando o disparo for por upload de arquivo. */
  fileUrl?: string;
};

export type WebhookPayloadCertificatePrint = {
  event: typeof WEBHOOK_EVENT.CERTIFICATE_PRINT;
  /** Todos os campos da linha do aluno (exceto pastas Google e colunas privadas/redundantes). */
  student: Record<string, unknown>;
  /** Código de validação e links do QR / validador (também presentes em `student`). */
  certificate: {
    codigo_validacao: string | null;
    qr_certificado_url: string | null;
    validador_url: string | null;
  };
  /** Curso que originou a emissão do certificado (quando o pedido for por curso). */
  curso?: {
    id: string;
    nome: string;
    descricao: string | null;
    image_key: string | null;
    criado_em: string;
  };
};

export type WebhookPayloadCertificateRequested = {
  event: typeof WEBHOOK_EVENT.CERTIFICATE_REQUESTED;
  /** Linha do aluno após gravar o pedido e atribuir registo escolar se aplicável (exceto pastas Google e colunas privadas). */
  student: Record<string, unknown>;
  /** Mesmo instante gravado em `certificado_solicitado_em` (ISO-8601). */
  requested_at: string;
  /** Curso que originou o pedido (quando o pedido for por curso). */
  curso?: {
    id: string;
    nome: string;
    descricao: string | null;
    image_key: string | null;
    criado_em: string;
  };
};

export type WebhookPayloadInadimplente = {
  event: typeof WEBHOOK_EVENT.INADIMPLENTE;
  /** Linha atual do aluno após a marcação (`inadimplente`: true). */
  student: Record<string, unknown>;
  /** Instantâneo ISO (UTC) do momento em que a marcação foi gravada. */
  marked_at: string;
};

/** Snapshot do curso (reaproveitado em vários payloads). */
export type WebhookCursoSnapshot = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  criado_em: string;
};

export type WebhookPayloadCourseRequested = {
  event: typeof WEBHOOK_EVENT.COURSE_REQUESTED;
  /** Linha do aluno após criar o pedido (mesma forma do `certificate_*`). */
  student: Record<string, unknown>;
  /** Snapshot do curso solicitado. */
  curso: WebhookCursoSnapshot;
  /** Instantâneo ISO (UTC) do momento do pedido. */
  requested_at: string;
};

export type WebhookPayloadCourseApproved = {
  event: typeof WEBHOOK_EVENT.COURSE_APPROVED;
  /** Linha do aluno após a liberação do curso. */
  student: Record<string, unknown>;
  /** Snapshot do curso liberado. */
  curso: WebhookCursoSnapshot;
  /** Instantâneo ISO (UTC) do momento da liberação. */
  approved_at: string;
};

export type WebhookPayload =
  | WebhookPayloadBirthday
  | WebhookPayloadDataUpdated
  | WebhookPayloadCertificatePrint
  | WebhookPayloadCertificateRequested
  | WebhookPayloadInadimplente
  | WebhookPayloadCourseRequested
  | WebhookPayloadCourseApproved;
