import fs from "fs";

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

export function resolveChromiumExecutablePath(): string | null {
  for (const p of CANDIDATES) {
    if (typeof p === "string" && p.trim() && fs.existsSync(p.trim())) {
      return p.trim();
    }
  }
  return null;
}
