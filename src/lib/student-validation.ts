import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { buildPublicValidatorUrl } from "@/lib/certificate/public-url";

export function generateValidationCode(): string {
  return nanoid(16);
}

export function buildValidationUrl(code: string): string {
  return buildPublicValidatorUrl(code);
}

/** PNG em base64 (sem prefixo data:image), para gravar em `students.qr_code_base64`. */
export async function generateQrCodeBase64Png(validationUrl: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(validationUrl, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });
  const parts = dataUrl.split(",");
  return parts[1] ?? "";
}
