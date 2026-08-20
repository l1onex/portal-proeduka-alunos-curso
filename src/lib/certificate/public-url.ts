/**
 * URL pública do validador (mesmo link embutido no QR Code).
 * Requer NEXT_PUBLIC_APP_URL em produção.
 */
export function buildPublicValidatorUrl(validationCode: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const path = `/validador?c=${encodeURIComponent(validationCode)}`;
  if (!base) return path;
  return `${base}${path}`;
}

/**
 * URL do PNG do QR.
 *
 * Devolve **caminho relativo** (`/api/public/certificate-qr/<uuid>`).
 * A rota correspondente serve o PNG lendo do B2, então não importa o host
 * — funciona tanto em dev (`http://192.168.x.x:3000`), quanto em prod com
 * qualquer domínio. Evita também o problema clássico de `NEXT_PUBLIC_APP_URL`
 * desatualizado (a imagem parava de aparecer em QR Codes antigos).
 */
export function buildQrImagePublicUrl(studentId: string): string {
  return `/api/public/certificate-qr/${encodeURIComponent(studentId)}`;
}
