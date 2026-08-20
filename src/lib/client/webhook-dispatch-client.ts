import { WEBHOOK_EVENT } from "@/lib/webhooks/events";

/** Dispara webhook `data_updated` sem bloquear a UI (erros ignorados). */
export function fireDataUpdatedWebhook(params: {
  studentId: string;
  fileKey?: string | null;
  /** Nome do que foi enviado/atualizado (ex.: documento) para o teu endpoint. */
  label?: string | null;
}): void {
  const { studentId, fileKey, label } = params;
  void fetch("/api/webhooks/dispatch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: WEBHOOK_EVENT.DATA_UPDATED,
      studentId,
      ...(fileKey?.trim() ? { fileKey: fileKey.trim() } : {}),
      ...(label?.trim() ? { label: label.trim() } : {}),
    }),
  }).catch(() => {});
}
