"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: {
      url: string;
      dom_id: string;
      deepLinking?: boolean;
      presets?: unknown[];
    }) => void;
  }
}

export function AdminOpenApiSwagger() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      if (typeof window.SwaggerUIBundle === "function") {
        window.SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui-container",
          deepLinking: true,
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-md">
      <div id="swagger-ui-container" className="swagger-ui-wrap min-h-[560px]" />
    </div>
  );
}
