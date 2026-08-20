import { SiteHeader } from "@/components/site-header";
import { SupportContactPanel } from "@/components/contact/support-contact-panel";

export default function SuportePublicPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--surface)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-deep)] to-[var(--brand-accent)]"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
            ProEduca
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Suporte
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Fale connosco por WhatsApp ou e-mail. Estamos disponíveis para ajudar com
            o portal, documentação e validação de certificados.
          </p>
          <div className="mt-8">
            <SupportContactPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
