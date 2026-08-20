"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "blocked", label: "Bloqueado" },
];

export function StudentDetailActions({
  studentId,
  currentStatus,
}: {
  studentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const { confirm, alert, dialog } = useConfirmDialog();
  const [status, setStatus] = useState(currentStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  async function patchStatus(next: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        await alert({
          title: "Não foi possível salvar",
          message: data.error ?? "Erro ao salvar.",
          variant: "danger",
        });
        setStatus(currentStatus);
        return;
      }
      setStatus(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Excluir aluno?",
      message:
        "Tem certeza de que deseja excluir este aluno permanentemente? Login e arquivos serão removidos.",
      confirmLabel: "Sim, excluir",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        await alert({
          title: "Não foi possível excluir",
          message: data.error ?? "Erro ao excluir.",
          variant: "danger",
        });
        return;
      }
      router.push("/admin/alunos");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {dialog}
      <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-600">Status:</span>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm capitalize"
          value={status}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            void patchStatus(v);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => remove()}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Excluir aluno
      </button>
    </div>
    </>
  );
}
