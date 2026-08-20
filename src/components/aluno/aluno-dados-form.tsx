"use client";

import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseLegacyNaturalidadeText } from "@/lib/br-ibge-naturalidade";
import {
  getAlunosTableName,
  INFO_KEYS_OPCIONAIS,
  INFO_KEYS_ORDERED,
  INFO_LABELS,
  type InfoKey,
  isMissingValue,
} from "@/lib/aluno-tabela";
import { normalizeInfoForDb } from "@/lib/aluno-field-normalize";
import {
  formatBrDateMask,
  rowDateToBrMaskDisplay,
} from "@/lib/br-date-input";
import { deriveNaturalidadeText } from "@/lib/naturalidade-derive";
import {
  buscarCep,
  formatCepMask,
  onlyCepDigits,
} from "@/lib/viacep";

import { NaturalidadeFields } from "@/components/aluno/naturalidade-fields";
import { EnderecoEstadoCidadeFields } from "@/components/aluno/endereco-estado-cidade-fields";
const READONLY: Set<InfoKey> = new Set([
  "unidade",
  "consultor",
  "curso",
  "email",
]);

const HIDDEN_ON_ALUNO_UI: Set<InfoKey> = new Set([
  "unidade",
  "consultor",
]);

/** Texto de ajuda por campo (tooltip + painel ao clicar no ?). */
const INFO_HINTS: Record<InfoKey, string> = {
  nome: "Seu nome completo, como no documento de identidade ou certidão.",
  email:
    "E-mail institucional vinculado à sua matrícula. Este campo não pode ser alterado aqui.",
  sexo: "Selecione a opção que corresponde ao seu registro civil ou documento.",
  dt_nasc:
    "Data de nascimento no formato dd/mm/aaaa, como no documento (sem calendário).",
  cpf: "Onze dígitos do CPF. Você pode usar a máscara; ao salvar, ficam só os números.",
  rg: "Número do RG (ou equivalente) exatamente como no documento, com letras ou símbolos se houver.",
  telefone: "Celular ou telefone fixo com DDD, para a instituição entrar em contato com você.",
  unidade: "Unidade da instituição em que você está matriculado.",
  consultor: "Consultor responsável pelo seu acompanhamento.",
  curso: "Nome do curso em que você está inscrito (definido pela instituição).",
  nome_pai: "Nome completo do pai. Será salvo em MAIÚSCULAS no sistema.",
  nome_mae: "Nome completo da mãe. Será salvo em MAIÚSCULAS no sistema.",
  profissao: "Sua profissão ou ocupação atual. Será salvo em MAIÚSCULAS.",
  naturalidade_uf:
    "Sigla do estado (UF) onde você nasceu. Depois aparecem os municípios oficiais (IBGE) para escolher.",
  naturalidade_cidade:
    "Município do seu nascimento, conforme lista IBGE da UF selecionada.",
  nacionalidade:
    "Sua nacionalidade conforme documento ou declaração (ex.: BRASILEIRA). Será salvo em MAIÚSCULAS.",
  cep: "Oito dígitos do CEP. Ao sair do campo, o endereço pode ser preenchido automaticamente.",
  endereco: "Logradouro (rua, avenida…). Pode ser sugerido pelo CEP; você pode corrigir.",
  numero: "Número do imóvel (somente o número da porta ou do prédio).",
  complemento:
    "Apartamento, bloco, sala ou referência adicional. Deixe em branco se não houver.",
  bairro: "Bairro do endereço.",
  cidade: "Cidade do endereço.",
  estado: "Unidade federativa (UF), duas letras.",
  estado_civil: "Selecione o estado civil conforme consta nos seus documentos ou declaração.",
  orgao_expedidor:
    "Sigla do órgão emissor do RG (ex.: SSP, DETRAN), em geral com UF.",
  identidade_data_exp:
    "Data de expedição do RG no formato dd/mm/aaaa, como no documento (sem calendário).",
  possui_deficiencia:
    "Indique se você possui alguma deficiência reconhecida. Use Sim ou Não.",
};

/** Bordas um pouco mais escuras e levemente azuladas — melhor contraste no fundo claro. */
const BR_FIELD = "border-[#b0c4d9]";
const BR_FIELD_RO = "border-[#b8c9dc]";
const BR_INPUT = "border-[#9eb5d1]";
const BR_SECTION = "border-[#c8d6e6]";

/** Campos institucionais só na ficha admin (guardados na mesma tabela). */
const ADMIN_INSTITUTIONAL_KEYS = [
  "form_pag",
  "numero_matricula",
] as const;

