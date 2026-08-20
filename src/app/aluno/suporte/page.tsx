import { SupportContactPanel } from "@/components/contact/support-contact-panel";

export default function AlunoSuportePage() {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-48 w-48 rounded-full bg-[#F66828]/10 blur-3xl"
        aria-hidden
      />
      <header className="relative mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Ajuda
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#D9571E] sm:text-3xl">
          Suporte
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          Precisa de ajuda com documentos, acesso ao portal ou emissão do certificado?
        </p>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-[#c8d6e6] bg-white/95 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F66828] via-[#D9571E] to-[#FF9D4D] opacity-90"
          aria-hidden
        />
        <SupportContactPanel intro="Escolha a forma que preferir. O número abaixo atende só pelo WhatsApp (mensagem ou chamada de voz no app)." />
      </section>
    </div>
  );
}
