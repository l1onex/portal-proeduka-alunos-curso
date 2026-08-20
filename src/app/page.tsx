import Link from "next/link";
import { SupportContactInline } from "@/components/contact/support-contact-panel";
import { SiteHeader } from "@/components/site-header";

function IconUpload() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 16V4m0 0l4 4m-4-4L8 8M4 17.5V19a2 2 0 002 2h12a2 2 0 002-2v-1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrack() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBadge() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconQr() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const features = [
  {
    title: "Envie a sua documentação",
    text: "Carregue PDFs ou fotos nítidas dos documentos pedidos pela instituição — tudo organizado na sua ficha.",
    icon: IconUpload,
    accent: "from-[#F66828] to-[#D9571E]",
  },
  {
    title: "Veja o que falta e o que já foi aceite",
    text: "Acompanhe pendências e o estado do seu cadastro num painel claro, feito para você não se perder.",
    icon: IconTrack,
    accent: "from-[#D9571E] to-[#E76A2D]",
  },
  {
    title: "Certificado e validação pública",
    text: "Quando o processo for concluído e aprovado, aceda ao código e ao QR para comprovar o certificado.",
    icon: IconBadge,
    accent: "from-[#F66828] to-[#FF9550]",
  },
  {
    title: "Conferência por código ou QR",
    text: "Qualquer pessoa pode verificar a autenticidade no validador público — sem precisar da sua senha.",
    icon: IconQr,
    accent: "from-[#D9571E] to-[#F66828]",
  },
] as const;

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-[#f4f8fc]">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(246,104,40,0.04)_40%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(217,87,30,0.14)_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[#F66828]/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-[#D9571E]/15 blur-[90px]"
        aria-hidden
      />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_-20px_rgba(217,87,30,0.18)] backdrop-blur-md sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F66828]/[0.07] via-transparent to-[#D9571E]/[0.06]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#F66828]/40 to-transparent"
            aria-hidden
          />

          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#F66828]/25 bg-[#F66828]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D9571E] sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F66828] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F66828]" />
              </span>
              Portal do aluno
            </p>
            <h1 className="mt-5 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
              O seu espaço para enviar documentos e acompanhar o seu processo
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              Este é o <strong className="font-semibold text-slate-800">seu canal direto</strong> com a
              instituição: envie a documentação da matrícula, veja o que ainda falta e,
              quando tudo estiver aprovado, aceda ao certificado e às formas de
              validação pública — com a segurança e a clareza que o seu percurso merece.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#D9571E]/25 ring-1 ring-white/20 transition hover:brightness-[1.03] hover:shadow-xl"
              >
                Entrar no meu portal
              </Link>
              <Link
                href="/validador"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200/90 bg-white/80 px-6 py-3 text-base font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828]/40 hover:bg-sky-50/80"
              >
                Validar um certificado
              </Link>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Utilize o <strong className="font-medium text-slate-700">mesmo e-mail</strong> que a
              instituição registou na sua ficha de aluno para aceder.
            </p>
          </div>
        </section>

        <section className="mt-14 sm:mt-16">
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Feito para você se sentir no controlo
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Transparência no envio, no acompanhamento e na validação — numa interface pensada para o aluno.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item) => {
              const Ico = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/95 p-6 shadow-md shadow-slate-200/60 transition hover:border-[#F66828]/25 hover:shadow-lg hover:shadow-[#F66828]/10"
                >
                  <div
                    className={`inline-flex rounded-xl bg-gradient-to-br ${item.accent} p-2.5 text-white shadow-md`}
                  >
                    <Ico />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-[#F66828]/20 bg-gradient-to-r from-[#D9571E]/[0.06] via-white/80 to-[#F66828]/[0.08] px-5 py-8 text-center sm:mt-16 sm:px-8">
          <p className="text-sm font-semibold text-[#D9571E] sm:text-base">
            Dúvidas sobre documentos, prazos ou o portal?
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            A sua unidade e a secretaria orientam o processo académico. Para apoio
            sobre o uso deste portal, certificados ou validação, pode também
            contactar a equipa ProEduca pelos canais abaixo.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <SupportContactInline />
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-slate-400 sm:mt-12">
          <Link
            href="/validador"
            className="font-medium text-[#F66828] underline decoration-[#F66828]/30 underline-offset-2 transition hover:text-[#D9571E]"
          >
            Validador público de certificados
          </Link>
          {". "}Conferência oficial pelo código.{" "}
          <Link
            href="/suporte"
            className="font-medium text-[#F66828] underline decoration-[#F66828]/30 underline-offset-2 transition hover:text-[#D9571E]"
          >
            Suporte
          </Link>
        </p>
      </main>
    </div>
  );
}