/** Opções de estado civil (formulário e normalização de rótulos). */
const ESTADO_CIVIL_OPTIONS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
  "Separado(a)",
] as const;

const PLACEHOLDERS: Partial<Record<InfoKey, string>> = {
  dt_nasc: "dd/mm/aaaa",
  nacionalidade: "Ex.: BRASILEIRA",
  rg: "Digite o RG como no documento (números e letras)",
  orgao_expedidor: "Ex.: SSP/SP",
  identidade_data_exp: "dd/mm/aaaa",
  nome_pai: "",
  nome_mae: "",
  profissao: "Ex.: Estudante",
  numero: "Ex.: 123",
  complemento: "Ex.: Apto 101, Bloco B",
  endereco: "Rua, avenida…",
  bairro: "",
  cidade: "",
  estado: "UF",
};

/**
 * 1) "Dados pessoais" (10 campos, ordem pedida pelo utilizador).
 * Inclui `naturalidade_uf` — o componente renderiza o par UF + Cidade.
 */
const DADOS_PESSOAIS_KEYS: InfoKey[] = [
  "nome",
  "dt_nasc",
  "sexo",
  "possui_deficiencia",
  "nacionalidade",
  "naturalidade_uf",
  "nome_mae",
  "nome_pai",
  "estado_civil",
  "profissao",
];

/**
 * 2) "Informações cadastrais" (12 campos, ordem pedida pelo utilizador).
 * `cidade` e `estado` são renderizados dentro do cartão `endereco`
 * (no mesmo quadradinho, igual à naturalidade).
 */
const INFORMACOES_CADASTRAIS_KEYS: InfoKey[] = [
  "telefone",
  "email",
  "cpf",
  "rg",
  "identidade_data_exp",
  "orgao_expedidor",
  "cep",
  "endereco",
  "numero",
  "bairro",
  "complemento",
];

/**
 * 3) "Registro escolar" (3 campos, admin only).
 */
const REGISTRO_ESCOLAR_KEYS: InfoKey[] = ["unidade", "consultor"];

/** `curso` está escondido da UI da ficha do aluno (continua editável
 *  via API e continua gravável no `dbPatch`). */
const HIDDEN_ON_FORM_KEYS: Set<InfoKey> = new Set(["curso"]);

function formatCpfMask(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function snapshotEditableRow(
  row: Record<string, unknown>,
  readonlyKeys: Set<InfoKey>,
  variant: "student" | "admin",
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of INFO_KEYS_ORDERED) {
    if (!readonlyKeys.has(k)) o[k] = row[k];
  }
  if (variant === "admin") {
    for (const k of ADMIN_INSTITUTIONAL_KEYS) {
      o[k] = row[k];
    }
  }
  return o;
}

