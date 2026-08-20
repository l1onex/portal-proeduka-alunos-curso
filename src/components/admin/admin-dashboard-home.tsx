import type { ReactNode } from "react";
import type { DashboardStats } from "@/lib/admin/dashboard-stats";

type Props = {
  stats: DashboardStats;
};

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12.5 11 14.5 15 10.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 9-14h-7l1-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProgress({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUserMinus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0M21 8l-6 6M15 8l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V5m4 14V9m4 10V6m4 13v-7m4 8V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCredit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M2 10h20M7 15h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AdminDashboardHome({ stats }: Props) {
  const capped =
    stats.totalStudents > stats.analyzedRows && stats.analyzedRows > 0;

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* fundo decorativo */}
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-72 w-72 rounded-full bg-[#F66828]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 top-32 h-64 w-64 rounded-full bg-[#D9571E]/10 blur-3xl"
        aria-hidden
      />

      <header className="relative mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F66828]">
          Área interna
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Visão em tempo real dos alunos, pendências de cadastro e entradas
          recentes. Métricas alinhadas às mesmas regras do portal do aluno.
        </p>
        {stats.error ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Alguns dados não carregaram: {stats.error}
          </p>
        ) : null}
      </header>

      {/* KPIs — duas linhas de três cards */}
      <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<IconUsers className="h-6 w-6" />}
          tone="blue"
          label="Alunos na base"
          value={stats.totalStudents}
          sub="Total de registos"
        />
        <StatCard
          icon={<IconCheck className="h-6 w-6" />}
          tone="emerald"
          label="Certificado"
          value={stats.certificadoCount}
          sub={
            capped
              ? `Entre os ${stats.analyzedRows} mais recentes analisados`
              : "Cadastro completo e certificado já aprovado (final)"
          }
        />
        <StatCard
          icon={<IconProgress className="h-6 w-6" />}
          tone="sky"
          label="Em análise"
          value={stats.emAnaliseCount}
          sub={
            capped
              ? `Entre os ${stats.analyzedRows} mais recentes analisados`
              : "Pedido de certificado feito no portal; ainda sem aprovação final"
          }
        />
        <StatCard
          icon={<IconChart className="h-6 w-6" />}
          tone="violet"
          label="Aguarda solicitação"
          value={stats.aguardandoSolicitacaoCount}
          sub={
            capped
              ? `Entre os ${stats.analyzedRows} mais recentes analisados`
              : "Cadastro completo; o aluno ainda não pediu o certificado no portal"
          }
        />
        <StatCard
          icon={<IconBolt className="h-6 w-6" />}
          tone="amber"
          label="Em andamento"
          value={stats.emAndamentoCount}
          sub={
            capped
              ? `Entre os ${stats.analyzedRows} mais recentes analisados`
              : "Com pendências, sem certificado aprovado"
          }
        />
        <StatCard
          icon={<IconUserMinus className="h-6 w-6" />}
          tone="rose"
          label="Desistentes"
          value={stats.desistenteCount}
          sub={
            capped
              ? `Entre os ${stats.analyzedRows} mais recentes analisados`
              : "Marcados como desistentes (cadastro aberto)"
          }
        />
        <StatCard
          icon={<IconChart className="h-6 w-6" />}
          tone="violet"
          label="Novos (7 dias)"
          value={stats.newLast7Days ?? "—"}
          sub={
            stats.newLast7Days === null
              ? "Coluna created_at indisponível ou sem dados"
              : "Incluídos na base nesta semana"
          }
        />
      </div>

      {capped ? (
        <p className="relative mt-4 text-xs text-slate-500">
          Certificado, em análise, aguarda solicitação, taxa de conclusão, em
          andamento e desistentes
          usam os últimos <strong>{stats.analyzedRows}</strong> registos (limite
          de análise). Total na base: <strong>{stats.totalStudents}</strong>.
        </p>
      ) : null}

      {/* Taxa + extra */}
      <div className="relative mt-10 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <IconChart className="h-5 w-5 text-[#F66828]" />
                Taxa de cadastro completo
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Alunos sem pendências no universo analisado (amostra acima).
              </p>
            </div>
            <span className="rounded-lg bg-gradient-to-br from-[#D9571E] to-[#F66828] px-3 py-1.5 text-lg font-bold tabular-nums text-white shadow-md">
              {stats.completionRate}%
            </span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F66828] via-[#0ea5e9] to-[#D9571E] transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, stats.completionRate))}%`,
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>{stats.completeCount} completos</span>
            <span>{stats.pendingCount} pendentes</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0c1a3a] p-6 text-white shadow-lg shadow-slate-300/40">
          <h2 className="text-sm font-semibold text-white/95">
            Situação &quot;final&quot;
          </h2>
          <p className="mt-1 text-xs text-white/60">
            Alunos ainda sem certificado homologado (situação &quot;final&quot;),
            quando este dado existe nos registos.
          </p>
          <p className="mt-6 font-mono text-4xl font-bold tabular-nums tracking-tight text-cyan-300">
            {stats.finalMetricAvailable && stats.pendingFinalCount !== null
              ? stats.pendingFinalCount
              : "—"}
          </p>
          <p className="mt-2 text-xs text-white/50">
            {stats.finalMetricAvailable && stats.pendingFinalCount !== null
              ? "Use para acompanhar conclusões administrativas."
              : "Métrica indisponível. Verifique permissões ou o suporte técnico."}
          </p>
        </section>
      </div>

      {/* Formas de pagamento */}
      <section className="relative mt-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <IconCredit className="h-5 w-5 text-[#F66828]" />
              Formas de pagamento
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Alunos por valor do campo <span className="font-mono">form_pag</span>{" "}
              na base (inclui &quot;Não informado&quot; quando vazio).
            </p>
          </div>
          {stats.formPagMetricAvailable && stats.totalStudents > 0 ? (
            <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Total: {stats.totalStudents} alunos
            </span>
          ) : null}
        </div>

        {!stats.formPagMetricAvailable ? (
          <p className="mt-4 text-sm text-amber-800">
            Não foi possível carregar esta métrica (forma de pagamento). Verifique
            o cadastro dos alunos e as permissões de leitura, ou contacte o
            suporte técnico.
          </p>
        ) : stats.formPagBreakdown.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Nenhum aluno na base.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Forma de pagamento</th>
                  <th className="px-4 py-3 text-right tabular-nums">Alunos</th>
                  <th className="hidden w-[40%] min-w-[120px] px-4 py-3 sm:table-cell">
                    Partilha
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.formPagBreakdown.map((row) => {
                  const pct =
                    stats.totalStudents > 0
                      ? Math.round((row.count / stats.totalStudents) * 1000) /
                        10
                      : 0;
                  return (
                    <tr
                      key={row.label}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#D9571E]">
                        {row.count}
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#F66828] to-[#D9571E]"
                              style={{
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                              }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub: string;
  tone: "blue" | "emerald" | "amber" | "violet" | "rose" | "sky";
}) {
  const ring = {
    blue: "from-[#F66828]/30 to-[#D9571E]/5",
    emerald: "from-emerald-400/35 to-emerald-600/5",
    amber: "from-amber-400/40 to-amber-700/5",
    violet: "from-violet-400/35 to-violet-700/5",
    rose: "from-rose-400/35 to-rose-700/5",
    sky: "from-sky-400/35 to-sky-800/5",
  }[tone];

  const iconBg = {
    blue: "bg-[#F66828]/15 text-[#D9571E]",
    emerald: "bg-emerald-500/15 text-emerald-700",
    amber: "bg-amber-500/15 text-amber-800",
    violet: "bg-violet-500/15 text-violet-800",
    rose: "bg-rose-500/15 text-rose-900",
    sky: "bg-sky-500/15 text-sky-900",
  }[tone];

  const valueClass = {
    blue: "text-[#D9571E]",
    emerald: "text-emerald-700",
    amber: "text-amber-950",
    violet: "text-violet-900",
    rose: "text-rose-900",
    sky: "text-sky-900",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-5 shadow-md shadow-slate-200/60 backdrop-blur-sm">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${ring} blur-2xl`}
        aria-hidden
      />
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-snug text-slate-500">{sub}</p>
    </div>
  );
}
