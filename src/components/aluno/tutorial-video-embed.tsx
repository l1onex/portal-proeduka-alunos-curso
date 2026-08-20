"use client";

import { embedUrlForVideo, parseVideoUrl } from "@/lib/video-url";

export function TutorialVideoEmbed({ videoUrl }: { videoUrl: string }) {
  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
        Não foi possível reproduzir este link. Use um endereço válido do
        YouTube ou do Vimeo.
      </div>
    );
  }

  const src = embedUrlForVideo(parsed);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg shadow-slate-300/40">
      <div className="relative aspect-video w-full">
        <iframe
          title="Vídeo tutorial"
          src={src}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
