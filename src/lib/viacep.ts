/** Busca endereço pelo CEP (apenas números, 8 dígitos). API pública ViaCEP. */

export type ViaCepResult = {
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export function onlyCepDigits(v: string): string {
  return v.replace(/\D/g, "").slice(0, 8);
}

export function formatCepMask(digits: string): string {
  const d = onlyCepDigits(digits);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export async function buscarCep(
  cepDigits: string,
): Promise<ViaCepResult | null> {
  const d = onlyCepDigits(cepDigits);
  if (d.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return null;
  return {
    endereco: (data.logradouro ?? "").trim(),
    bairro: (data.bairro ?? "").trim(),
    cidade: (data.localidade ?? "").trim(),
    estado: (data.uf ?? "").trim(),
  };
}
