import { NextResponse } from "next/server";
import {
  DOCUMENT_UPLOAD_CATALOG,
  FOTO_3X4_CATALOG,
} from "@/lib/api/document-upload-catalog";
import { requireApiKey } from "@/lib/api/verify-api-key";

/** Lista documentos permitidos, colunas na BD e slugs no B2 (para presign). */
export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  return NextResponse.json({
    documents: DOCUMENT_UPLOAD_CATALOG.map((d) => ({
      ...d,
      key_example: `students/{student_id}/documents/${d.b2_slug}.pdf`,
    })),
    foto_3x4: {
      label: FOTO_3X4_CATALOG.label,
      column_key: FOTO_3X4_CATALOG.column_key,
      key_example: "students/{student_id}/avatar.jpg",
      note: FOTO_3X4_CATALOG.note,
    },
    flow: [
      "POST /api/b2/presign-put com key e contentType",
      "PUT do ficheiro no URL assinado",
      "PATCH /api/v1/students/{id} com { [column_key]: \"true\" }",
    ],
  });
}
