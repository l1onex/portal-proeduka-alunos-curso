"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { formatDateTimeBrazil } from "@/lib/format-br";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

import type { CursoSolicitacaoRow } from "@/lib/api/curso-solicitacoes";

type Props = {
  pedidos: CursoSolicitacaoRow[];
  thumbMap: Record<string, string | null>;
};

export function CursoSolicitacoesClient({ pedidos, thumbMap }: Props) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [filtro, setFiltro] = useState<
    "pendente" | "aprovado" | "recusado" | "todos"
  >("pendente");
  const [motivoPorPedido, setMotivoPorPedido] = useState<
    Record<string, string>
  >({});
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const filtrados = pedidos.filter((p) =>
    filtro === "todos" ? true : p.status === filtro,
  );

  function recarregar() {
    router.refresh();
  }

  async function handleLiberar(p: CursoSolicitacaoRow) {
    const alunoNome = p.aluno_nome?.trim() || p.aluno_email || "este aluno";
    const ok = await confirm({
      title: "Liberar curso?",
      message: (
        <>
          Tem certeza de que deseja <strong>liberar o curso "{p.curso_nome ?? "?"}"</strong>{" "}
          para <strong>{alunoNome}</strong>?
          <br />
          O aluno passará a ter o curso na ficha dele.
        </>
      ),
      confirmLabel: "Sim, liberar",
      cancelLabel: "Cancelar",
      variant: "success",
    });
    if (!ok) return;
    setBusy(p.id);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/admin/curso-solicitacoes/aprovar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitacao_id: p.id }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a liberar o curso.");
        return;
      }
      setOkMsg("Curso liberado para o aluno.");
      recarregar();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRecusar(p: CursoSolicitacaoRow) {
    const alunoNome = p.aluno_nome?.trim() || p.aluno_email || "este aluno";
    const ok = await confirm({
      title: "Recusar pedido?",
      message: (
        <>
          Tem certeza de que deseja <strong>recusar o pedido de "{p.curso_nome ?? "?"}"</strong>{" "}
          para <strong>{alunoNome}</strong>?
        </>
      ),
      confirmLabel: "Sim, recusar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(p.id);
    setError(null);
    setOkMsg(null);
    try {
      const motivo = motivoPorPedido[p.id]?.trim() || null;
      const res = await fetch("/api/admin/curso-solicitacoes/recusar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitacao_id: p.id, motivo }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a recusar pedido.");
        return;
      }
      setOkMsg("Pedido recusado. O aluno pode voltar a solicitar.");
      setPedidoAberto(null);
      recarregar();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {dialog}
      <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["pendente", "aprovado", "recusado", "todos"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              filtro === f
                ? "bg-[#D9571E] text-white shadow"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {okMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {okMsg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 shadow-sm">
          Sem pedidos{" "}
          {filtro === "todos" ? "" : `com status "${filtro}"`}.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((p) => {
            const aberto = pedidoAberto === p.id;
            return (
              <li
                key={p.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-36">
                    {thumbMap[p.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbMap[p.id]!}
                        alt={p.curso_nome ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold uppercase tracking-wide ${
                        p.status === "pendente"
                          ? "text-amber-700"
                          : p.status === "aprovado"
                            ? "text-emerald-700"
                            : "text-red-700"
                      }`}
                    >
                      {p.status === "pendente"
                        ? "Pendente"
                        : p.status === "aprovado"
                          ? "Liberado"
                          : "Recusado"}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {p.curso_nome ?? "—"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-semibold">Aluno:</span>{" "}
                      <Link
                        href={`/admin/alunos/${p.aluno_id}`}
                        className="text-[#F66828] underline-offset-2 hover:underline"
                      >
                        {p.aluno_nome?.trim() || p.aluno_email || "—"}
                      </Link>
                    </p>
                    {p.aluno_email && p.aluno_nome?.trim() ? (
                      <p className="text-xs text-slate-500">{p.aluno_email}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      Solicitado em {formatDateTimeBrazil(p.criado_em)}
                    </p>
                    {p.status === "recusado" && p.motivo ? (
                      <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Motivo: {p.motivo}
                      </p>
                    ) : null}
                  </div>
                  {p.status === "pendente" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <button
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => void handleLiberar(p)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                      >
                        {busy === p.id ? "A liberar…" : "Liberar curso"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => setPedidoAberto(aberto ? null : p.id)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {aberto ? "Fechar" : "Recusar"}
                      </button>
                    </div>
                  ) : null}
                </div>

                {aberto && p.status === "pendente" ? (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
                      Motivo da recusa (opcional)
                    </label>
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20"
                      placeholder="Ex.: Aguarde confirmação do pagamento."
                      value={motivoPorPedido[p.id] ?? ""}
                      onChange={(e) =>
                        setMotivoPorPedido((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleRecusar(p)}
                        disabled={busy === p.id}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                      >
                        Confirmar recusa
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </>
  );
}