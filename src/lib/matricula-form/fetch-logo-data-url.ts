import { BRAND_LOGO_URL } from "@/lib/brand-logo";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function fetchLogoDataUrl(): Promise<string> {
  const url = BRAND_LOGO_URL;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(String(r.status));
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 32) throw new Error("logo vazio");
      const b64 = buf.toString("base64");
      const ct = r.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
      return `data:${ct};base64,${b64}`;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return TINY_PNG;
  }
}