function FieldHelpHint({
  hint,
  fieldKey,
  openKey,
  onToggle,
}: {
  hint: string;
  fieldKey: InfoKey;
  openKey: InfoKey | null;
  onToggle: (k: InfoKey | null) => void;
}) {
  const open = openKey === fieldKey;
  return (
    <div className="relative shrink-0" data-field-help>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#94a8bc] bg-white text-[0.7rem] font-bold leading-none text-slate-600 shadow-sm transition hover:border-[#F66828] hover:bg-sky-50 hover:text-[#F66828] focus:outline-none focus:ring-2 focus:ring-[#F66828]/30"
        aria-expanded={open}
        aria-label="Ajuda sobre este campo"
        title={hint}
        onClick={(e) => {
          e.preventDefault();
          onToggle(open ? null : fieldKey);
        }}
      >
        ?
      </button>
      {open ? (
        <div
          role="tooltip"
          className={`absolute right-0 top-full z-20 mt-1.5 w-[min(calc(100vw-3rem),18rem)] rounded-xl border ${BR_FIELD} bg-white p-3 text-left text-xs leading-relaxed text-slate-700 shadow-lg`}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function FieldLabelRow({
  labelKey,
  openKey,
  onToggle,
}: {
  labelKey: InfoKey;
  openKey: InfoKey | null;
  onToggle: (k: InfoKey | null) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <label className="block flex-1 pr-1 text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
        {INFO_LABELS[labelKey]}
      </label>
      <FieldHelpHint
        hint={INFO_HINTS[labelKey]}
        fieldKey={labelKey}
        openKey={openKey}
        onToggle={onToggle}
      />
    </div>
  );
}

// (LinhaConferenciaAdmin removida — aprovação direta, sem conferências manuais)

type Props = {
  studentId: string;
  row: Record<string, unknown>;
  setRow: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setGlobalErr: (msg: string | null) => void;
  /** Admin: todos os campos institucionais editáveis (exceto regras de snapshot). */
  variant?: "student" | "admin";
  /** Bloco do formulário de matrícula (assinatura), entre dados e registro escolar. */
  matriculaAssinaturaSlot?: ReactNode;
};

export function AlunoDadosForm({
  studentId,
  row,
  setRow,
  setGlobalErr,
  variant = "student",
  matriculaAssinaturaSlot,
}: Props) {
  const readonlyKeys = useMemo(
    () => (variant === "admin" ? new Set<InfoKey>() : READONLY),
    [variant],
  );
  const hiddenKeys = useMemo(
    () => (variant === "admin" ? new Set<InfoKey>() : HIDDEN_ON_ALUNO_UI),
    [variant],
  );
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [openHelpKey, setOpenHelpKey] = useState<InfoKey | null>(null);
  /**
   * Marca "Não fui registrado" para o campo Nome do pai. Quando `true`,
   * o input do pai fica vazio (`null`) e o utilizador não precisa de o
   * preencher (muitas pessoas no Brasil não são registadas pelo pai).
   */
  const [paiNaoRegistrado, setPaiNaoRegistrado] = useState(false);
  const baselineRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (openHelpKey == null) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = e.target;
      if (el instanceof Node && (el as Element).closest?.("[data-field-help]"))
        return;
      setOpenHelpKey(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openHelpKey]);

  useEffect(() => {
    const u = String(row.naturalidade_uf ?? "").trim();
    const c = String(row.naturalidade_cidade ?? "").trim();
    if (u || c) return;
    const leg = row.naturalidade;
    if (typeof leg !== "string" || !leg.trim()) return;
    const p = parseLegacyNaturalidadeText(leg);
    if (!p) return;
    setRow((prev) => {
      const pu = String(prev.naturalidade_uf ?? "").trim();
      const pc = String(prev.naturalidade_cidade ?? "").trim();
      if (pu || pc) return prev;
      return {
        ...prev,
        naturalidade_uf: p.naturalidade_uf,
        naturalidade_cidade: p.naturalidade_cidade,
      };
    });
  }, [row.naturalidade, setRow]);

  const strVal = useCallback((key: InfoKey): string => {
    const v = row[key];
    if (v == null) return "";
    return String(v);
  }, [row]);

  const beginEdit = useCallback(() => {
    baselineRef.current = snapshotEditableRow(row, readonlyKeys, variant);
    setEditing(true);
    setOpenHelpKey(null);
    setGlobalErr(null);
  }, [row, readonlyKeys, setGlobalErr, variant]);

  const cancelEdit = useCallback(() => {
    const base = baselineRef.current;
    baselineRef.current = null;
    if (base) {
      setRow((prev) => ({ ...prev, ...base }));
    }
    setEditing(false);
    setOpenHelpKey(null);
    setGlobalErr(null);
  }, [setGlobalErr, setRow]);

  const saveAll = useCallback(async () => {
    let source: Record<string, unknown> = { ...row };
    const cepDigits = onlyCepDigits(strVal("cep"));
    if (cepDigits.length === 8) {
      setCepLoading(true);
      try {
        const via = await buscarCep(cepDigits);
        if (via) {
          source = {
            ...source,
            endereco: via.endereco || source.endereco,
            bairro: via.bairro || source.bairro,
            cidade: via.cidade || source.cidade,
            estado: via.estado || source.estado,
          };
          setRow((prev) => ({
            ...prev,
            endereco: via.endereco || prev.endereco,
            bairro: via.bairro || prev.bairro,
            cidade: via.cidade || prev.cidade,
            estado: via.estado || prev.estado,
          }));
        }
      } catch {
        /* mantém o que o aluno já digitou */
      } finally {
        setCepLoading(false);
      }
    }

    const strFrom = (r: Record<string, unknown>, k: InfoKey): string => {
      const v = r[k];
      if (v == null) return "";
      return String(v);
    };

    const dbPatch: Record<string, string | number | null> = {};
    for (const k of INFO_KEYS_ORDERED) {
      if (readonlyKeys.has(k)) continue;
      const raw = strFrom(source, k);
      dbPatch[k] = normalizeInfoForDb(k, raw);
    }
    dbPatch.naturalidade = deriveNaturalidadeText(
      dbPatch.naturalidade_uf as string | null,
      dbPatch.naturalidade_cidade as string | null,
    );

    if (variant === "admin") {
      const fp = String(source.form_pag ?? "").trim();
      dbPatch.form_pag = fp === "" ? null : fp;
      const mat = String(source.numero_matricula ?? "").trim();
      dbPatch.numero_matricula = mat === "" ? null : mat;
    }

    /**
     * `escolaridade` é editável por AMBOS (aluno e admin). Não fica dentro
     * do `if (variant === "admin")` para que o payload do aluno também
     * inclua a coluna.
     */
    const esc = String(source.escolaridade ?? "").trim();
    dbPatch.escolaridade = esc === "" ? null : esc;

    setSaving(true);
    setGlobalErr(null);
    try {
      const saveUrl =
        variant === "admin"
          ? `/api/admin/students/${encodeURIComponent(studentId)}/ficha`
          : "/api/aluno/dados";
      const res = await fetch(saveUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dbPatch),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Erro ao guardar.");
      }
      setRow((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(dbPatch)) {
          next[k] = v;
        }
        return next;
      });
      try {
        const ensureUrl =
          variant === "admin"
            ? `/api/admin/students/${encodeURIComponent(studentId)}/ensure-registro-escolar`
            : "/api/aluno/ensure-registro-escolar";
        const er = await fetch(ensureUrl, {
          method: "POST",
          credentials: "include",
        });
        const ej = (await er.json()) as {
          ok?: boolean;
          assigned?: boolean;
          numero_registro?: string;
          livro?: number;
          pagina?: number;
        };
        if (er.ok && ej.ok && ej.assigned && ej.numero_registro) {
          setRow((prev) => ({
            ...prev,
            numero_registro: ej.numero_registro ?? prev.numero_registro,
            livro: typeof ej.livro === "number" ? ej.livro : prev.livro,
            pagina: typeof ej.pagina === "number" ? ej.pagina : prev.pagina,
          }));
        }
      } catch {
        /* não bloqueia o guardar */
      }
      baselineRef.current = null;
      setEditing(false);
      setOpenHelpKey(null);
      router.refresh();
    } catch (e) {
      setGlobalErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [router, row, readonlyKeys, setGlobalErr, setRow, strVal, studentId, variant]);

  async function onCepBlurInEdit(raw: string) {
    if (!editing) return;
    const digits = onlyCepDigits(raw);
    const masked = digits.length ? formatCepMask(digits) : "";
    setRow((prev) => ({ ...prev, cep: masked || null }));
    setGlobalErr(null);

    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const via = await buscarCep(digits);
      if (!via) {
        setGlobalErr("CEP não encontrado. Verifique os números.");
        return;
      }
      setRow((prev) => ({
        ...prev,
        endereco: via.endereco || prev.endereco || null,
        bairro: via.bairro || prev.bairro || null,
        cidade: via.cidade || prev.cidade || null,
        estado: via.estado || prev.estado || null,
      }));
    } catch {
      setGlobalErr("Não foi possível consultar o CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  }

  const inputClass =
    `mt-1 w-full rounded-xl border ${BR_INPUT} bg-white px-3 py-2.5 text-[15px] leading-snug text-neutral-950 outline-none transition placeholder:text-neutral-600 focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-neutral-800`;

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-[#F66828] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0070cc] disabled:opacity-50";
  const btnSecondary =
    `inline-flex items-center justify-center rounded-xl border ${BR_FIELD} bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50`;
  const btnOutline =
    "inline-flex items-center justify-center rounded-xl border border-[#F66828] bg-white px-4 py-2 text-sm font-semibold text-[#F66828] transition hover:bg-[#F66828]/5 disabled:opacity-50";

  /**
   * Decide se um cartão com `key` deve ser escondido do loop.
   *  - `hiddenKeys` (READONLY/HIDDEN_ON_ALUNO_UI): campos institucionais
   *    que só aparecem no admin; no aluno ficam escondidos.
   *  - `HIDDEN_ON_FORM_KEYS`: campos escondidos em qualquer variante
   *    (`curso`, por agora).
   *  - `naturalidade_cidade`: rendered dentro do `naturalidade_uf`.
   *  - `cidade` / `estado`: rendered dentro do cartão `endereco`.
   */
  const shouldSkipKey = (key: InfoKey): boolean => {
    if (hiddenKeys.has(key)) return true;
    if (HIDDEN_ON_FORM_KEYS.has(key)) return true;
    if (key === "naturalidade_cidade") return true;
    if (key === "cidade" || key === "estado") return true;
    return false;
  };

  const renderMissing = (key: InfoKey): boolean => {
    if (key === "naturalidade_uf") {
      return (
        isMissingValue(row.naturalidade_uf) ||
        isMissingValue(row.naturalidade_cidade)
      );
    }
    if (INFO_KEYS_OPCIONAIS.has(key)) return false;
    return isMissingValue(row[key]);
  };

  /**
   * Render do cartão especial "Naturalidade" (UF + Cidade, mesmo quadradinho).
   */
  const renderNaturalidadeCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <NaturalidadeFields
          uf={strVal("naturalidade_uf")}
          cidade={strVal("naturalidade_cidade")}
          disabled={!editing}
          inputClass={inputClass}
          onChange={(next) =>
            setRow((prev) => ({
              ...prev,
              naturalidade_uf:
                next.naturalidade_uf === undefined
                  ? prev.naturalidade_uf ?? null
                  : next.naturalidade_uf,
              naturalidade_cidade:
                next.naturalidade_cidade === undefined
                  ? prev.naturalidade_cidade ?? null
                  : next.naturalidade_cidade,
            }))
          }
        />
      </div>
    );
  };

  /**
   * Render do cartão especial "Endereço (UF/Cidade) + Rua" para o admin.
   */
  const renderEnderecoAdminCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    const cartaoEnderecoUfCidade = (
      <div
        key="endereco-estado-cidade"
        className={`rounded-xl border px-4 py-3 ${
          isMissingValue(row.estado) || isMissingValue(row.cidade)
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <label className="block flex-1 pr-1 text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
            Endereço (UF/Cidade)
          </label>
        </div>
        <EnderecoEstadoCidadeFields
          uf={strVal("estado")}
          cidade={strVal("cidade")}
          disabled={!editing}
          inputClass={inputClass}
          onChange={(next) =>
            setRow((prev) => ({
              ...prev,
              estado: next.uf ?? prev.estado ?? null,
              cidade: next.cidade ?? prev.cidade ?? null,
            }))
          }
        />
      </div>
    );
    const cartaoRua = (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <textarea
          rows={2}
          className={`${inputClass} resize-y`}
          placeholder={PLACEHOLDERS[key]}
          value={strVal(key)}
          disabled={!editing}
          onChange={(e) => {
            const val = e.target.value;
            setRow((prev) => ({ ...prev, [key]: val || null }));
          }}
        />
      </div>
    );
    return (
      <Fragment key="endereco-grupo">
        {cartaoEnderecoUfCidade}
        {cartaoRua}
      </Fragment>
    );
  };

  /**
   * Render do cartão "Sexo" (select).
   */
  const renderSexoCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    const raw = strVal(key).trim().toLowerCase();
    const sexoUi =
      raw === "masculino" || raw === "m" || raw === "masc"
        ? "masculino"
        : raw === "feminino" ||
            raw === "f" ||
            raw === "fem" ||
            raw === "feminina"
          ? "feminino"
          : "";
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <select
          className={`${inputClass} w-full cursor-pointer disabled:cursor-not-allowed`}
          value={sexoUi}
          disabled={!editing}
          onChange={(e) => {
            const val = e.target.value;
            setRow((prev) => ({ ...prev, sexo: val || null }));
          }}
        >
          <option value="">Selecione</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
      </div>
    );
  };

  /**
   * Render do cartão "Estado civil" (select).
   */
  const renderEstadoCivilCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    const rawEc = strVal(key).trim();
    const match = ESTADO_CIVIL_OPTIONS.find(
      (o) => o.toLowerCase() === rawEc.toLowerCase(),
    );
    const estadoValue = match ?? rawEc;
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <select
          className={`${inputClass} w-full cursor-pointer disabled:cursor-not-allowed`}
          value={estadoValue}
          disabled={!editing}
          onChange={(e) => {
            const val = e.target.value;
            setRow((prev) => ({
              ...prev,
              estado_civil: val || null,
            }));
          }}
        >
          <option value="">Selecione</option>
          {rawEc && !match ? <option value={rawEc}>{rawEc}</option> : null}
          {ESTADO_CIVIL_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  };

  /**
   * Render do cartão "Data de nascimento" (input com máscara dd/mm/aaaa).
   */
  const renderDtNascCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder={PLACEHOLDERS.dt_nasc}
          className={inputClass}
          value={rowDateToBrMaskDisplay(row[key])}
          disabled={!editing}
          onChange={(e) => {
            const masked = formatBrDateMask(e.target.value);
            setRow((prev) => ({
              ...prev,
              dt_nasc: masked || null,
            }));
          }}
        />
      </div>
    );
  };

  /**
   * Render do cartão "CEP" (input com máscara + auto-preenchimento).
   */
  const renderCepCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          className={inputClass}
          value={formatCepMask(strVal(key))}
          disabled={!editing}
          onChange={(e) => {
            const masked = formatCepMask(e.target.value);
            setRow((prev) => ({ ...prev, cep: masked || null }));
          }}
          onBlur={(e) => {
            void onCepBlurInEdit(e.target.value);
          }}
        />
      </div>
    );
  };

  /**
   * Render do cartão "CPF" (input com máscara).
   */
  const renderCpfCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          inputMode="numeric"
          className={inputClass}
          placeholder="000.000.000-00"
          value={formatCpfMask(strVal(key))}
          disabled={!editing}
          onChange={(e) => {
            const masked = formatCpfMask(e.target.value);
            setRow((prev) => ({ ...prev, cpf: masked || null }));
          }}
        />
      </div>
    );
  };

  /**
   * Render do cartão "Órgão expedidor" (uppercase).
   */
  const renderOrgaoExpedidorCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          className={inputClass}
          placeholder={PLACEHOLDERS.orgao_expedidor}
          value={strVal(key).toUpperCase()}
          disabled={!editing}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setRow((prev) => ({
              ...prev,
              orgao_expedidor: val || null,
            }));
          }}
        />
      </div>
    );
  };

  /**
   * Render do cartão "Data de expedição (RG)" (input com máscara dd/mm/aaaa).
   */
  const renderIdentidadeDataExpCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={PLACEHOLDERS.identidade_data_exp}
          className={inputClass}
          value={rowDateToBrMaskDisplay(row[key])}
          disabled={!editing}
          onChange={(e) => {
            const masked = formatBrDateMask(e.target.value);
            setRow((prev) => ({
              ...prev,
              identidade_data_exp: masked || null,
            }));
          }}
        />
      </div>
    );
  };

  /**
   * Render do cartão "Possui deficiência?" (select Sim/Não).
   */
  const renderPossuiDeficienciaCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    const raw = strVal(key).trim().toLowerCase();
    const defUi =
      raw === "sim" || raw === "s"
        ? "Sim"
        : raw === "não" || raw === "nao" || raw === "n"
          ? "Não"
          : "";
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <select
          className={`${inputClass} w-full cursor-pointer disabled:cursor-not-allowed`}
          value={defUi}
          disabled={!editing}
          onChange={(e) =>
            setRow((prev) => ({
              ...prev,
              possui_deficiencia: e.target.value || null,
            }))
          }
        >
          <option value="">Selecione</option>
          <option value="Sim">Sim</option>
          <option value="Não">Não</option>
        </select>
      </div>
    );
  };

  /**
   * Render do cartão "Nome do pai" com checkbox "Não fui registrado".
   */
  const renderNomePaiCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <label className="block flex-1 pr-1 text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
            {INFO_LABELS[key]}
          </label>
          <label
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[0.72rem] font-semibold text-red-600"
            data-field-help
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border-red-300 text-red-600 focus:ring-red-500"
              checked={paiNaoRegistrado}
              disabled={!editing}
              onChange={(e) => {
                const checked = e.target.checked;
                setPaiNaoRegistrado(checked);
                if (checked) {
                  setRow((prev) => ({ ...prev, nome_pai: null }));
                }
              }}
            />
            Não fui registrado
          </label>
          <FieldHelpHint
            hint={INFO_HINTS[key]}
            fieldKey={key}
            openKey={openHelpKey}
            onToggle={setOpenHelpKey}
          />
        </div>
        <input
          type="text"
          className={inputClass}
          placeholder={PLACEHOLDERS[key]}
          value={strVal(key).toUpperCase()}
          disabled={!editing || paiNaoRegistrado}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setRow((prev) => ({ ...prev, [key]: val || null }));
          }}
        />
      </div>
    );
  };

  /**
   * Render "read-only" (campos institucionais para o aluno).
   */
  const renderReadOnlyCartao = (key: InfoKey): React.ReactNode => {
    const display = strVal(key) || "—";
    return (
      <div
        key={key}
        className={`rounded-xl border ${BR_FIELD_RO} bg-slate-50/90 px-4 py-3`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <p className="mt-1 text-[15px] font-semibold leading-snug text-neutral-950">
          {display}
        </p>
      </div>
    );
  };

  /**
   * Render padrão (input simples uppercase ou normal).
   */
  const renderDefaultCartao = (key: InfoKey): React.ReactNode => {
    const missing = renderMissing(key);
    const isUpperStored =
      key === "nome_mae" ||
      key === "profissao" ||
      key === "nacionalidade";
    return (
      <div
        key={key}
        className={`rounded-xl border px-4 py-3 ${
          missing
            ? "border-amber-300/90 bg-amber-50/50"
            : `${BR_FIELD} bg-white`
        }`}
      >
        <FieldLabelRow
          labelKey={key}
          openKey={openHelpKey}
          onToggle={setOpenHelpKey}
        />
        <input
          type="text"
          className={inputClass}
          placeholder={PLACEHOLDERS[key]}
          value={isUpperStored ? strVal(key).toUpperCase() : strVal(key)}
          disabled={!editing}
          onChange={(e) => {
            let val = e.target.value;
            if (isUpperStored) val = val.toUpperCase();
            setRow((prev) => ({ ...prev, [key]: val || null }));
          }}
        />
      </div>
    );
  };

  /**
   * Decide qual o render a usar para um `key`.
   */
  const renderCartoesParaKey = (key: InfoKey): React.ReactNode => {
    if (readonlyKeys.has(key)) return renderReadOnlyCartao(key);
    if (key === "sexo") return renderSexoCartao(key);
    if (key === "estado_civil") return renderEstadoCivilCartao(key);
    if (key === "dt_nasc") return renderDtNascCartao(key);
    if (key === "cep") return renderCepCartao(key);
    if (key === "cpf") return renderCpfCartao(key);
    if (key === "orgao_expedidor") return renderOrgaoExpedidorCartao(key);
    if (key === "identidade_data_exp")
      return renderIdentidadeDataExpCartao(key);
    if (key === "possui_deficiencia")
      return renderPossuiDeficienciaCartao(key);
    if (key === "nome_pai") return renderNomePaiCartao(key);
    if (key === "naturalidade_uf") return renderNaturalidadeCartao(key);
    if (key === "endereco")
      return renderEnderecoAdminCartao(key);
    return renderDefaultCartao(key);
  };

  /**
   * Cada sub-bloco visual é o seu próprio cartão branco (mesmo estilo do
   * "Documentos" / "Redefinir senha" no `aluno-portal.tsx`). Assim, todos
   * os blocos ficam visualmente separados, com sombra e borda própria.
   *
   * `headerSlot` permite injetar conteúdo extra no cabeçalho do cartão
   * (ex.: botões Editar/Salvar/Cancelar, no cartão "Dados pessoais").
   * `extraCards` injeta cartões adicionais no fim do grid do mesmo cartão
   * (ex.: "Número da matrícula" no "Registro escolar").
   */
  const renderSecao = (
    title: string,
    keys: readonly InfoKey[],
    options?: {
      headerLeft?: React.ReactNode;
      headerRight?: React.ReactNode;
      extraCards?: React.ReactNode[];
    },
  ): React.ReactNode => {
    const nodes: React.ReactNode[] = [];
    for (const key of keys) {
      if (shouldSkipKey(key)) continue;
      nodes.push(renderCartoesParaKey(key));
    }
    if (options?.extraCards) nodes.push(...options.extraCards);
    if (
      nodes.length === 0 &&
      !options?.headerLeft &&
      !options?.headerRight
    ) {
      return null;
    }
    return (
      <section className="mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#D9571E]">{title}</h3>
            {options?.headerLeft ?? null}
          </div>
          {options?.headerRight ?? null}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{nodes}</div>
      </section>
    );
  };

  /**
   * Slot com o título "Dados do aluno" / "Seus dados" + os botões
   * Editar/Salvar/Cancelar. É renderizado dentro do cartão "Dados pessoais",
   * à esquerda (debaixo do título). O botão Editar/Salvar fica à direita,
   * no cabeçalho do cartão (via `headerRight`).
   */
  const dadosAlunoHeaderLeft = (
    <p className="mt-1 text-sm text-slate-600">
      {variant === "admin"
        ? editing
          ? "Altere os campos e salve. Cancelar restaura os valores anteriores."
          : "Edite informações do cadastro."
        : editing
          ? "Altere os campos e clique em Salvar para atualizar no sistema. Cancelar restaura os valores anteriores."
          : "Clique em Editar para alterar seus dados. Curso e e-mail institucional são só leitura."}
    </p>
  );

  const dadosAlunoHeaderRight = (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2 sm:ml-4">
        {!editing ? (
          <button
            type="button"
            className={btnOutline}
            onClick={beginEdit}
            disabled={saving}
          >
            Editar
          </button>
        ) : (
          <>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => void saveAll()}
              disabled={saving || cepLoading}
            >
              Salvar
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
      {saving || cepLoading ? (
        <span className="text-right text-xs font-medium text-[#F66828] sm:max-w-[12rem]">
          {cepLoading ? "Consultando CEP…" : "Salvando…"}
        </span>
      ) : null}
    </div>
  );

  /**
   * Cartão extra "Número da matrícula" — renderizado **dentro** do cartão
   * "Registro escolar" (em vez de vir num cartão à parte).
   */
  const numeroMatriculaCartao = (
    <div
      key="numero_matricula"
      className={`rounded-xl border px-4 py-3 sm:col-span-1 ${BR_FIELD} bg-white`}
    >
      <label className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
        Número da matrícula
      </label>
      <input
        type="text"
        className={inputClass}
        value={String(row.numero_matricula ?? "")}
        disabled={!editing}
        onChange={(e) =>
          setRow((prev) => ({
            ...prev,
            numero_matricula:
              e.target.value.trim() === "" ? null : e.target.value.trim(),
          }))
        }
        autoComplete="off"
      />
    </div>
  );

  /**
   * Cartão "Número da matrícula" versão **read-only** para o aluno
   * (vem do sistema; o aluno não edita).
   */
  const numeroMatriculaAlunoCartao = (
    <div
      key="numero_matricula_ro"
      className={`rounded-xl border px-4 py-3 ${BR_FIELD_RO} bg-slate-50/90`}
    >
      <label className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
        Número da matrícula
      </label>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-neutral-950">
        {String(row.numero_matricula ?? "").trim() || "—"}
      </p>
    </div>
  );

  /**
   * Cartão extra "Escolaridade" (select com 6 níveis canónicos) — também
   * dentro do cartão "Registro escolar".
   */
  const ESCOLARIDADE_OPTIONS = [
    "Ensino fundamental incompleto",
    "Ensino fundamental completo",
    "Ensino médio incompleto",
    "Ensino médio completo",
    "Ensino superior incompleto",
    "Ensino superior completo",
  ] as const;

  const escolaridadeCartao = (
    <div
      key="escolaridade"
      className={`rounded-xl border px-4 py-3 ${
        isMissingValue(row.escolaridade)
          ? "border-amber-300/90 bg-amber-50/50"
          : `${BR_FIELD} bg-white`
      }`}
    >
      <label className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
        Escolaridade
      </label>
      <select
        className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
        value={String(row.escolaridade ?? "")}
        disabled={!editing}
        onChange={(e) =>
          setRow((prev) => ({
            ...prev,
            escolaridade: e.target.value.trim() === "" ? null : e.target.value.trim(),
          }))
        }
      >
        <option value="">Selecione</option>
        {ESCOLARIDADE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>

      {/* 1) Dados pessoais — inclui o título "Dados do aluno" + botões */}
      {renderSecao("Dados pessoais", DADOS_PESSOAIS_KEYS, {
        headerLeft: dadosAlunoHeaderLeft,
        headerRight: dadosAlunoHeaderRight,
      })}

      {/* 2) Informações cadastrais */}
      {renderSecao("Informações cadastrais", INFORMACOES_CADASTRAIS_KEYS)}

      {/* 3) Registro escolar
            - Admin: Unidade + Consultor + Escolaridade + Número da matrícula.
            - Aluno: Escolaridade (obrigatória, editável) + Número da matrícula
              (read-only, vem do sistema).
       */}
      {variant === "admin"
        ? renderSecao("Registro escolar", REGISTRO_ESCOLAR_KEYS, {
            extraCards: [escolaridadeCartao, numeroMatriculaCartao],
          })
        : renderSecao("Registro escolar", [], {
            // aluno: só estes 2 cartões; usa-se [] como keys porque não há
            // campos INFO_KEYS a iterar para o aluno neste bloco.
            extraCards: [escolaridadeCartao, numeroMatriculaAlunoCartao],
          })}

      {/* 4) Assinatura da matrícula (slot externo, normalmente vem do aluno) */}
      {matriculaAssinaturaSlot ? (
        <section className="mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8">
          <h3 className="text-base font-bold text-[#D9571E]">
            Assinatura da Matrícula
          </h3>
          <div className="mt-4">{matriculaAssinaturaSlot}</div>
        </section>
      ) : null}

      {/* 5) Forma de pagamento (só admin) */}
      {variant === "admin" ? (
        <section className="mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8">
          <h3 className="text-base font-bold text-[#D9571E]">
            Forma de pagamento
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Define como a matrícula foi paga. Esta secção só é visível para o admin.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div
              className={`rounded-xl border px-4 py-3 sm:col-span-2 ${BR_FIELD} bg-white`}
            >
              <label className="block text-[0.72rem] font-bold uppercase tracking-wide text-slate-900">
                Forma de pagamento
              </label>
              <select
                className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
                value={String(row.form_pag ?? "")}
                disabled={!editing}
                onChange={(e) =>
                  setRow((prev) => ({
                    ...prev,
                    form_pag:
                      e.target.value.trim() === ""
                        ? null
                        : e.target.value.trim(),
                  }))
                }
              >
                <option value="">Selecione</option>
                <option value="Gratuito">Gratuito</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
              </select>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}