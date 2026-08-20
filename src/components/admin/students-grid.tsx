import Link from "next/link";
import { StudentCardAvatar } from "@/components/admin/student-card-avatar";

export type StudentCardData = {
  id: string;
  name: string;
  /** Anos completos desde `dt_nasc`; null se não houver data válida. */
  idadeAnos: number | null;
  course: string;
  unit: string;
  email: string;
  status: string;
  paymentLabel: string | null;
  avatarUrl: string | null;
};

function statusStyle(status: string) {
  switch (status) {
    case "approved":
    case "em_analise":
      return "bg-emerald-500/15 text-emerald-800 ring-emerald-400/40";
    case "aguardando_solicitacao":
      return "bg-sky-500/12 text-sky-950 ring-sky-400/40";
    case "pending":
      return "bg-amber-500/15 text-amber-900 ring-amber-400/45";
    case "rejected":
      return "bg-red-500/15 text-red-800 ring-red-400/40";
    case "blocked":
      return "bg-slate-500/10 text-slate-700 ring-slate-400/35";
    case "desistente":
      return "bg-rose-500/12 text-rose-950 ring-rose-400/40";
    case "inadimplente":
      return "bg-orange-500/15 text-orange-950 ring-orange-400/45";
    default:
      return "bg-slate-500/10 text-slate-800 ring-slate-400/35";
  }
}

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  em_analise: "Em análise",
  aguardando_solicitacao: "Aguarda solicitação",
  rejected: "Rejeitado",
  blocked: "Bloqueado",
  desistente: "Desistente",
  inadimplente: "Inadimplente",
};

function paymentStyle(paymentLabel: string) {
  switch (paymentLabel) {
    case "Gratuito":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-400/35";
    case "PIX":
      return "bg-cyan-500/12 text-cyan-950 ring-cyan-400/40";
    case "Cartão de crédito":
      return "bg-violet-500/12 text-violet-950 ring-violet-400/40";
    default:
      return "bg-slate-500/10 text-slate-800 ring-slate-400/35";
  }
}

export function StudentsGrid({ rows }: { rows: StudentCardData[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={`/admin/alunos/${row.id}`}
          className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/95 p-4 shadow-md shadow-slate-200/70 backdrop-blur-sm transition hover:border-[#F66828]/35 hover:shadow-lg hover:shadow-slate-300/50 sm:p-5"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-[#F66828]/12 to-[#D9571E]/5 blur-2xl transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
            <StudentCardAvatar
              src={row.avatarUrl}
              name={row.name}
              email={row.email}
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="break-words text-base font-semibold leading-snug tracking-tight text-[#D9571E] group-hover:text-[#0038c4]">
                {row.name}
              </p>
              {row.idadeAnos !== null ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-600 sm:text-xs">
                  <span className="font-medium text-slate-500">Idade:</span>{" "}
                  {row.idadeAnos}{" "}
                  {row.idadeAnos === 1 ? "ano" : "anos"}
                </p>
              ) : null}
              <p className="mt-1 break-all text-xs text-slate-500">{row.email}</p>
              {(row.course !== "—" || row.unit !== "—") && (
                <div className="mt-2 space-y-0.5 text-left text-[11px] leading-snug text-slate-600 sm:text-xs">
                  {row.course !== "—" ? (
                    <p className="line-clamp-2">
                      <span className="font-medium text-slate-500">Curso:</span>{" "}
                      {row.course}
                    </p>
                  ) : null}
                  {row.unit !== "—" ? (
                    <p className="line-clamp-1">
                      <span className="font-medium text-slate-500">
                        Unidade:
                      </span>{" "}
                      {row.unit}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${statusStyle(row.status)}`}
                >
                  {statusLabel[row.status] ?? row.status}
                </span>
                {row.paymentLabel ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${paymentStyle(row.paymentLabel)}`}
                  >
                    {row.paymentLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <span className="mt-4 block text-center text-xs font-medium text-[#F66828] opacity-0 transition group-hover:opacity-100 sm:text-left">
            Abrir ficha →
          </span>
        </Link>
      ))}
    </div>
  );
}
