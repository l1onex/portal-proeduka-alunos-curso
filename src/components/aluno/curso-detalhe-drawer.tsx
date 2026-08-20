"use client";

import { useEffect, useState } from "react";

import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

import type { AlunoCursoRow } from "@/lib/api/aluno-cursos";
import type { CursoPedidoRow } from "@/lib/api/curso-pedidos";

type Props = {
  open: boolean;
  curso: AlunoCursoRow | null;
  alunoVariant: "student" | "admin";
  alunoId: string;
  onClose: () => void;
};

/**
 * Drawer lateral direito com o detalhe de um curso atribuído.
 * Inclui:
 *   - Status (Cursando / Concluído)
 *   - Botão "Solicitar certificado" (só aluno, só a_cursar, sem pedido ativo)
 *   - Botão "Remover curso" (só admin)
 */
export function CursoDetalheDrawer({
  open,
  curso,
  alunoVariant,
  alunoId,
  onClose,
}: Props) {
  /** Imagem do curso (vem pronta do servidor — `curso.image_url`). */
  const imageUrl = curso?.image_url ?? null;
  const { confirm, dialog } = useConfirmDialog();
  const [busy, setBusy] = useState(false);
  const [_msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** Pedido ativo (pendente ou iniciado) para este curso — só aluno. */
  const [pedidoAtivo, setPedidoAtivo] = useState<CursoPedidoRow | null>(null);

  /** Limpa estado e busca o pedido ativo do aluno quando o drawer abre. */
  useEffect(() => {
    if (!open || !curso) {
      setMsg(null);
      setErr(null);
      setPedidoAtivo(null);
      return;
    }
    let cancelled = false;
    if (alunoVariant === "student") {
      void fetch(`/api/aluno/cursos/${curso.id}/pedido-ativo`)
        .then((r) => (async () => (r.ok ? await r.json() : null))())
        .then((data) => {
          if (!cancelled && data?.ok) {
            setPedidoAtivo((data.pedido as CursoPedidoRow) ?? null);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [open, curso, alunoVariant]);

  /** Fecha com a tecla Esc. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fecha com a tecla Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !curso) return null;

  async function handleRemoverCurso() {
    if (!curso) return;
    const ok = await confirm({
      title: "Remover curso?",
      message: (
        <>
          Tem certeza de que deseja <strong>remover o curso &quot;{curso.nome}&quot;</strong>{" "}
          deste aluno? Ele deixará de vê-lo na ficha dele.
        </>
      ),
      confirmLabel: "Sim, remover",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/cursos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curso_id: curso.id }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro a remover o curso do aluno.");
        return;
      }
      setMsg("Curso removido do aluno.");
      // Fecha o drawer e recarrega a página para o pai (AlunoCursosCard)
      // ver a lista atualizada.
      setTimeout(() => {
        onClose();
        if (typeof window !== "undefined") window.location.reload();
      }, 500);
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSolicitarCertificado() {
    if (pedidoAtivo) return; // já existe pedido — defesa adicional
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aluno/cursos/${curso!.id}/solicitar`, {
        method: "POST",
      });
      const { ok, data, error } = await readJsonResponse(res);
      if (!ok) {
        setErr(error ?? "Erro a solicitar certificado.");
        return;
      }
      // Refresca o pedido ativo para o botão desativar e o card aparecer.
      if (data?.pedido) {
        setPedidoAtivo(data.pedido as CursoPedidoRow);
      } else {
        // Sem payload, volta a buscar.
        try {
          const r = await fetch(
            `/api/aluno/cursos/${curso!.id}/pedido-ativo`,
          );
          const j = await r.json();
          if (j?.ok) setPedidoAtivo((j.pedido as CursoPedidoRow) ?? null);
        } catch {
          // silencioso
        }
      }
    } catch (e) {
      setErr(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {dialog}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe do curso"
        className="fixed inset-0 z-50"
      >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl shadow-slate-900/30 sm:w-[28rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-[#D9571E]">
              {curso.nome}
            </h2>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
                curso.status === "concluido"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {curso.status === "concluido" ? "Concluído" : "Cursando"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={curso.nome}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
              Sem imagem
            </div>
          )}

          <div className="px-5 py-4">
            {curso.descricao ? (
              <p className="text-sm leading-relaxed text-slate-700">
                {curso.descricao}
              </p>
            ) : (
              <p className="text-sm italic text-slate-400">Sem descrição.</p>
            )}

            {alunoVariant === "student" && pedidoAtivo && curso.status === "a_cursar" ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <p className="font-semibold">
                  Solicitação enviada — a aguardar análise
                </p>
                <p className="mt-1 text-xs leading-relaxed text-sky-900/90">
                  Enviada em{" "}
                  {new Date(pedidoAtivo.criado_em).toLocaleString("pt-BR")}. Em
                  até 24 horas a nossa equipa irá analisar o seu pedido. Quando
                  for aceite, o certificado será enviado pelo WhatsApp
                  cadastrado na sua matrícula.
                </p>
              </div>
            ) : null}

            {err ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {err}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          {alunoVariant === "student" && curso.status === "a_cursar" ? (
            pedidoAtivo ? (
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                    clipRule="evenodd"
                  />
                </svg>
                Solicitação já enviada
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSolicitarCertificado}
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {busy ? "A enviar…" : "Solicitar certificado"}
              </button>
            )
          ) : null}

          {alunoVariant === "student" && curso.status === "concluido" ? (
            <p className="text-center text-sm text-slate-500">
              Curso concluído. Certificado disponível.
            </p>
          ) : null}

          {alunoVariant === "admin" && curso.status === "a_cursar" ? (
            <button
              type="button"
              onClick={() => void handleRemoverCurso()}
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
            >
              {busy ? "A remover…" : "Remover curso do aluno"}
            </button>
          ) : null}

          {alunoVariant === "admin" && curso.status === "concluido" ? (
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-500">
                Concluído em{" "}
                {curso.concluido_em
                  ? new Date(curso.concluido_em).toLocaleDateString("pt-BR")
                  : "—"}
                .
              </p>
              <button
                type="button"
                onClick={() => void handleRemoverCurso()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? "A remover…" : "Remover curso do aluno"}
              </button>
            </div>
          ) : null}
        </footer>
      </aside>
    </div>
    </>
  );
}