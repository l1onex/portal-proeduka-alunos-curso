/** Remove caracteres não numéricos. */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Valida CPF brasileiro (11 dígitos + dígitos verificadores).
 * Retorna false para sequências inválidas conhecidas (ex.: 111...).
 */
export function isValidCPF(raw: string): boolean {
  const cpf = digitsOnly(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]!, 10) * (10 - i);
  }
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9]!, 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]!, 10) * (11 - i);
  }
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]!, 10);
}
