"use client";

import { getArtworkUrl } from "@/lib/apple-music/client";

interface Props {
  artworkUrl: string | null;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  showVinyl?: boolean;
  className?: string;
}

const sizes = {
  sm: { cover: "w-20 h-20", vinyl: "w-16 h-16", offset: "right-[-12px]", groove: 24 },
  md: { cover: "w-36 h-36", vinyl: "w-28 h-28", offset: "right-[-20px]", groove: 40 },
  lg: { cover: "w-44 h-44", vinyl: "w-36 h-36", offset: "right-[-24px]", groove: 52 },
  xl: { cover: "w-56 h-56", vinyl: "w-48 h-48", offset: "right-[-32px]", groove: 68 },
};

function artwork(url: string | null, px: number): string | null {
  if (!url) return null;
  return getArtworkUrl(url, px, px);
}

export default function VinylCover({
  artworkUrl,
  title,
  size = "md",
  showVinyl = true,
  className = "",
}: Props) {
  const s = sizes[size];
  const pxMap = { sm: 160, md: 288, lg: 352, xl: 448 };
  const resolvedUrl = artwork(artworkUrl, pxMap[size]);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Vinyl disc — peeks out from behind the cover */}
      {showVinyl && (
        <div
          className={`absolute ${s.offset} ${s.vinyl} rounded-full z-0 transition-transform duration-500 group-hover:translate-x-4`}
          style={{
            background: `
              radial-gradient(circle at center,
                #1a1a1a 15%,
                transparent 15.5%,
                transparent 16%,
                #111 16.5%,
                #111 28%,
                #1a1a1a 28.5%,
                #1a1a1a 29%,
                #111 29.5%,
                #111 42%,
                #1a1a1a 42.5%,
                #1a1a1a 43%,
                #111 43.5%,
                #111 56%,
                #1a1a1a 56.5%,
                #1a1a1a 57%,
                #222 57.5%
              )
            `,
            boxShadow: "2px 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {/* Center label */}
          <div
            className="absolute rounded-full bg-accent"
            style={{
              width: "24%",
              height: "24%",
              top: "38%",
              left: "38%",
            }}
          >
            {/* Spindle hole */}
            <div
              className="absolute rounded-full bg-black"
              style={{
                width: "20%",
                height: "20%",
                top: "40%",
                left: "40%",
              }}
            />
          </div>
        </div>
      )}

      {/* Album cover (sleeve) */}
      <div
        className={`${s.cover} rounded-lg overflow-hidden relative z-10 shadow-xl border border-white/5`}
      >
        {resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center text-2xl text-border">
            ♪
          </div>
        )}
      </div>
    </div>
  );
}
