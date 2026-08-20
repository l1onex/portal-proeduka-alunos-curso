import { brDateStringToDb } from "@/lib/br-date-input";
import { normalizeInfoForDb } from "@/lib/aluno-field-normalize";
import { deriveNaturalidadeText } from "@/lib/naturalidade-derive";

/** Mapeia o payload do formulário de novo aluno para colunas da tabela proeduka_alunos. */

export type CreateAlunoBody = {
  email?: string;
  password?: string;
  full_name?: string;
  unit?: string | null;
  student_date?: string | null;
  consultant?: string | null;
  course?: string | null;
  birth_date?: string | null;
  cpf?: string | null;
  phone?: string | null;
  rg?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  profession?: string | null;
  /** UF de naturalidade (sigla, ex.: SP). */
  naturalidade_uf?: string | null;
  /** Município de naturalidade (nome IBGE). */
  naturalidade_cidade?: string | null;
  /**
   * Legado: texto "CIDADE / UF" se não enviar `naturalidade_uf` e `naturalidade_cidade`.
   */
  nationality?: string | null;
  /** Nacionalidade — coluna `nacionalidade`. */
  nacionalidade?: string | null;
  cep?: string | null;
  address?: string | null;
  address_number?: string | null;
  /** Complemento (apto, bloco…). Opcional. */
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  /** Sim / Não */
  possui_deficiencia?: string | null;
  orgao_expedidor?: string | null;
  identidade_data_exp?: string | null;
  estado_civil?: string | null;
};

export function emptyToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null) return null;
  if (typeof s !== "string") return String(s);
  const t = s.trim();
  return t === "" ? null : t;
}

/** yyyy-mm-dd (input date) → dd/mm/aaaa */
export function isoDateToBrDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const t = iso.trim();
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) {
    const [y, m, d] = t.slice(0, 10).split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return null;
}

function nowDataBr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Coluna `data`: registo no formato usado na tua base. */
function formatDataColumn(studentDateIso: string | null | undefined): string {
  if (studentDateIso?.trim()) {
    const br = isoDateToBrDate(studentDateIso);
    if (br) return `${br} 00:00:00`;
  }
  return nowDataBr();
}

/**
 * Objeto pronto para .insert() na tabela proeduka_alunos.
 * Colunas de documentos começam a null; pastas só BD também null.
 */
export function buildProedukaAlunoInsert(
  body: CreateAlunoBody,
): Record<string, unknown> {
  const natUf = normalizeInfoForDb(
    "naturalidade_uf",
    typeof body.naturalidade_uf === "string" ? body.naturalidade_uf : "",
  );
  const natCid = normalizeInfoForDb(
    "naturalidade_cidade",
    typeof body.naturalidade_cidade === "string" ? body.naturalidade_cidade : "",
  );
  const naturalidadeText =
    deriveNaturalidadeText(natUf, natCid) ?? emptyToNull(body.nationality);

  return {
    nome: emptyToNull(body.full_name),
    email: emptyToNull(body.email),
    unidade: emptyToNull(body.unit),
    data: formatDataColumn(
      typeof body.student_date === "string" ? body.student_date : null,
    ),
    consultor: emptyToNull(body.consultant),
    curso: emptyToNull(body.course),
    dt_nasc: isoDateToBrDate(
      typeof body.birth_date === "string" ? body.birth_date : null,
    ),
    cpf: emptyToNull(body.cpf),
    telefone: emptyToNull(body.phone),
    rg: emptyToNull(body.rg),
    nome_pai: emptyToNull(body.father_name),
    nome_mae: emptyToNull(body.mother_name),
    profissao: emptyToNull(body.profession),
    naturalidade_uf: natUf,
    naturalidade_cidade: natCid,
    naturalidade: naturalidadeText,
    nacionalidade: emptyToNull(body.nacionalidade),
    cep: emptyToNull(body.cep),
    endereco: emptyToNull(body.address),
    numero: emptyToNull(body.address_number),
    complemento: emptyToNull(body.address_complement),
    bairro: emptyToNull(body.neighborhood),
    cidade: emptyToNull(body.city),
    estado: emptyToNull(body.state),
    possui_deficiencia: emptyToNull(body.possui_deficiencia),
    orgao_expedidor: (() => {
      const o = emptyToNull(body.orgao_expedidor);
      return o ? o.toUpperCase() : null;
    })(),
    identidade_data_exp: brDateStringToDb(
      typeof body.identidade_data_exp === "string"
        ? body.identidade_data_exp
        : "",
    ),
    estado_civil: emptyToNull(body.estado_civil),
    form_pag: null,
    homologado_em: null,
    homologado_por: null,
    sexo: null,
    final: null,
    validacao_suspensa: false,
    desistente: false,
    inadimplente: false,
    identidade: null,
    "Comprovante de residência": null,
    "Foto estilo 3x4": null,
    "pasta mae": null,
    "pasta documentos": null,
    "pasta certificado": null,
  };
}
