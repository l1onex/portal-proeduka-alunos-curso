import { readJsonResponse } from "@/lib/client/fetch-api-json";

export async function fetchPresignedPutUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const res = await fetch("/api/b2/presign-put", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ key, contentType }),
  });
  const { ok, data, error } = await readJsonResponse(res);
  if (!ok || typeof data.url !== "string") {
    throw new Error(error ?? "Não foi possível obter URL de upload.");
  }
  return data.url;
}

export async function fetchPresignedGetUrl(key: string): Promise<string> {
  const res = await fetch("/api/b2/presign-get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ key }),
  });
  const { ok, data, error } = await readJsonResponse(res);
  if (!ok || typeof data.url !== "string") {
    throw new Error(error ?? "Não foi possível obter URL do arquivo.");
  }
  return data.url;
}
