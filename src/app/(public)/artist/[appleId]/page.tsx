import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtist, getArtistAlbums, getArtworkUrl } from "@/lib/apple-music/client";

interface Props {
  params: Promise<{ appleId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appleId } = await params;
  const artist = await getArtist(appleId);
  if (!artist) return { title: "Artist Not Found" };
  return {
    title: `${artist.attributes.name} — Euterpy`,
    description: `${artist.attributes.name} on Euterpy. Discography, collectors, and curators.`,
  };
}

export const dynamic = "force-dynamic";

function art(url: string | null | undefined, size = 600): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function ArtistPage({ params }: Props) {
  const { appleId } = await params;
  const artist = await getArtist(appleId);
  if (!artist) notFound();

  const albums = await getArtistAlbums(appleId, 30);

  // Group by type
  const fullAlbums = albums.filter((a) => !a.attributes.isSingle && !a.attributes.isCompilation);
  const singles = albums.filter((a) => a.attributes.isSingle);
  const compilations = albums.filter((a) => a.attributes.isCompilation);

  const heroArt = art(artist.attributes.artwork?.url, 1200);
  const portraitArt = art(artist.attributes.artwork?.url, 500);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative -mt-px">
        {heroArt && (
          <div className="absolute inset-0 h-[60vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroArt} alt="" className="w-full h-full object-cover opacity-30 blur-3xl scale-125" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-12">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— Artist</p>
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
            {portraitArt && (
              <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full overflow-hidden shrink-0 border border-white/[0.06] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portraitArt} alt={artist.attributes.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.9] mb-4">
                {artist.attributes.name}
              </h1>
              {artist.attributes.genreNames && artist.attributes.genreNames.length > 0 && (
                <p className="text-sm text-zinc-500 mb-4">
                  {artist.attributes.genreNames.filter((g) => g !== "Music").join(" · ")}
                </p>
              )}
              {artist.attributes.url && (
                <a
                  href={artist.attributes.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                  <span>🎵</span> Listen
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        {fullAlbums.length > 0 && (
          <Section title="Albums">
            <Grid albums={fullAlbums} />
          </Section>
        )}
        {singles.length > 0 && (
          <Section title="Singles & EPs">
            <Grid albums={singles} />
          </Section>
        )}
        {compilations.length > 0 && (
          <Section title="Compilations">
            <Grid albums={compilations} />
          </Section>
        )}
        {fullAlbums.length === 0 && singles.length === 0 && compilations.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-12">No releases found.</p>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">{title}</p>
      {children}
    </section>
  );
}

function Grid({ albums }: { albums: any[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
      {albums.map((album) => {
        const cover = art(album.attributes.artwork?.url, 400);
        const year = album.attributes.releaseDate ? album.attributes.releaseDate.substring(0, 4) : null;
        return (
          <Link key={album.id} href={`/album/${album.id}`} className="group">
            <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={album.attributes.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
              )}
            </div>
            <p className="text-sm font-medium truncate">{album.attributes.name}</p>
            {year && <p className="text-[11px] text-zinc-600">{year}</p>}
          </Link>
        );
      })}
    </div>
  );
}
