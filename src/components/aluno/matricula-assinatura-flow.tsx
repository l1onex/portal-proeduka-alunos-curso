"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { FORMULARIO_MATRICULA_LABEL } from "@/lib/matricula-form/constants";

type Props = {
  cadastroCompleto: boolean;
  onSuccess: () => void;
  setGlobalErr: (msg: string | null) => void;
  disabled: boolean;
  /** Bloqueia outros documentos enquanto gera o PDF. */
  onBusyChange?: (busy: boolean) => void;
};

export function MatriculaAssinaturaFlow({
  cadastroCompleto,
  onSuccess,
  setGlobalErr,
  disabled,
  onBusyChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });
    padRef.current = pad;

    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      const parent = wrapRef.current;
      if (!parent) return;
      const w = Math.max(280, parent.clientWidth);
      const h = 200;
      const ratio = window.devicePixelRatio || 1;
      c.width = w * ratio;
      c.height = h * ratio;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
      }
      pad.clear();
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapRef.current ?? canvas);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
      pad.off();
    };
  }, []);

  async function handleAssinar() {
    const pad = padRef.current;
    if (!pad || submitting || disabled) return;
    setGlobalErr(null);
    if (!cadastroCompleto) {
      setGlobalErr("Complete seus dados cadastrais antes de assinar.");
      return;
    }
    if (!accept) {
      setGlobalErr("Marque a caixa de aceite para continuar.");
      return;
    }
    if (pad.isEmpty()) {
      setGlobalErr("Desenhe sua assinatura no quadro.");
      return;
    }

    const dataUrl = pad.toDataURL("image/png");
    const i = dataUrl.indexOf("base64,");
    const b64 = i === -1 ? dataUrl : dataUrl.slice(i + 7);

    setSubmitting(true);
    onBusyChange?.(true);
    try {
      const res = await fetch("/api/aluno/matricula-assinar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signaturePngBase64: b64,
          acceptDeclaration: true,
        }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Não foi possível concluir a assinatura.");
        return;
      }
      onSuccess();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  }

  function clearPad() {
    padRef.current?.clear();
  }

  const blocked = !cadastroCompleto || disabled;

  return (
    <div className="mt-3 space-y-3">
      {blocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
          Complete todos os campos obrigatórios em “Seus dados” antes de
          assinar o {FORMULARIO_MATRICULA_LABEL.toLowerCase()}.
        </div>
      ) : null}

      <div ref={wrapRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="touch-none w-full max-w-full rounded-xl border-2 border-slate-300 bg-white"
          aria-label="Quadro de assinatura"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearPad}
          disabled={submitting || disabled}
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Limpar assinatura
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={accept}
          disabled={submitting || disabled || blocked}
          onChange={(e) => setAccept(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
        />
        <span>
          Li a declaração exibida no formulário, confirmo que os dados estão
          corretos e aceito assinar digitalmente o{" "}
          {FORMULARIO_MATRICULA_LABEL.toLowerCase()}.
        </span>
      </label>

      <button
        type="button"
        onClick={() => void handleAssinar()}
        disabled={submitting || disabled || blocked}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {submitting ? "A gerar PDF e registrar…" : "Assinar e concluir"}
      </button>
    </div>
  );
}
