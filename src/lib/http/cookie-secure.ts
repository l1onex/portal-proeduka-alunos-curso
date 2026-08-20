/** Alinha `Secure` nos cookies com HTTPS (Traefik: `x-forwarded-proto: https`). */
export function cookieSecureFromForwardedProto(
  forwardedProto: string | null,
): boolean {
  return forwardedProto === "https";
}
