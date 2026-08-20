"use client";

import { useCallback, useEffect, useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { formatDateTimeBrazil } from "@/lib/format-br";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
};

const card =
  "rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/50 sm:p-6";

export function AdminApiKeysPanel() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/api-keys", { credentials: "include" });
      const { ok, data, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao carregar chaves.");
        return;
      }
      const list = (data as { keys?: ApiKeyRow[] }).keys ?? [];
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    setLastCreatedKey(null);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const { ok, data, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao criar.");
        return;
      }
      const created = data as { key?: string };
      if (typeof created.key === "string") {
        setLastCreatedKey(created.key);
      }
      setName("");
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeKey(id: string) {
    if (!confirm("Revogar e apagar esta chave? Integrações que a usam deixam de funcionar.")) {
      return;
    }
    setErr(null);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
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

  async function setEnabled(id: string, enabled: boolean) {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
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

  return (
    <div className="space-y-6">
      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {lastCreatedKey ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Chave criada — copie agora:</p>
          <code className="mt-2 block break-all rounded-lg bg-white/80 p-2 font-mono text-xs">
            {lastCreatedKey}
          </code>
        </div>
      ) : null}

      <section className={card}>
        <h2 className="text-lg font-bold text-[#D9571E]">Nova chave de API</h2>
        <p className="mt-2 text-sm text-slate-600">
          O valor completo começa por <code className="rounded bg-slate-100 px-1">pek_</code> e
          só é mostrado uma vez. Use{" "}
          <code className="rounded bg-slate-100 px-1">Authorization: Bearer …</code> ou{" "}
          <code className="rounded bg-slate-100 px-1">X-API-Key</code> nas chamadas.
        </p>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            Nome (identificação interna)
            <input
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: ERP produção"
              required
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            {saving ? "Gerando…" : "Gerar chave"}
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-[#D9571E]">Chaves existentes</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Nenhuma chave ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    Prefixo: {row.key_prefix}{" "}
                    {row.enabled ? (
                      <span className="text-emerald-700">· ativa</span>
                    ) : (
                      <span className="text-amber-800">· desativada</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    Criada: {formatDateTimeBrazil(row.created_at)}
                    {row.last_used_at
                      ? ` · Último uso: ${formatDateTimeBrazil(row.last_used_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void setEnabled(row.id, !row.enabled)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {row.enabled ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeKey(row.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
