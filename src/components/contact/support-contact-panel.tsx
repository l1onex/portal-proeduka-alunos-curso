import {
  mailtoSupportHref,
  PROEDUCA_CONTACT,
  whatsappSupportHref,
} from "@/lib/contact";

type Props = {
  /** Texto introdutório curto (opcional). */
  intro?: string;
};

export function SupportContactPanel({ intro }: Props) {
  return (
    <div className="space-y-6">
      {intro ? (
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{intro}</p>
      ) : null}

      <p className="text-center text-sm font-medium text-slate-700 sm:text-left">
        <span className="font-mono text-[0.95rem] font-semibold text-[#D9571E]">
          {PROEDUCA_CONTACT.phoneDisplay}
        </span>
        <span className="block pt-1 text-xs font-normal text-slate-500">
          Atendimento apenas pelo WhatsApp (mensagem ou chamada de voz no app)
        </span>
      </p>

      <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <li className="flex-1 sm:min-w-[200px]">
          <a
            href={whatsappSupportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            <WhatsAppGlyph />
            Abrir WhatsApp
          </a>
        </li>
        <li className="flex-1 sm:min-w-[200px]">
          <a
            href={mailtoSupportHref}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <MailGlyph />
            Enviar e-mail
          </a>
        </li>
      </ul>

      <p className="break-all text-center text-sm text-slate-600 sm:text-left">
        <span className="font-medium text-slate-700">E-mail: </span>
        <a
          href={mailtoSupportHref}
          className="font-medium text-[#F66828] underline decoration-[#F66828]/30 underline-offset-2 hover:text-[#D9571E]"
        >
          {PROEDUCA_CONTACT.email}
        </a>
      </p>
    </div>
  );
}

/** Linha compacta para rodapés (home, validador, login). */
export function SupportContactInline() {
  return (
    <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
      Suporte:{" "}
      <a
        href={whatsappSupportHref}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#F66828] hover:underline"
      >
        WhatsApp ({PROEDUCA_CONTACT.phoneDisplay})
      </a>
      {" · "}
      <a href={mailtoSupportHref} className="font-medium text-[#F66828] hover:underline">
        {PROEDUCA_CONTACT.email}
      </a>
    </p>
  );
}

function WhatsAppGlyph() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
