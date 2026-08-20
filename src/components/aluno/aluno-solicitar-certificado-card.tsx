"use client";

import { useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  COLUNA_CERTIFICADO_SOLICITADO_EM,
  isCertificadoSolicitado,
  isDesistente,
  isInadimplente,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";

type Props = {
  row: Record<string, unknown>;
  setRow: Dispatch<SetStateAction<Record<string, unknown>>>;
  setGlobalErr: (msg: string | null) => void;
};

type WizardStep = "closed" | "docs" | "provas" | "success";

export function AlunoSolicitarCertificadoCard({
  row,
  setRow,
  setGlobalErr,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("closed");
  const [busy, setBusy] = useState(false);

  const certFinal = isTruthyFlag(row.final);
  const bloqueado = isDesistente(row) || isInadimplente(row);
  const jaPediu = isCertificadoSolicitado(row);

  if (certFinal || bloqueado) return null;

  async function enviarPedido() {
    setBusy(true);
    setGlobalErr(null);
    try {
      const res = await fetch("/api/aluno/solicitar-certificado", {
        method: "POST",
        credentials: "include",
      });
      const { ok, error, data } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Não foi possível registar o pedido.");
        setStep("closed");
        return;
      }
      const ts = data.certificado_solicitado_em;
      if (typeof ts === "string" && ts) {
        setRow((prev) => ({
          ...prev,
          [COLUNA_CERTIFICADO_SOLICITADO_EM]: ts,
        }));
      }
      if (
        typeof data.numero_registro === "string" &&
        typeof data.livro === "number" &&
        typeof data.pagina === "number"
      ) {
        setRow((prev) => ({
          ...prev,
          numero_registro: data.numero_registro as string,
          livro: data.livro as number,
          pagina: data.pagina as number,
        }));
      }
      setStep("success");
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
      setStep("closed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-8 rounded-2xl border border-[#F66828]/25 bg-gradient-to-br from-sky-50/90 to-white px-5 py-4 shadow-md shadow-sky-200/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F66828]">
              Certificado
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#D9571E]">
              Solicitar certificado
            </h2>
            {jaPediu ? (
              <p className="mt-2 text-sm text-slate-600">
                O seu pedido foi registado. A instituição analisa o cadastro; em
                até{" "}
                <span className="font-semibold text-slate-800">5 dias úteis</span>{" "}
                pode concluir a emissão do certificado.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Quando tudo estiver enviado e as provas realizadas, inicie o
                pedido aqui. Só depois disso o cadastro entra em análise na
                instituição.
              </p>
            )}
          </div>
          {!jaPediu ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setGlobalErr(null);
                setStep("docs");
              }}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
            >
              Iniciar solicitação
            </button>
          ) : null}
        </div>
      </div>

      {step !== "closed" ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="solicitar-cert-titulo"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {step === "docs" ? (
              <>
                <h3
                  id="solicitar-cert-titulo"
                  className="text-lg font-bold text-[#D9571E]"
                >
                  Documentos
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Você já enviou todos os documentos?
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    onClick={() => {
                      setStep("closed");
                      setGlobalErr(
                        "Quando enviar todos os documentos, volte aqui e solicite a certificação.",
                      );
                    }}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-[#F66828] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0070cc]"
                    onClick={() => setStep("provas")}
                  >
                    Sim
                  </button>
                </div>
              </>
            ) : null}

            {step === "provas" ? (
              <>
                <h3
                  id="solicitar-cert-titulo"
                  className="text-lg font-bold text-[#D9571E]"
                >
                  Provas
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Você já realizou todas as provas?
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    onClick={() => {
                      setStep("closed");
                      setGlobalErr(
                        "Quando concluir todas as provas, volte aqui e solicite a certificação.",
                      );
                    }}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-xl bg-[#F66828] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0070cc] disabled:opacity-50"
                    onClick={() => void enviarPedido()}
                  >
                    Sim
                  </button>
                </div>
              </>
            ) : null}

            {step === "success" ? (
              <>
                <div className="flex items-center gap-2 text-emerald-700">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <h3
                    id="solicitar-cert-titulo"
                    className="text-lg font-bold text-[#D9571E]"
                  >
                    Pedido válido
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  A sua solicitação foi registada. Em até{" "}
                  <span className="font-semibold text-slate-900">
                    5 dias úteis
                  </span>{" "}
                  a instituição pode concluir a análise e a emissão do seu
                  certificado.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-[#D9571E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#B74615]"
                  onClick={() => setStep("closed")}
                >
                  Fechar
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
