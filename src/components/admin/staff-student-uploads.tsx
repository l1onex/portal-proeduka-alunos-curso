"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fireDataUpdatedWebhook } from "@/lib/client/webhook-dispatch-client";
import { uploadFileToB2 } from "@/lib/client/b2-upload";
import {
  DOCUMENT_LABELS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPES_DATA_UPDATED_WEBHOOK,
  type DocumentType,
  pendingDocumentTypes,
} from "@/lib/required-documents";
import {
  avatarPathForStudent,
  documentPathForStudent,
} from "@/lib/student-storage";

type DocRow = {
  id: string;
  document_type: string;
  storage_path: string;
  created_at: string;
};

export function StaffStudentUploads({
  studentId,
  documents,
}: {
  studentId: string;
  documents: DocRow[];
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
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = avatarPathForStudent(studentId, ext);
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
      fireDataUpdatedWebhook({
        studentId,
        fileKey: path,
        label: "Foto estilo 3x4",
      });
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
      const path = documentPathForStudent(studentId, type, ext);
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
      if (DOCUMENT_TYPES_DATA_UPDATED_WEBHOOK.has(type)) {
        fireDataUpdatedWebhook({
          studentId,
          fileKey: path,
          label: DOCUMENT_LABELS[type],
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#D9571E]">
        Enviar arquivos por este aluno
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Master e administradores podem enviar a foto 3x4 e os documentos; as
        pendências somem quando o arquivo existir (enviado por você ou pelo
        aluno).
      </p>
      {err ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">Foto de perfil (3x4)</p>
        <p className="mt-1 text-xs text-amber-800">
          Envie uma foto no formato <strong>retrato 3x4</strong> (como documento),
          rosto visível, fundo neutro. Evite selfies muito próximas ou paisagem.
        </p>
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          className="mt-2 block w-full max-w-md text-sm"
          onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-800">Documentos</p>
        {pending.length > 0 ? (
          <p className="mt-1 text-xs text-amber-800">
            Ainda pendentes: {pending.map((t) => DOCUMENT_LABELS[t]).join(", ")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-emerald-700">Todos os tipos enviados.</p>
        )}
        <ul className="mt-3 space-y-3">
          {DOCUMENT_TYPES.map((type) => (
            <li
              key={type}
              className="flex flex-col gap-2 border-b border-gray-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {DOCUMENT_LABELS[type]}
                </p>
                {uploaded.has(type) ? (
                  <span className="text-xs text-emerald-600">Arquivo presente</span>
                ) : (
                  <span className="text-xs text-amber-700">Pendente</span>
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
      </div>
    </section>
  );
}
