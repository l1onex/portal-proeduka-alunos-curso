export type VideoProvider = "youtube" | "vimeo";

export type ParsedVideoUrl = {
  provider: VideoProvider;
  id: string;
};

/**
 * Aceita URLs de YouTube (watch, youtu.be, shorts, embed) e Vimeo.
 */
export function parseVideoUrl(raw: string): ParsedVideoUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) {
      return { provider: "youtube", id: v };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
      return { provider: "youtube", id: parts[1] };
    }
    if (parts[0] === "shorts" && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
      return { provider: "youtube", id: parts[1] };
    }
    if (parts[0] === "live" && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
      return { provider: "youtube", id: parts[1] };
    }
    return null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (id && /^[\w-]{11}$/.test(id)) return { provider: "youtube", id };
    return null;
  }

  if (host === "vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "channels" && parts[2] ? parts[2] : parts[0];
    if (id && /^\d+$/.test(id)) return { provider: "vimeo", id };
    return null;
  }

  if (host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && parts[1] && /^\d+$/.test(parts[1])) {
      return { provider: "vimeo", id: parts[1] };
    }
    return null;
  }

  return null;
}

export function embedUrlForVideo(parsed: ParsedVideoUrl): string {
  if (parsed.provider === "youtube") {
    return `https://www.youtube.com/embed/${parsed.id}`;
  }
  return `https://player.vimeo.com/video/${parsed.id}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Thumbnail Vimeo via oEmbed (rede). */
export async function fetchVimeoThumbnailUrl(pageUrl: string): Promise<string | null> {
  const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;
  try {
    const res = await fetch(oembed, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { thumbnail_url?: string };
    return typeof j.thumbnail_url === "string" ? j.thumbnail_url : null;
  } catch {
    return null;
  }
}

export async function resolveThumbnailForVideoUrl(
  videoUrl: string,
  parsed: ParsedVideoUrl,
): Promise<string | null> {
  if (parsed.provider === "youtube") {
    return youtubeThumbnailUrl(parsed.id);
  }
  const canonical = `https://vimeo.com/${parsed.id}`;
  return fetchVimeoThumbnailUrl(canonical);
}
