"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteB2Objects, uploadFileToB2 } from "@/lib/client/b2-upload";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

type CursoFormProps = {
  /** Em modo "criar", `initial` é null. */
  initial?: {
    id: string;
    nome: string;
    descricao: string | null;
    image_key: string | null;
  } | null;
  /** URL pré-assinada server-side para a imagem atual (modo edição). */
  initialImageUrl?: string | null;
};

export function AdminCursoForm({
  initial = null,
  initialImageUrl = null,
}: CursoFormProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const isEdit = initial !== null;
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [imageKey, setImageKey] = useState<string | null>(
    initial?.image_key ?? null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialImageUrl,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se o servidor passou um URL inicial, esse é o preview.
  // Se não houver image_key mas houver URL (raro), mantém.

  async function handleImageChange(file: File) {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
      setError("Formato não suportado. Use JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("A imagem tem de ter no máximo 5 MB.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectKey = `cursos/${crypto.randomUUID()}.${ext}`;

    setUploading(true);
    try {
      await uploadFileToB2(objectKey, file);
      // Apaga a imagem antiga (best-effort).
      if (imageKey) {
        void deleteB2Objects([imageKey]).catch(() => undefined);
      }
      setImageKey(objectKey);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    setError(null);
    if (!imageKey) {
      setPreviewUrl(null);
      return;
    }
    try {
      await deleteB2Objects([imageKey]);
      setImageKey(null);
      setPreviewUrl(null);
    } catch (e) {
      setError(networkErrorMessage(e));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("O nome do curso é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/admin/cursos/${initial!.id}`
        : "/api/admin/cursos";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          image_key: imageKey,
        }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a guardar curso.");
        return;
      }
      router.push("/admin/cursos");
      router.refresh();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !initial) return;
    const ok = await confirm({
      title: "Apagar curso?",
      message: (
        <>
          Tem certeza de que deseja <strong>apagar o curso "{initial.nome}"</strong>?
          Esta ação não pode ser desfeita.
        </>
      ),
      confirmLabel: "Sim, apagar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cursos/${initial.id}`, {
        method: "DELETE",
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a apagar curso.");
        return;
      }
      router.push("/admin/cursos");
      router.refresh();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {dialog}
      <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#D9571E]">Dados do curso</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Nome do curso *</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ensino Médio EJA"
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Descrição</span>
            <textarea
              className={`${inputClass} mt-1.5 min-h-[120px] resize-y`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Resumo do que o aluno vai aprender, pré-requisitos, etc."
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#D9571E]">Imagem (thumbnail)</h2>
        <p className="mt-1 text-sm text-slate-600">
          JPG, PNG, WEBP ou GIF. Tamanho máximo 5 MB. A imagem é guardada no
          Backblaze B2 (bucket <code className="rounded bg-slate-100 px-1 text-xs">cursos-proeduka</code>, chave <code className="rounded bg-slate-100 px-1 text-xs">cursos/...</code>).
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Pré-visualização"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                Sem imagem
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F66828] bg-white px-4 py-2 text-sm font-semibold text-[#F66828] transition hover:bg-[#F66828]/5">
              {uploading ? "A enviar…" : imageKey ? "Trocar imagem" : "Enviar imagem"}
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageChange(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {imageKey ? (
              <button
                type="button"
                onClick={() => void handleRemoveImage()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Remover imagem
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:flex-initial"
        >
          {saving ? "A guardar…" : isEdit ? "Guardar alterações" : "Criar curso"}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || saving}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "A apagar…" : "Apagar curso"}
          </button>
        ) : null}
      </div>
    </form>
    </>
  );
}