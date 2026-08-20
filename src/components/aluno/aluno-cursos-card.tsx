"use client";

import { useEffect, useState } from "react";

import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

import type { AlunoCursoRow } from "@/lib/api/aluno-cursos";

import { CursoDetalheDrawer } from "@/components/aluno/curso-detalhe-drawer";

type CursoDisponivel = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
};

type Props = {
  alunoId: string;
  variant: "student" | "admin";
  /** Lista inicial (server-side) — opcional. */
  initialCursos?: AlunoCursoRow[];
};

export function AlunoCursosCard({
  alunoId,
  variant,
  initialCursos,
}: Props) {
  const { confirm, dialog } = useConfirmDialog();
  const [cursos, setCursos] = useState<AlunoCursoRow[]>(initialCursos ?? []);
  const [loading, setLoading] = useState<boolean>(!initialCursos);
  const [error, setError] = useState<string | null>(null);

  const [openCurso, setOpenCurso] = useState<AlunoCursoRow | null>(null);

  /** Só admin pode atribuir. */
  const canManage = variant === "admin";

  // Select de "atribuir novo"
  const [disponiveis, setDisponiveis] = useState<CursoDisponivel[]>([]);
  const [selecionado, setSelecionado] = useState<string>("");
  const [atribuindo, setAtribuindo] = useState(false);

  // As URLs das thumbnails vêm prontas do servidor (image_url).
  // Não há presign no cliente — admin e aluno usam o mesmo caminho.

  async function loadCursos() {
    setLoading(true);
    setError(null);
    try {
      // Admin: rota admin (passa o alunoId). Aluno: rota própria dele.
      const url =
        variant === "admin"
          ? `/api/admin/alunos/${alunoId}/cursos`
          : "/api/aluno/cursos";
      const res = await fetch(url);
      const { ok, error, data } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a listar cursos.");
        return;
      }
      setCursos((data.cursos as AlunoCursoRow[]) ?? []);
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDisponiveis() {
    if (!canManage) return;
    try {
      const res = await fetch(
        `/api/admin/alunos/${alunoId}/cursos?disponiveis=1`,
      );
      const { ok, data } = await readJsonResponse(res);
      if (!ok) return;
      setDisponiveis((data.cursos as CursoDisponivel[]) ?? []);
    } catch {
      // silencioso — só atrapalha se falhar.
    }
  }

// (URLs já vêm prontas do servidor — ver `image_url` em `AlunoCursoRow`.)

  useEffect(() => {
    if (!initialCursos) void loadCursos();
    if (canManage) void loadDisponiveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAtribuir() {
    if (!selecionado) return;
    setAtribuindo(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/cursos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curso_id: selecionado }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a atribuir curso.");
        return;
      }
      setSelecionado("");
      await Promise.all([loadCursos(), loadDisponiveis()]);
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setAtribuindo(false);
    }
  }

  async function handleDesatribuir(cursoId: string) {
    const ok = await confirm({
      title: "Remover curso?",
      message: (
        <>
          Tem certeza de que deseja <strong>remover este curso</strong> do
          aluno? Ele deixará de vê-lo na ficha dele.
        </>
      ),
      confirmLabel: "Sim, remover",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}/cursos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curso_id: cursoId }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a desatribuir curso.");
        return;
      }
      await Promise.all([loadCursos(), loadDisponiveis()]);
    } catch (e) {
      setError(networkErrorMessage(e));
    }
  }

  return (
    <>
      {dialog}
      <section className="mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#D9571E]">Cursos</h2>
          <p className="mt-1 text-sm text-slate-600">
            {canManage
              ? "Atribua cursos a este aluno. Ele verá os mesmos cursos na ficha dele."
              : "Cursos atribuídos a você. Toque num para ver o detalhe."}
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <select
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20"
              value={selecionado}
              onChange={(e) => setSelecionado(e.target.value)}
              disabled={atribuindo || disponiveis.length === 0}
            >
              <option value="">
                {disponiveis.length === 0
                  ? "Sem cursos disponíveis"
                  : "Selecione um curso…"}
              </option>
              {disponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAtribuir()}
              disabled={!selecionado || atribuindo}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {atribuindo ? "A atribuir…" : "Atribuir"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">A carregar cursos…</p>
      ) : cursos.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-600">
          {canManage
            ? "Este aluno ainda não tem cursos atribuídos."
            : "Você ainda não tem cursos atribuídos."}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cursos.map((c) => (
            <li
              key={c.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setOpenCurso(c)}
                className="block w-full text-left"
              >
                <div className="relative aspect-video w-full bg-slate-100">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt={c.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                      Sem imagem
                    </div>
                  )}
                  <span
                    className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide shadow-sm ${
                      c.status === "concluido"
                        ? "bg-emerald-100/95 text-emerald-900"
                        : "bg-amber-100/95 text-amber-900"
                    }`}
                  >
                    {c.status === "concluido" ? "Concluído" : "Cursando"}
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {c.nome}
                  </p>
                </div>
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => void handleDesatribuir(c.id)}
                  className="absolute right-1.5 top-1.5 mt-7 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                  title="Remover curso do aluno"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <CursoDetalheDrawer
        open={openCurso !== null}
        curso={openCurso}
        alunoVariant={variant}
        alunoId={alunoId}
        onClose={() => setOpenCurso(null)}
      />
    </section>
    </>
  );
}