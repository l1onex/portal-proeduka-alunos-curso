import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminApiKeysPanel } from "@/components/admin/admin-api-keys-panel";
import { AdminOpenApiSwagger } from "@/components/admin/admin-openapi-swagger";
import { getStaffSession } from "@/lib/api/staff-session";

export default async function AdminApiPage() {
  const session = await getStaffSession();
  if (!session) redirect("/login?next=/admin/api");

  if (session.role !== "master") {
    redirect("/admin");
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-56 w-56 rounded-full bg-[#F66828]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-32 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#f8fbff] to-slate-50/90 p-6 shadow-lg shadow-slate-200/50 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F66828]">
          Integrações
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#D9571E] sm:text-4xl">
              API & integrações
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Gere chaves <code className="rounded bg-slate-100 px-1 text-xs">pek_…</code> para
              sistemas externos. A documentação interativa (Swagger) inclui exemplos{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">curl</code> prontos para copiar.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[#F66828]/35 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      <AdminApiKeysPanel />

      <section className="relative mt-10">
        <h2 className="mb-4 text-lg font-bold text-[#D9571E]">
          Documentação OpenAPI (Swagger)
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Base URL atual é detectada automaticamente. Documentos:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">GET /api/v1/documents/catalog</code>{" "}
          (slugs e colunas). Rotas:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/api/v1/students</code>,{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/api/v1/admins</code>,{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/api/v1/cursos</code>,{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/api/v1/students/&#123;id&#125;/courses</code>,{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/api/b2/presign-put</code>.
        </p>
        <AdminOpenApiSwagger />
      </section>
    </div>
  );
}
