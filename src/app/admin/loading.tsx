import { BrandRouteLoader } from "@/components/ui/brand-loader";

/** Conteúdo principal durante navegação entre rotas `/admin/*` — sidebar não some. */

export default function AdminRouteLoading() {
  return <BrandRouteLoader />;
}
