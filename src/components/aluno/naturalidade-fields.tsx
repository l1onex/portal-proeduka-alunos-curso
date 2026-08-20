"use client";

import { useEffect, useState } from "react";

import {
  BR_UF_SIGLAS,
  fetchIbgeMunicipiosNomes,
} from "@/lib/br-ibge-naturalidade";

type Props = {
  uf: string;
  cidade: string;
  disabled: boolean;
  inputClass: string;
  onChange: (next: {
    naturalidade_uf: string | null;
    naturalidade_cidade: string | null;
  }) => void;
};

export function NaturalidadeFields({
  uf,
  cidade,
  disabled,
  inputClass,
  onChange,
}: Props) {
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const sigla = uf.trim().toUpperCase();
    if (sigla.length !== 2) {
      setMunicipios([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    void fetchIbgeMunicipiosNomes(sigla)
      .then((list) => {
        if (!cancelled) setMunicipios(list);
      })
      .catch(() => {
        if (!cancelled) {
          setMunicipios([]);
          setLoadErr("Não foi possível carregar os municípios. Tente de novo.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uf]);

  const ufVal = uf.trim().toUpperCase().slice(0, 2);
  const cidadeNorm = cidade.trim().toUpperCase();

  return (
    <div className="mt-1 space-y-2">
      <div className="grid gap-3 sm:grid-cols-[minmax(5.5rem,7rem)_1fr] sm:items-end">
        <div>
          <label className="block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
            Estado
          </label>
          <select
            className={`${inputClass} mt-1 w-full cursor-pointer disabled:cursor-not-allowed`}
            value={ufVal.length === 2 ? ufVal : ""}
            disabled={disabled}
            onChange={(e) => {
              const nextUf = e.target.value || null;
              onChange({
                naturalidade_uf: nextUf,
                naturalidade_cidade: null,
              });
            }}
          >
            <option value="">UF</option>
            {BR_UF_SIGLAS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
            Cidade
          </label>
          <select
            className={`${inputClass} mt-1 w-full cursor-pointer disabled:cursor-not-allowed`}
            value={ufVal.length === 2 ? cidadeNorm : ""}
            disabled={disabled || ufVal.length !== 2 || loading}
            onChange={(e) => {
              const v = e.target.value.trim();
              onChange({
                naturalidade_uf: ufVal.length === 2 ? ufVal : null,
                naturalidade_cidade: v ? v.toUpperCase() : null,
              });
            }}
          >
            <option value="">
              {ufVal.length !== 2
                ? "Selecione o estado"
                : loading
                  ? "Carregando…"
                  : "Selecione a cidade"}
            </option>
            {municipios.map((n) => (
              <option key={n} value={n.toUpperCase()}>
                {n}
              </option>
            ))}
            {cidadeNorm &&
            !municipios.some((m) => m.toUpperCase() === cidadeNorm) ? (
              <option value={cidadeNorm}>{cidadeNorm}</option>
            ) : null}
          </select>
        </div>
      </div>
      {loadErr ? (
        <p className="text-xs font-medium text-amber-800">{loadErr}</p>
      ) : null}
    </div>
  );
}
