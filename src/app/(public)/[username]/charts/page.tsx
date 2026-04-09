import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — chart history`,
  };
}

export default async function ChartsHistoryPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const { data: charts } = await supabase
    .from("charts")
    .select("id, period_label, created_at, items:chart_items(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const allCharts = charts || [];

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-10">
        <Link href={`/${username}`} className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-accent transition-colors">
          ← @{username}
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mt-3">
          Chart history
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          Every &ldquo;ten right now&rdquo; {profile.display_name || profile.username} has published.
        </p>
      </div>

      {allCharts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="font-display text-2xl mb-2">No charts yet.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {allCharts.map((chart: any) => {
            const items = [...(chart.items || [])].sort((a: any, b: any) => a.position - b.position);
            return (
              <div key={chart.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-1">— Ten right now</p>
                  <p className="font-display text-2xl tracking-tight italic">
                    {chart.period_label || new Date(chart.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  <p className="text-[11px] text-zinc-700 mt-1">
                    Published {new Date(chart.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <ol className="divide-y divide-white/[0.04]">
                  {items.map((item: any) => {
                    const cover = art(item.target_artwork_url);
                    const href = item.kind === "song" ? `/song/${item.target_apple_id}` : `/album/${item.target_apple_id}`;
                    return (
                      <li key={item.position}>
                        <Link href={href} className="flex items-center gap-4 px-6 py-3 group hover:bg-white/[0.02] transition-colors">
                          <span className="font-display text-2xl tracking-tighter text-zinc-700 group-hover:text-accent transition-colors w-10 tabular-nums shrink-0">
                            {String(item.position).padStart(2, "0")}
                          </span>
                          <div className="w-11 h-11 rounded-md overflow-hidden bg-background border border-border shrink-0">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">♪</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{item.target_title}</p>
                            <p className="text-xs text-zinc-600 truncate italic">{item.target_artist}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
