/**
 * Envio ao B2 via API do Next.js (evita CORS do PUT direto ao bucket com URL pré-assinada).
 */
import { readJsonResponse, networkErrorMessage } from "@/lib/client/fetch-api-json";

/** Remove um ou mais objetos no B2 (servidor; mesma autorização do upload). */
export async function deleteB2Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  let res: Response;
  try {
    res = await fetch("/api/b2/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ keys }),
    });
  } catch (e) {
    throw new Error(networkErrorMessage(e));
  }
  const { ok, error } = await readJsonResponse(res);
  if (!ok) {
    throw new Error(error ?? "Não foi possível remover o arquivo.");
  }
}

export async function uploadFileToB2(
  key: string,
  file: File,
  _contentType?: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch("/api/b2/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (e) {
    throw new Error(networkErrorMessage(e));
  }

  const { ok, error } = await readJsonResponse(res);
  if (!ok) {
    throw new Error(error ?? "Não foi possível enviar o arquivo.");
  }
}
