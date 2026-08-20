import { normalizeSexo } from "@/lib/aluno-tabela";

function str(row: Record<string, unknown>, k: string): string {
  const v = row[k];
  if (v == null) return "";
  return String(v).trim();
}

function formatCpfDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return raw.trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Campos de data na BD: dd/mm/aaaa ou ISO. */
function formatDateFieldBr(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v == null) return "";
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return s;
}

function formatDataNascBr(row: Record<string, unknown>): string {
  return formatDateFieldBr(row, "dt_nasc");
}

function sexoToMFO(row: Record<string, unknown>): string {
  const s = normalizeSexo(row);
  if (s === "masculino") return "M";
  if (s === "feminino") return "F";
  return "O";
}

/** Valores do <select> do HTML (S, C, D, V, U, P). */
export function mapEstadoCivilToCode(estadoCivil: string): string {
  const t = estadoCivil.trim().toLowerCase();
  if (!t) return "";
  if (t.includes("solteiro")) return "S";
  if (t.includes("casado")) return "C";
  if (t.includes("divorci")) return "D";
  if (t.includes("viúvo") || t.includes("viuvo")) return "V";
  if (t.includes("união") || t.includes("uniao")) return "U";
  if (t.includes("separado")) return "P";
  return "";
}

export type MatriculaPrefill = {
  nomeCompleto: string;
  cpf: string;
  email: string;
  rg: string;
  orgaoExp: string;
  /** Data de expedição do RG (coluna identidade_data_exp). */
  dataExpRg: string;
  filiacao: string;
  dataNasc: string;
  sexoMfo: string;
  estadoCivilCode: string;
  rua: string;
  numero: string;
  cidade: string;
  bairro: string;
  complemento: string;
  cep: string;
  telefone: string;
  deficienciaSimOuNao: string;
};

export function rowToMatriculaPrefill(
  row: Record<string, unknown>,
): MatriculaPrefill {
  const nomePai = str(row, "nome_pai");
  const nomeMae = str(row, "nome_mae");
  let filiacao = "";
  if (nomeMae && nomePai) filiacao = `${nomeMae} / ${nomePai}`;
  else filiacao = nomeMae || nomePai;

  const cpfRaw = str(row, "cpf");
  const def = str(row, "possui_deficiencia");
  const defNorm =
    def.toLowerCase() === "sim"
      ? "Sim"
      : def.toLowerCase() === "não" || def.toLowerCase() === "nao"
        ? "Não"
        : def;

  return {
    nomeCompleto: str(row, "nome"),
    cpf: formatCpfDisplay(cpfRaw),
    email: str(row, "email"),
    rg: str(row, "rg"),
    orgaoExp: str(row, "orgao_expedidor"),
    dataExpRg: formatDateFieldBr(row, "identidade_data_exp"),
    filiacao,
    dataNasc: formatDataNascBr(row),
    sexoMfo: sexoToMFO(row),
    estadoCivilCode: mapEstadoCivilToCode(str(row, "estado_civil")),
    rua: str(row, "endereco"),
    numero: str(row, "numero"),
    cidade: str(row, "cidade"),
    bairro: str(row, "bairro"),
    complemento: str(row, "complemento"),
    cep: str(row, "cep"),
    telefone: str(row, "telefone"),
    deficienciaSimOuNao: defNorm === "Sim" || defNorm === "Não" ? defNorm : "",
  };
}
