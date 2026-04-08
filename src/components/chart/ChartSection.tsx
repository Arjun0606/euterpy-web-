"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ChartComposer from "./ChartComposer";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import MarkButton from "@/components/social/MarkButton";
import EchoButton from "@/components/social/EchoButton";

interface ChartItem {
  position: number;
  kind: "album" | "song";
  target_apple_id: string;
  target_title: string;
  target_artist: string;
  target_artwork_url: string | null;
  caption: string | null;
}

interface Chart {
  id: string;
  period_label: string | null;
  created_at: string;
  items: ChartItem[];
}

interface Props {
  charts: Chart[];
  username: string;
  isOwner: boolean;
  ownerId?: string;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return url.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export default function ChartSection({ charts, username, isOwner, ownerId }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editChart, setEditChart] = useState<Chart | null>(null);
  const [markCount, setMarkCount] = useState(0);
  const [echoCount, setEchoCount] = useState(0);

  const current = charts[0];
  const hasHistory = charts.length > 1;

  // Fetch mark + echo counts for the current chart
  useEffect(() => {
    if (!current) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("stars").select("id", { count: "exact", head: true }).eq("kind", "chart").eq("target_id", current.id),
      supabase.from("reposts").select("id", { count: "exact", head: true }).eq("kind", "chart").eq("target_id", current.id),
    ]).then(([m, e]) => {
      setMarkCount(m.count || 0);
      setEchoCount(e.count || 0);
    });
  }, [current]);

  if (!current && !isOwner) return null;

  async function handleDownload() {
    if (!current) return;
    try {
      const res = await fetch(`/api/og/chart/${current.id}?ts=${Date.now()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${username}-chart.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Saved");
    } catch {
      toast.error("Couldn't download");
    }
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">The Chart</h2>
        <div className="flex items-center gap-3">
          {isOwner && current && (
            <button
              onClick={() => setEditChart(current)}
              className="text-xs text-zinc-600 hover:text-accent transition-colors"
            >
              Edit
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setComposerOpen(true)}
              className="text-xs text-accent hover:underline"
            >
              + New chart
            </button>
          )}
        </div>
      </div>

      {!current && isOwner && (
        <div className="border border-dashed border-border rounded-2xl py-10 px-6 text-center">
          <p className="font-display text-2xl mb-2">My ten right now.</p>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-4">
            A snapshot of what&apos;s in your head this period. Updates whenever you want. The format every music critic has used for 50 years.
          </p>
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            Make your first chart →
          </button>
        </div>
      )}

      {current && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/[0.04]">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-1">— My ten right now</p>
                <p className="font-display text-2xl tracking-tight italic truncate">
                  {current.period_label || new Date(current.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="text-[11px] text-zinc-500 hover:text-accent transition-colors px-3 py-1.5 border border-border rounded-full whitespace-nowrap"
              >
                Save image
              </button>
            </div>
            <div className="flex items-center gap-2">
              <MarkButton key={`m-${current.id}-${markCount}`} kind="chart" targetId={current.id} ownerId={ownerId} initialCount={markCount} size="sm" />
              <EchoButton key={`e-${current.id}-${echoCount}`} kind="chart" targetId={current.id} ownerId={ownerId} initialCount={echoCount} size="sm" />
            </div>
          </div>

          {/* Items */}
          <ol className="divide-y divide-white/[0.04]">
            {[...current.items]
              .sort((a, b) => a.position - b.position)
              .map((item) => {
                const cover = art(item.target_artwork_url);
                const href = item.kind === "song" ? `/song/${item.target_apple_id}` : `/album/${item.target_apple_id}`;
                return (
                  <li key={item.position}>
                    <Link href={href} className="flex items-center gap-4 px-6 py-3 group hover:bg-white/[0.02] transition-colors">
                      <span className="font-display text-2xl sm:text-3xl tracking-tighter text-zinc-700 group-hover:text-accent transition-colors w-10 tabular-nums shrink-0">
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
                        {item.caption && (
                          <p className="editorial text-[11px] text-zinc-500 italic mt-0.5 truncate">&ldquo;{item.caption}&rdquo;</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ol>

          {hasHistory && (
            <div className="px-6 py-3 border-t border-white/[0.04] text-center">
              <Link href={`/${username}/charts`} className="text-[11px] text-zinc-500 hover:text-accent transition-colors">
                ← Previous charts ({charts.length - 1})
              </Link>
            </div>
          )}
        </div>
      )}

      {composerOpen && <ChartComposer onClose={() => setComposerOpen(false)} />}
      {editChart && (
        <ChartComposer
          existing={{
            id: editChart.id,
            period_label: editChart.period_label,
            items: editChart.items.map((it) => ({
              kind: it.kind,
              target_apple_id: it.target_apple_id,
              target_title: it.target_title,
              target_artist: it.target_artist,
              target_artwork_url: it.target_artwork_url,
              caption: it.caption,
            })),
          }}
          onClose={() => setEditChart(null)}
        />
      )}
    </section>
  );
}
