import { BrandRouteLoader } from "@/components/ui/brand-loader";

/** Fallback de carregamento em rotas fora do layout admin (navegação entre páginas). */
export default function RootLoading() {
  return (
    <div className="min-h-[40vh] w-full bg-gradient-to-br from-slate-50 via-white to-[#f0f7ff]/80">
      <BrandRouteLoader title="Carregando…" />
    </div>
  );
}
