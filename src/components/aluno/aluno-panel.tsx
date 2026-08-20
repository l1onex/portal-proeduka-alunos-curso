"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DOCUMENT_LABELS,
  DOCUMENT_TYPES,
  type DocumentType,
  pendingDocumentTypes,
} from "@/lib/required-documents";
import { deleteB2Objects, uploadFileToB2 } from "@/lib/client/b2-upload";
import {
  allAvatarStorageKeys,
  assertAvatarPhotoAllowed,
  avatarPathForStudent,
  documentPathForStudent,
  studentFolderPath,
} from "@/lib/student-storage";

type StudentRow = {
  id: string;
  email: string | null;
  avatar_path?: string | null;
};

type DocRow = {
  id: string;
  document_type: string;
  storage_path: string;
  created_at: string;
};

export function AlunoPanel({
  student,
  documents,
  displayName,
}: {
  student: StudentRow;
  documents: DocRow[];
  displayName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const uploaded = new Set(documents.map((d) => d.document_type));
  const pending = pendingDocumentTypes(uploaded);

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      const pol = assertAvatarPhotoAllowed(ext, file.type ?? "");
      if (!pol.ok) {
        setErr(pol.error);
        return;
      }
      await deleteB2Objects(allAvatarStorageKeys(student.id));
      const path = avatarPathForStudent(student.id, ext);
      try {
        await uploadFileToB2(path, file);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha no upload.");
        return;
      }
      setErr(
        "Arquivo enviado ao armazenamento. O registro na base será atualizado quando a integração estiver ativa.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(type: DocumentType, file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
      const path = documentPathForStudent(student.id, type, ext);
      try {
        await uploadFileToB2(path, file);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha no upload.");
        return;
      }
      setErr(
        "Arquivo enviado ao armazenamento. O registro na base será atualizado quando a integração estiver ativa.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#D9571E]">Seu perfil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pasta no sistema:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">
            {studentFolderPath(student.id)}/
          </code>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Olá, <strong>{displayName ?? student.email ?? "aluno"}</strong>
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Foto de perfil (formato 3x4)
          </label>
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Envie uma foto <strong>no modelo 3x4</strong> (retrato, como em
            documento oficial): rosto visível, enquadramento vertical, fundo
            neutro. Evite paisagem ou selfies muito próximas.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            disabled={busy}
            className="mt-3 block w-full text-sm text-slate-600"
            onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-slate-400">
            A foto aparece para a equipe no painel administrativo.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
        <h2 className="text-lg font-semibold text-amber-950">Pendências</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-amber-900">
            Todos os documentos obrigatórios foram enviados.
          </p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-amber-950">
            {pending.map((t) => (
              <li key={t}>{DOCUMENT_LABELS[t]}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#D9571E]">Documentos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Envie PDF ou imagem legível. Você pode substituir um arquivo enviando
          de novo.
        </p>
        <ul className="mt-4 space-y-4">
          {DOCUMENT_TYPES.map((type) => (
            <li
              key={type}
              className="flex flex-col gap-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {DOCUMENT_LABELS[type]}
                </p>
                {uploaded.has(type) ? (
                  <p className="text-xs text-emerald-700">Enviado</p>
                ) : (
                  <p className="text-xs text-amber-700">Pendente</p>
                )}
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                disabled={busy}
                className="max-w-xs text-sm"
                onChange={(e) => uploadDoc(type, e.target.files?.[0] ?? null)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
