/**
 * Indicador visual de carregamento com gradiente e anéis nas cores ProEduka.
 */

type LoaderSize = "sm" | "md" | "lg";

const shellClass: Record<LoaderSize, string> = {
  sm: "h-11 w-11",
  md: "h-16 w-16",
  lg: "h-[5.5rem] w-[5.5rem]",
};

type OrbProps = {
  size?: LoaderSize;
  className?: string;
  "aria-label"?: string;
};

/** Órbitas + núcleo gradiente (sem texto). */
export function BrandLoaderOrb({
  size = "md",
  className = "",
  "aria-label": ariaLabel = "A carregar",
}: OrbProps) {
  const box = shellClass[size];
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`relative inline-flex shrink-0 items-center justify-center ${box} ${className}`}
    >
      <span className="sr-only">{ariaLabel}</span>

      <span
        className="animate-proeduka-loader-glow pointer-events-none absolute -inset-[30%] rounded-full bg-gradient-to-tr from-[#F66828]/50 via-[#D9571E]/35 to-[#F66828]/40 blur-xl"
        aria-hidden
      />
      <span
        className="animate-proeduka-loader-glow pointer-events-none absolute inset-[15%] rounded-full bg-gradient-to-br from-[#F66828]/30 to-transparent opacity-80 blur-md [animation-delay:0.35s]"
        aria-hidden
      />

      <span
        className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#F66828] border-r-[#D9571E] shadow-[0_0_22px_rgba(246,104,40,0.38),inset_0_0_12px_rgba(217,87,30,0.12)] [animation-duration:1.05s]"
        aria-hidden
      />

      <span
        className="animate-proeduka-spin-reverse absolute inset-[10%] rounded-full border-[2.5px] border-transparent border-b-[#D9571E] border-l-[#F66828] opacity-95 shadow-[0_0_14px_rgba(217,87,30,0.25)] [animation-duration:0.72s]"
        aria-hidden
      />

      <span
        className="absolute inset-[26%] rounded-full bg-gradient-to-br from-[#F66828] via-[#E76A2D] to-[#D9571E] shadow-[0_2px_12px_rgba(217,87,30,0.45)] ring-2 ring-white/40"
        aria-hidden
      />
      <span
        className="absolute inset-[30%] rounded-full bg-gradient-to-tl from-white/30 to-transparent opacity-90"
        aria-hidden
      />
    </div>
  );
}

type RouteProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

/** Loader de página: órbita + título e subtítulo. */
export function BrandRouteLoader({
  title = "Carregando…",
  subtitle = "Um instante enquanto trazemos os dados.",
  className = "",
}: RouteProps) {
  return (
    <div
      className={`flex min-h-[50vh] w-full flex-col items-center justify-center gap-8 px-4 py-16 ${className}`}
    >
      <div
        className="flex flex-col items-center gap-5"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={title}
      >
        <BrandLoaderOrb size="lg" aria-label={title} />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="bg-gradient-to-r from-[#F66828] to-[#D9571E] bg-clip-text text-base font-bold tracking-wide text-transparent">
            {title}
          </span>
          <span className="h-0.5 w-16 rounded-full bg-gradient-to-r from-[#F66828] via-[#D9571E] to-[#F66828] opacity-70" />
        </div>
      </div>
      {subtitle ? (
        <p className="max-w-xs text-center text-xs font-medium leading-relaxed text-slate-500">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
