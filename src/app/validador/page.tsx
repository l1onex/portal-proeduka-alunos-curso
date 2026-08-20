import Link from "next/link";
import { SupportContactInline } from "@/components/contact/support-contact-panel";
import { SiteHeader } from "@/components/site-header";
import { lookupCertificateByCode } from "@/lib/certificate/lookup";

type Props = { searchParams: Promise<{ c?: string }> };

export default async function ValidadorPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = typeof sp.c === "string" ? sp.c : "";
  const code = raw.trim();
  const hasQuery = typeof sp.c === "string";
  const result = code ? await lookupCertificateByCode(code) : null;

  return (
    <div className="flex min-h-full flex-col bg-[var(--surface)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-8 shadow-sm sm:px-8 sm:py-10 md:px-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-deep)] to-[var(--brand-accent)]"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
            Validação pública
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Conferir certificado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Digite o código do certificado ou use o link recebido pela
            instituição. Esta página não exige login.
          </p>

          <form
            action="/validador"
            method="get"
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-left">
              <span className="text-xs font-medium text-slate-600">
                Código do certificado
              </span>
              <input
                name="c"
                type="text"
                defaultValue={code}
                autoComplete="off"
                placeholder="Cole ou digite o código"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-primary/20 transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-deep)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
            >
              Validar
            </button>
          </form>
        </div>

        {hasQuery && !code && (
          <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-6 py-5 text-sm text-amber-950 shadow-sm">
            <p className="font-medium">Informe o código</p>
            <p className="mt-1 text-amber-900/90">
              Digite ou cole o código no campo acima e clique em Validar.
            </p>
          </div>
        )}

        {result?.status === "invalid" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white px-8 py-8 text-center shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
              ✕
            </div>
            <h2 className="mt-5 text-lg font-semibold text-rose-950">
              Certificado inválido
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-rose-900/85">
              Não foi possível localizar um certificado com este código neste
              sistema, ou o registo não está aprovado pela Secretaria de
              Educação. Confira os caracteres ou procure a instituição de ensino.
            </p>
          </div>
        )}

        {result?.status === "suspended_pending" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white px-8 py-8 shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
              ⚠
            </div>
            <h2 className="mt-5 text-center text-lg font-semibold text-rose-950">
              Certificado com pendência administrativa
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-rose-950/90">
              O código foi reconhecido
              {result.nome ? (
                <>
                  {" "}
                  para <span className="font-semibold">{result.nome}</span>
                </>
              ) : null}
              {result.cpf_mascarado ? (
                <>
                  {" "}
                  (CPF:{" "}
                  <span className="font-mono font-semibold">
                    {result.cpf_mascarado}
                  </span>
                  )
                </>
              ) : null}
              , mas a validação pública está{" "}
              <strong>suspensa</strong> pela instituição. O certificado não pode
              ser considerado válido para comprovação externa até a regularização.
            </p>
          </div>
        )}

        {result?.status === "not_approved" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-8 py-8 shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
              ⏳
            </div>
            <h2 className="mt-5 text-center text-lg font-semibold text-amber-950">
              Ainda não aprovado
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-amber-950/90">
              O código foi reconhecido
              {result.cpf_mascarado ? (
                <>
                  {" "}
                  (CPF:{" "}
                  <span className="font-mono font-semibold">
                    {result.cpf_mascarado}
                  </span>
                  ), mas o processo de{" "}
                </>
              ) : (
                <>
                  , mas o processo de{" "}
                </>
              )}
              {result.nome ? (
                <span className="font-semibold">{result.nome}</span>
              ) : (
                "este aluno"
              )}{" "}
              ainda não consta como concluído para emissão do certificado pela
              Secretaria de Educação.
            </p>
          </div>
        )}

        {result?.status === "valid" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-sky-50/50 px-8 py-10 text-center shadow-lg shadow-emerald-100/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-4xl leading-none">
              ✓
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Certificado válido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {result.nome}
            </h2>
            {result.cpf_mascarado ? (
              <p className="mt-4 text-sm text-slate-600">
                CPF:{" "}
                <span className="font-mono font-semibold tracking-wide text-slate-900">
                  {result.cpf_mascarado}
                </span>
              </p>
            ) : null}
            {result.numero_registro && (
              <p className="mt-4 text-sm text-slate-600">
                Número de registro:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {result.numero_registro}
                </span>
              </p>
            )}
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Este registro atesta, para todos os fins legais, a validade e
                autenticidade do documento expedido por esta instituição de ensino,
                em estrita conformidade com os dados oficiais devidamente
                registrados junto à SEDUC e demais órgãos competentes.
              </p>
              <p>
                Sua autenticidade poderá ser confirmada por meio de consulta
                pública, mediante a utilização do respectivo código de
                autenticidade.
              </p>
            </div>
          </div>
        )}

        <div className="mt-10 space-y-3">
          <SupportContactInline />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Dúvidas sobre o processo na escola? Fale com a sua unidade ou secretaria.
        </p>
        <p className="mt-2 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-brand-primary underline decoration-brand-primary/30 underline-offset-2 hover:text-brand-deep"
          >
            Voltar ao início
          </Link>
        </p>
      </main>
    </div>
  );
}
