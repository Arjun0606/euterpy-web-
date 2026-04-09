import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtist, getArtistAlbums, getArtworkUrl } from "@/lib/apple-music/client";
import { createClient } from "@/lib/supabase/server";
import TellStoryButton from "@/components/story/TellStoryButton";
import StoriesSection from "@/components/story/StoriesSection";
import StreamingLinks from "@/components/music/StreamingLinks";

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

  // Stories about this artist
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("id, headline, body, created_at, user_id, profiles(username, display_name, avatar_url)")
    .eq("kind", "artist")
    .eq("target_apple_id", appleId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Friends wrote about this artist
  const { data: { user } } = await supabase.auth.getUser();
  let friendStories: any[] = [];
  if (user && stories && stories.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingSet = new Set((follows || []).map((f) => f.following_id));
    friendStories = stories.filter((s: any) => followingSet.has(s.user_id));
  }

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
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-12">
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
              <StreamingLinks
                kind="artist"
                appleId={appleId}
                appleUrl={artist.attributes.url}
                title={artist.attributes.name}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <TellStoryButton
                  kind="artist"
                  appleId={appleId}
                  title={artist.attributes.name}
                  artworkUrl={artist.attributes.artwork?.url || null}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {/* Friends wrote about this artist */}
        {friendStories.length > 0 && (
          <StoriesSection
            stories={JSON.parse(JSON.stringify(friendStories))}
            title="Friends wrote about them"
          />
        )}

        {/* Stories about this artist */}
        <StoriesSection
          stories={JSON.parse(JSON.stringify(stories || []))}
          title={`Stories about ${artist.attributes.name}`}
          emptyState={
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              <p className="font-display text-2xl mb-2">Tell their story.</p>
              <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
                What do they make you brave enough to feel? Be the first to write.
              </p>
              <TellStoryButton
                kind="artist"
                appleId={appleId}
                title={artist.attributes.name}
                artworkUrl={artist.attributes.artwork?.url || null}
                variant="primary"
              />
            </div>
          }
        />

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
