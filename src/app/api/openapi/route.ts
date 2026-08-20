import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi/build-openapi";

export async function GET(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  const doc = buildOpenApiDocument(baseUrl);
  return NextResponse.json(doc);
}
