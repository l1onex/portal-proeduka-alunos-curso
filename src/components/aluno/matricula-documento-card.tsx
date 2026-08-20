"use client";

import { useRouter } from "next/navigation";
import {
  type DocKey,
  isTruthyFlag,
} from "@/lib/aluno-tabela";
import { MatriculaAssinaturaFlow } from "@/components/aluno/matricula-assinatura-flow";
import {
  FORMULARIO_MATRICULA_DOC_KEY,
  FORMULARIO_MATRICULA_LABEL,
} from "@/lib/matricula-form/constants";
import { tableValueAfterUpload } from "@/lib/proeduka-doc-b2";

type Props = {
  row: Record<string, unknown>;
  setRow: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  isAdmin: boolean;
  cadastroCompleto: boolean;
  busyDoc:
    | DocKey
    | typeof FORMULARIO_MATRICULA_DOC_KEY
    | "Foto estilo 3x4"
    | null;
  setBusyDoc: React.Dispatch<
    React.SetStateAction<
      DocKey | typeof FORMULARIO_MATRICULA_DOC_KEY | "Foto estilo 3x4" | null
    >
  >;
  setGlobalErr: (msg: string | null) => void;
  onRemoveDocument: (
    docKey: DocKey | typeof FORMULARIO_MATRICULA_DOC_KEY,
  ) => Promise<void>;
};

/**
 * Cartão do formulário de matrícula (assinatura digital), antes do bloco
 * «Registro escolar» na ficha e para o aluno no portal.
 */
export function MatriculaDocumentoCard({
  row,
  setRow,
  isAdmin,
  cadastroCompleto,
  busyDoc,
  setBusyDoc,
  setGlobalErr,
  onRemoveDocument,
}: Props) {
  const router = useRouter();
  const docKey = FORMULARIO_MATRICULA_DOC_KEY;
  const done = isTruthyFlag(row[docKey]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#b0c4d9] bg-gradient-to-br from-white to-slate-50/80 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {done ? "✓" : "!"}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            {FORMULARIO_MATRICULA_LABEL}
            {!isAdmin ? (
              <button
                type="button"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#94a8bc] bg-white text-[0.7rem] font-bold text-slate-600 shadow-sm transition hover:border-[#F66828] hover:text-[#F66828]"
                title="Este documento é a assinatura do seu formulário de matrícula: com todos os dados obrigatórios preenchidos, você desenha a assinatura no quadro e confirma. O sistema gera o PDF com os seus dados, registro de auditoria e assinatura eletrônica avançada (MP 2.200-2/2001), armazena com segurança e marca como concluído."
                aria-label="Ajuda sobre assinatura do formulário de matrícula"
              >
                ?
              </button>
            ) : null}
          </p>
          {done ? (
            <p className="text-xs font-medium text-emerald-700">
              Assinatura registrada (PDF gerado)
            </p>
          ) : (
            <p className="text-xs text-amber-800">
              {isAdmin
                ? "Pendente — aguardando o aluno assinar no portal"
                : "Pendente — assinatura digital"}
            </p>
          )}
          {!done && !isAdmin ? (
            <>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Realizar assinatura: preencha antes todos os dados em “Seus
                dados”. Depois, use o quadro abaixo e confirme — não é
                necessário enviar arquivo.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Este passo substitui o envio de um arquivo: você confere os
                dados cadastrais, assina no quadro abaixo e o sistema gera o PDF
                do formulário com assinatura eletrônica avançada (MP 2.200-2/2001),
                envia para o armazenamento seguro e registra o documento como
                entregue.
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 sm:max-w-md sm:min-w-[280px]">
        {!done && !isAdmin ? (
          <MatriculaAssinaturaFlow
            cadastroCompleto={cadastroCompleto}
            setGlobalErr={setGlobalErr}
            disabled={
              busyDoc !== null && busyDoc !== FORMULARIO_MATRICULA_DOC_KEY
            }
            onBusyChange={(b) =>
              setBusyDoc(b ? FORMULARIO_MATRICULA_DOC_KEY : null)
            }
            onSuccess={() => {
              setRow((prev) => ({
                ...prev,
                [FORMULARIO_MATRICULA_DOC_KEY]: tableValueAfterUpload(),
              }));
              router.refresh();
            }}
          />
        ) : !done && isAdmin ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Somente o aluno pode assinar este formulário no portal. Aqui fica
            pendente até ele concluir a assinatura digital.
          </p>
        ) : done ? (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              Concluído
            </span>
            {isAdmin ? (
              <button
                type="button"
                disabled={busyDoc !== null}
                onClick={() => void onRemoveDocument(docKey)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {busyDoc === docKey ? "Removendo…" : "Remover envio"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
