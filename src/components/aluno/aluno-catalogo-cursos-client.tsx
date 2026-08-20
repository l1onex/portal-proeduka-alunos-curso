"use client";

import { useMemo, useState } from "react";

import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type CursoItem = {
  id: string;
  nome: string;
  descricao: string | null;
  image_key: string | null;
  image_url: string | null;
  estado: "atribuido" | "pendente" | "recusado" | "disponivel";
  status: string | null;
  motivo: string | null;
};

type Props = {
  studentId: string;
  cursos: CursoItem[];
  loadError: string | null;
};

export function AlunoCatalogoCursosClient({
  cursos: initialCursos,
  loadError: initialLoadError,
}: Props) {
  const { confirm, dialog } = useConfirmDialog();
  const [cursos, setCursos] = useState<CursoItem[]>(initialCursos);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "atribuido" | "pendente" | "disponivel" | "recusado"
  >("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cursos.filter((c) => {
      if (filtro !== "todos" && c.estado !== filtro) return false;
      if (!q) return true;
      return c.nome.toLowerCase().includes(q);
    });
  }, [cursos, busca, filtro]);

  async function handleSolicitar(curso: CursoItem) {
    const ok = await confirm({
      title: "Solicitar curso?",
      message: (
        <>
          Tem certeza de que deseja <strong>solicitar o curso &quot;{curso.nome}&quot;</strong>?
          <br />
          A equipa administrativa vai receber o pedido e decidir se libera o
          curso para você.
        </>
      ),
      confirmLabel: "Sim, solicitar",
      cancelLabel: "Cancelar",
      variant: "default",
    });
    if (!ok) return;
    setBusy(curso.id);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/aluno/cursos/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curso_id: curso.id }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setError(error ?? "Erro a enviar solicitação.");
        return;
      }
      setOkMsg(`Pedido enviado para "${curso.nome}". Aguarde a liberação.`);
      // Marca localmente como pendente.
      setCursos((prev) =>
        prev.map((c) => (c.id === curso.id ? { ...c, estado: "pendente" } : c)),
      );
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {dialog}
      <div className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Catálogo
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
          Cursos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Veja todos os cursos disponíveis na instituição. Clique em{" "}
          <span className="font-semibold text-[#D9571E]">Solicitar curso</span>{" "}
          para pedir liberação à equipa. Quando aprovada, o curso aparece na sua
          ficha e você pode acompanhar o progresso por aqui.
        </p>
      </header>

      {initialLoadError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          {initialLoadError}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
          {okMsg}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar curso por nome…"
            autoComplete="off"
            className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/25"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["atribuido", "Já tenho"],
              ["pendente", "Aguardando"],
              ["disponivel", "Disponíveis"],
              ["recusado", "Recusados"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltro(k)}
              className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                filtro === k
                  ? "bg-[#D9571E] text-white shadow"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 shadow-sm">
          {cursos.length === 0
            ? "Ainda não há cursos cadastrados no sistema."
            : "Nenhum curso para esse filtro / pesquisa."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => {
            const badge = badgeFor(c);
            return (
              <li
                key={c.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
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
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide shadow-sm ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div>
                    <h3 className="line-clamp-2 text-base font-bold text-slate-900">
                      {c.nome}
                    </h3>
                    {c.descricao ? (
                      <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                        {c.descricao}
                      </p>
                    ) : null}
                    {c.estado === "recusado" && c.motivo ? (
                      <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[0.7rem] text-slate-600">
                        Motivo da recusa: {c.motivo}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-auto">
                    {c.estado === "atribuido" ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {c.status === "concluido" ? "Concluído" : "Cursando"}
                        </span>
                        <a
                          href="/aluno"
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#D9571E] hover:bg-sky-50/80"
                        >
                          Ver na ficha
                        </a>
                      </div>
                    ) : c.estado === "pendente" ? (
                      <span className="inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        Aguardando liberação
                      </span>
                    ) : c.estado === "recusado" ? (
                      <button
                        type="button"
                        onClick={() => void handleSolicitar(c)}
                        disabled={busy === c.id}
                        className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border-2 border-[#F66828]/40 bg-white px-3 py-2 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:bg-sky-50/80 disabled:opacity-60"
                      >
                        {busy === c.id ? "A enviar…" : "Solicitar novamente"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSolicitar(c)}
                        disabled={busy === c.id}
                        className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                      >
                        {busy === c.id ? "A enviar…" : "Solicitar curso"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </>
  );
}

function badgeFor(c: CursoItem): { label: string; cls: string } {
  if (c.estado === "atribuido") {
    return {
      label: c.status === "concluido" ? "Concluído" : "Já atribuído",
      cls: "bg-emerald-100/95 text-emerald-900",
    };
  }
  if (c.estado === "pendente") {
    return {
      label: "Aguardando",
      cls: "bg-amber-100/95 text-amber-900",
    };
  }
  if (c.estado === "recusado") {
    return {
      label: "Recusado",
      cls: "bg-red-100/95 text-red-900",
    };
  }
  return {
    label: "Disponível",
    cls: "bg-sky-100/95 text-sky-900",
  };
}