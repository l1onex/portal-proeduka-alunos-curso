"use client";

import { useCallback, useEffect, useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import {
  WEBHOOK_EVENT,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENT_NAMES_PT,
  formatWebhookEventsToPt,
  type WebhookEventType,
} from "@/lib/webhooks/events";

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

const sectionCard =
  "rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/50 sm:p-6";

const EVENT_OPTIONS: WebhookEventType[] = [
  WEBHOOK_EVENT.BIRTHDAY,
  WEBHOOK_EVENT.DATA_UPDATED,
  WEBHOOK_EVENT.CERTIFICATE_PRINT,
  WEBHOOK_EVENT.CERTIFICATE_REQUESTED,
  WEBHOOK_EVENT.INADIMPLENTE,
  WEBHOOK_EVENT.COURSE_REQUESTED,
  WEBHOOK_EVENT.COURSE_APPROVED,
];

export function AdminWebhooksPanel() {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<Set<WebhookEventType>>(
    () => new Set([WEBHOOK_EVENT.DATA_UPDATED]),
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/webhooks", { credentials: "include" });
      const { ok, data, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao carregar.");
        return;
      }
      const list = (data as { webhooks?: WebhookRow[] }).webhooks ?? [];
      setRows(list);
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleEvent(ev: WebhookEventType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: Array.from(selected),
          enabled: true,
        }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao salvar.");
        return;
      }
      setUrl("");
      setSelected(new Set([WEBHOOK_EVENT.DATA_UPDATED]));
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function patchRow(id: string, patch: Partial<WebhookRow>) {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao atualizar.");
        return;
      }
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Remover este webhook?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao remover.");
        return;
      }
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    }
  }

  return (
    <div className="space-y-8">
      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {err}
        </div>
      ) : null}

      <section className={`relative overflow-hidden ${sectionCard}`}>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F66828]/10 blur-2xl"
          aria-hidden
        />
        <h2 className="relative text-lg font-bold text-[#D9571E]">
          Cadastrar webhook
        </h2>
        <p className="relative mt-2 text-sm text-slate-600">
          O sistema enviará um POST JSON para a URL com o corpo descrito em cada
          evento. Novos tipos de evento poderão ser adicionados depois.
        </p>
        <form onSubmit={onCreate} className="relative mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            URL (https://…)
            <input
              className={`${inputClass} mt-1`}
              type="url"
              required
              placeholder="https://seu-servidor.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Eventos
            </legend>
            <div className="mt-2 space-y-2">
              {EVENT_OPTIONS.map((ev) => (
                <label
                  key={ev}
                  className="flex cursor-pointer items-start gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  <span>
                    <span className="font-semibold text-slate-900">
                      {WEBHOOK_EVENT_NAMES_PT[ev]}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {WEBHOOK_EVENT_LABELS[ev]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={saving || selected.size === 0}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Adicionar webhook"}
          </button>
        </form>
      </section>

      <section className={sectionCard}>
        <h2 className="text-lg font-bold text-[#D9571E]">
          Webhooks cadastrados
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nenhum webhook ainda. Cadastre uma URL acima.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {rows.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm text-slate-900">
                      {w.url}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Eventos: {formatWebhookEventsToPt(w.events)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      onClick={() =>
                        patchRow(w.id, { enabled: !w.enabled })
                      }
                    >
                      {w.enabled ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      onClick={() => void removeRow(w.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300/90 bg-gradient-to-br from-slate-50/80 to-[#f8fbff]/40 p-6 shadow-inner sm:p-8">
        <h2 className="text-lg font-bold text-[#D9571E]">
          Formato do corpo (POST JSON)
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          No JSON enviado ao seu servidor, o campo{" "}
          <code className="rounded bg-slate-100 px-1">event</code> continua em
          inglês (<code className="rounded bg-slate-100 px-1">birthday</code>,{" "}
          <code className="rounded bg-slate-100 px-1">data_updated</code>,{" "}
          <code className="rounded bg-slate-100 px-1">certificate_print</code>,{" "}
          <code className="rounded bg-slate-100 px-1">certificate_requested</code>,{" "}
          <code className="rounded bg-slate-100 px-1">inadimplente</code>)
          para compatibilidade com integrações.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-3 text-sm text-slate-600">
          <li>
            <strong>Aniversário</strong> (<code className="text-xs">event: &quot;birthday&quot;</code>)
            <br />
            <code className="mt-1 block text-xs">
              {`{ "event": "birthday", "student": { "name", "email" }, "date": "YYYY-MM-DD" }`}
            </code>
            <span className="mt-1 block text-xs text-slate-500">
              Disparo diário: na VPS, agende uma chamada HTTP (ex.:{" "}
              <code className="rounded bg-slate-100 px-1">crontab</code>) ao
              endpoint de cron com{" "}
              <code className="rounded bg-slate-100 px-1">CRON_SECRET</code>. O
              sistema compara aniversário com o dia atual (Brasília).
            </span>
          </li>
          <li>
            <strong>Envio de dados</strong> (
            <code className="text-xs">event: &quot;data_updated&quot;</code>)
            <br />
            <code className="mt-1 block text-xs">
              {`{ "event": "data_updated", "student": { "name", "email" }, "label"?: "...", "fileUrl"?: "..." }`}
            </code>
            <span className="mt-1 block text-xs text-slate-500">
              <code className="rounded bg-slate-100 px-1">label</code> descreve o
              que mudou (ex.: tipo de documento, dados cadastrais).{" "}
              <code className="rounded bg-slate-100 px-1">fileUrl</code> é link
              temporário (B2) quando houver arquivo.
            </span>
          </li>
          <li>
            <strong>Impressão do certificado</strong> (
            <code className="text-xs">event: &quot;certificate_print&quot;</code>)
            <br />
            <code className="mt-1 block max-h-40 overflow-auto text-xs">
              {`{ "event": "certificate_print", "student": { /* todos os campos da linha */ }, "certificate": { "codigo_validacao", "qr_certificado_url", "validador_url" } }`}
            </code>
            <span className="mt-1 block text-xs text-slate-500">
              Disparado quando um administrador clica em “Iniciar certificado”.
              O objeto <code className="rounded bg-slate-100 px-1">student</code>{" "}
              contém os campos essenciais do aluno (matrícula, documentos e
              cadastro). Em{" "}
              <code className="rounded bg-slate-100 px-1">certificate</code>{" "}
              vêm o código de validação e as URLs do QR e do validador.
            </span>
          </li>
          <li>
            <strong>Pedido de certificado (aluno)</strong> (
            <code className="text-xs">event: &quot;certificate_requested&quot;</code>)
            <br />
            <code className="mt-1 block max-h-40 overflow-auto text-xs">
              {`{ "event": "certificate_requested", "student": { /* todos os campos da linha */ }, "requested_at": "ISO-8601" }`}
            </code>
            <span className="mt-1 block text-xs text-slate-500">
              Disparado quando o aluno conclui “Solicitar certificado” no portal
              (após gravar o pedido e atribuir registo escolar, se aplicável). O
              objeto <code className="rounded bg-slate-100 px-1">student</code>{" "}
              segue o mesmo critério do evento de impressão (nome, e-mail, telefone,
              matrícula, documentos e cadastro).
            </span>
          </li>
          <li>
            <strong>Inadimplência</strong> (
            <code className="text-xs">event: &quot;inadimplente&quot;</code>)
            <br />
            <code className="mt-1 block max-h-40 overflow-auto text-xs">
              {`{ "event": "inadimplente", "student": { /* linha do aluno */ }, "marked_at": "ISO-8601" }`}
            </code>
            <span className="mt-1 block text-xs text-slate-500">
              Disparado quando um administrador marca o aluno como inadimplente
              pela primeira vez (não ao repetir o envio com o mesmo estado).
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
