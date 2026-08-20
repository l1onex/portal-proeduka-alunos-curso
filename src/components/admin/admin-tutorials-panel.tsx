"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import type { TutorialVideoRow } from "@/lib/tutorials/types";

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

const sectionCard =
  "rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/50 sm:p-6";

type Props = {
  /** Só o master cadastra/edita/apaga; administradores só visualizam. */
  canEditVideos?: boolean;
};

export function AdminTutorialsPanel({ canEditVideos = true }: Props) {
  const [rows, setRows] = useState<TutorialVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/tutorials", { credentials: "include" });
      const { ok, data, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao carregar.");
        return;
      }
      const list = (data as { tutorials?: TutorialVideoRow[] }).tutorials ?? [];
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

  useEffect(() => {
    if (!deleteConfirm) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [deleteConfirm]);

  useEffect(() => {
    if (!deleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setDeleteConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteConfirm, deleting]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setSortOrder("0");
    setEditingId(null);
  }

  function startEdit(row: TutorialVideoRow) {
    setEditingId(row.id);
    setTitle(row.title);
    setDescription(row.description);
    setVideoUrl(row.video_url);
    setSortOrder(String(row.sort_order));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const so = Number.parseInt(sortOrder, 10);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim(),
        sort_order: Number.isFinite(so) ? so : 0,
      };

      const res = editingId
        ? await fetch(`/api/admin/tutorials/${editingId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/tutorials", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao salvar.");
        return;
      }
      resetForm();
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteVideo() {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tutorials/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro ao remover.");
        return;
      }
      setDeleteConfirm(null);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  const readOnly = !canEditVideos;

  return (
    <div className="space-y-8">
      {deleteConfirm && !readOnly ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-delete-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Fechar"
            disabled={deleting}
            onClick={() => !deleting && setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/15">
            <h3
              id="tutorial-delete-title"
              className="text-lg font-bold text-[#D9571E]"
            >
              Deseja mesmo apagar o vídeo?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                {deleteConfirm.title}
              </span>{" "}
              será removido da lista de tutoriais. Esta ação não pode ser
              desfeita.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Não, manter
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteVideo()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
              >
                {deleting ? "Apagando…" : "Sim, apagar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {err}
        </div>
      ) : null}

      {!readOnly ? (
      <section className={`relative overflow-hidden ${sectionCard}`}>
        <h2 className="text-lg font-bold text-[#D9571E]">
          {editingId ? "Editar vídeo" : "Adicionar vídeo"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Cole o link público do YouTube ou do Vimeo após publicar o vídeo. A
          miniatura é obtida automaticamente.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Título
            <input
              className={`${inputClass} mt-1`}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Como enviar a identidade"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Descrição
            <textarea
              className={`${inputClass} mt-1 min-h-[100px] resize-y`}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo do que o aluno vai aprender neste vídeo."
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            URL do vídeo (YouTube ou Vimeo)
            <input
              className={`${inputClass} mt-1`}
              type="url"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… ou https://vimeo.com/…"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ordem na lista (menor aparece primeiro)
            <input
              className={`${inputClass} mt-1 max-w-[120px]`}
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? "Salvando…" : editingId ? "Atualizar vídeo" : "Publicar vídeo"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            ) : null}
          </div>
        </form>
      </section>
      ) : null}

      <section className={`relative overflow-hidden ${sectionCard}`}>
        <h2 className="text-lg font-bold text-[#D9571E]">Vídeos cadastrados</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            {readOnly
              ? "Nenhum vídeo cadastrado."
              : "Nenhum vídeo ainda. Adicione o primeiro acima."}
          </p>
        ) : (
          <ul className="mt-6 space-y-5">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 sm:flex-row"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-200 sm:max-w-[240px]">
                  {row.thumbnail_url ? (
                    <Image
                      src={row.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="240px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Sem miniatura
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{row.title}</p>
                  {row.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {row.description}
                    </p>
                  ) : null}
                  <p className="mt-2 truncate text-xs text-slate-400">
                    {row.video_url}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={row.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#F66828]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#D9571E] transition hover:bg-sky-50"
                    >
                      Abrir vídeo
                    </a>
                    {!readOnly ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-[#F66828]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#D9571E] transition hover:bg-sky-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({ id: row.id, title: row.title })
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100"
                        >
                          Remover
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
