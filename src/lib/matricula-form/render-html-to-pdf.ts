import puppeteer from "puppeteer-core";
import { resolveChromiumExecutablePath } from "@/lib/matricula-form/resolve-chromium-path";

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const exec = resolveChromiumExecutablePath();
  if (!exec) {
    throw new Error(
      "Navegador para PDF não encontrado. Defina CHROMIUM_PATH (ex.: /usr/bin/chromium no Docker ou o caminho do Chrome no Windows).",
    );
  }

  const browser = await puppeteer.launch({
    executablePath: exec,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 90_000,
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      /** Escala leve (<1) encaixa o bloco A4 sem reduzir fontes/gaps no HTML. */
      scale: 0.94,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
