import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplePlaylist, getApplePlaylistTracks, getArtworkUrl } from "@/lib/apple-music/client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function art(template: string | null | undefined, size = 600): string | null {
  if (!template) return null;
  return getArtworkUrl(template, size, size);
}

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const playlist = await getApplePlaylist(id);
  if (!playlist) return { title: "Playlist Not Found" };
  return {
    title: `${playlist.attributes.name} — Editorial`,
    description: stripHtml(playlist.attributes.description?.standard || playlist.attributes.description?.short),
  };
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params;
  const [playlist, tracks] = await Promise.all([
    getApplePlaylist(id),
    getApplePlaylistTracks(id),
  ]);

  if (!playlist) notFound();

  const cover = art(playlist.attributes.artwork?.url, 700);
  const heroBg = art(playlist.attributes.artwork?.url, 1200);
  const description = stripHtml(playlist.attributes.description?.standard || playlist.attributes.description?.short);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative">
        {heroBg && (
          <div className="absolute inset-0 h-[60vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-25 blur-3xl scale-125" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— Editorial playlist</p>
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
            {cover && (
              <div className="w-56 sm:w-64 aspect-square rounded-xl overflow-hidden shrink-0 border border-white/[0.06] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={playlist.attributes.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="font-display text-4xl sm:text-6xl tracking-tighter leading-[0.9] mb-4">
                {playlist.attributes.name}
              </h1>
              {playlist.attributes.curatorName && (
                <p className="text-sm text-accent mb-4">Curated by {playlist.attributes.curatorName}</p>
              )}
              {description && (
                <p className="editorial italic text-base text-zinc-400 leading-relaxed line-clamp-4 max-w-xl">
                  {description}
                </p>
              )}
              {playlist.attributes.url && (
                <a
                  href={playlist.attributes.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                  <span>🎵</span> Listen on Apple Music
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">— {tracks.length} tracks</p>
        {tracks.length === 0 ? (
          <p className="text-sm text-zinc-700 text-center py-12">No tracks found.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {tracks.map((track, i) => {
              const trackCover = art(track.attributes.artwork?.url, 120);
              const isLast = i === tracks.length - 1;
              return (
                <Link
                  key={track.id}
                  href={`/song/${track.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors group ${!isLast ? "border-b border-border/50" : ""}`}
                >
                  <span className="w-6 text-right text-xs text-muted/40 shrink-0 tabular-nums group-hover:text-accent transition-colors">
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-card border border-border shrink-0">
                    {trackCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={trackCover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-700">♪</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{track.attributes.name}</p>
                    <p className="text-xs text-zinc-600 truncate">{track.attributes.artistName}</p>
                  </div>
                  <span className="text-xs text-zinc-700 tabular-nums shrink-0">
                    {formatDuration(track.attributes.durationInMillis)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
