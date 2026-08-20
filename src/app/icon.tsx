import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** PNG único (P branco em #D9571E) — evita cache de favicon antigo misturado com SVG. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#D9571E",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 800,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
