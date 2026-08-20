import type { PendenciasAluno } from "@/lib/aluno-tabela";

export function AlunoPendenciasResumo({
  nome,
  pendencias,
}: {
  nome: string | null;
  pendencias: PendenciasAluno;
}) {
  const { informacoes, documentos, totalCount } = pendencias;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#D9571E]">Olá{nome ? `, ${nome}` : ""}</h2>
        <p className="mt-2 text-sm text-slate-700">
          Abaixo está o que ainda falta para completar seu cadastro. Quando
          você enviar um documento ou preencher um dado, a equipe atualiza a
          base — em breve você também poderá fazer isso aqui no portal.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {totalCount === 0 ? (
            <span className="font-medium text-emerald-800">
              Tudo certo: não há pendências visíveis neste momento.
            </span>
          ) : (
            <span>
              <strong className="tabular-nums">{totalCount}</strong> pendência
              {totalCount === 1 ? "" : "s"} (informações ou documentos).
            </span>
          )}
        </div>
      </section>

      {informacoes.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
          <h2 className="text-lg font-semibold text-amber-950">
            Informações em falta
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-amber-950">
            {informacoes.map((p) => (
              <li key={p.key}>{p.label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {documentos.length > 0 ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/80 p-6">
          <h2 className="text-lg font-semibold text-sky-950">
            Documentos / conferências pendentes
          </h2>
          <p className="mt-1 text-xs text-sky-900/90">
            Estes itens aparecem como pendentes enquanto o valor na base não
            estiver marcado como entregue (ex.: identidade = true).
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-sky-950">
            {documentos.map((p) => (
              <li key={p.key}>{p.label}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
