/**
 * Lê a resposta de fetch como JSON e devolve erro legível (evita "Falha de rede"
 * quando o servidor devolve HTML ou texto).
 */
export async function readJsonResponse(res: Response): Promise<{
  ok: boolean;
  data: Record<string, unknown>;
  error: string | null;
}> {
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        data: {},
        error: `Resposta inválida (${res.status}). ${text.slice(0, 200)}`,
      };
    }
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "string" ? data.error : `Erro HTTP ${res.status}`;
    return { ok: false, data, error: msg };
  }
  return { ok: true, data, error: null };
}

export function networkErrorMessage(e: unknown): string {
  if (e instanceof TypeError) {
    const cause =
      e.cause instanceof Error
        ? e.cause.message
        : typeof e.cause === "string"
          ? e.cause
          : "";
    const detail = [e.message, cause].filter(Boolean).join(" | ");
    if (typeof console !== "undefined" && console.error) {
      console.error("[fetch]", detail || "Failed to fetch", e);
    }
    return [
      "Falha de rede (Failed to fetch).",
      detail ? `Detalhe: ${detail}.` : "",
      "Confira HTTPS, se o domínio abre /api/health e se o Supabase permite este site (URLs permitidas).",
      "Em Docker, NEXT_PUBLIC_* tem de estar corretos no build da imagem, não só no Portainer.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (e instanceof Error) return e.message;
  return "Erro desconhecido ao enviar o pedido.";
}
