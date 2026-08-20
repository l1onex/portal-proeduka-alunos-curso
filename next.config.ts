import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core"],
  /** Browsers ainda pedem /favicon.ico; redireciona para o mesmo /icon (PNG). */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
  /**
   * Dev server (Next.js ≥15) bloqueia pedidos cross-origin a recursos internos
   * (`/_next/*`, `/__nextjs/*`, HMR socket) salvo se o host estiver nesta lista.
   * Inclui `localhost`/`127.0.0.1` explicitamente para sobreviver a browsers em
   * HTTPS-First Mode que reescrevem o `Origin` para um valor que o default
   * (`*.localhost` + `localhost`) não cobre, e para acessos via IP da LAN
   * (ex.: telemóvel a testar, outro PC na rede).
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    // Hostnames típicos em ambiente de dev dentro do escritório / LAN:
    "*.local",
    "*.localhost",
  ],
  /** Imagem Docker mínima (`deploy/` + Dockerfile). */
  output: "standalone",
  /** Remove o indicador flutuante do Next.js (canto da janela em `next dev`). */
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "proeduka.com.br",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.vimeocdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
