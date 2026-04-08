"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShelfEditor from "@/components/profile/ShelfEditor";

interface ShelfItem {
  id: string;
  item_type: "album" | "song";
  position: number;
  note: string | null;
  albums?: { apple_id: string; title: string; artist_name: string; artwork_url: string | null } | null;
  songs?: { apple_id: string; title: string; artist_name: string; artwork_url: string | null } | null;
}

interface Props {
  shelf: { id: string; title: string; description: string | null; is_favorites: boolean; style: string; item_count: number; user_id: string; profiles: { username: string } };
  items: ShelfItem[];
  isOwner: boolean;
}

type ShelfStyle = "minimal" | "wood" | "ornate" | "glass";

interface ShelfStyleConfig {
  frame: React.CSSProperties;
  ledge: React.CSSProperties;
  shadow: React.CSSProperties;
  innerPadding: string;
}

const SHELF_STYLES: Record<ShelfStyle, ShelfStyleConfig> = {
  minimal: {
    frame: {},
    ledge: {
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.04) inset",
      height: "4px",
      borderRadius: "1px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)", height: "12px" },
    innerPadding: "0",
  },
  wood: {
    frame: {
      backgroundImage: `
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.0) 0px,
          rgba(0,0,0,0.18) 1px,
          rgba(255,200,140,0.06) 2px,
          rgba(0,0,0,0.0) 5px
        ),
        linear-gradient(135deg,
          #4a2810 0%,
          #6b3f1a 25%,
          #4a2810 50%,
          #6b3f1a 75%,
          #4a2810 100%
        )
      `,
      borderLeft: "6px solid #3a1f0a",
      borderRight: "6px solid #3a1f0a",
      borderTop: "4px solid #2a1505",
      boxShadow: `inset 0 4px 16px rgba(0,0,0,0.6), inset 0 -2px 8px rgba(0,0,0,0.4), inset 8px 0 16px rgba(0,0,0,0.4), inset -8px 0 16px rgba(0,0,0,0.4)`,
      borderRadius: "4px 4px 0 0",
      paddingTop: "20px",
    },
    ledge: {
      backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.15) 1px, rgba(255,200,140,0.1) 2px, rgba(0,0,0,0.0) 5px), linear-gradient(to bottom, #d49060 0%, #b66f3a 25%, #8a4f22 60%, #4a2810 100%)`,
      boxShadow: `0 12px 32px rgba(0,0,0,0.85), 0 4px 8px rgba(255,200,140,0.25) inset, 0 -3px 3px rgba(0,0,0,0.6) inset, 0 0 0 1px rgba(40,20,5,0.8)`,
      height: "22px",
      borderRadius: "0 0 4px 4px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(40,20,5,0.85) 0%, rgba(40,20,5,0.2) 50%, transparent 100%)", height: "36px" },
    innerPadding: "16px 16px 0 16px",
  },
  ornate: {
    frame: {
      backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.03) 0%, transparent 50%), linear-gradient(135deg, #1a1a1c 0%, #0f0f11 50%, #1a1a1c 100%)`,
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.12)",
      boxShadow: `inset 0 4px 24px rgba(0,0,0,0.8), inset 0 -2px 8px rgba(0,0,0,0.5), inset 8px 0 24px rgba(0,0,0,0.5), inset -8px 0 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.6), 0 0 48px rgba(0,0,0,0.4)`,
      borderRadius: "2px 2px 0 0",
      paddingTop: "20px",
    },
    ledge: {
      backgroundImage: `radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(ellipse at 75% 50%, rgba(255,255,255,0.04) 0%, transparent 40%), linear-gradient(to bottom, #2a2a2e 0%, #1a1a1c 30%, #0f0f11 100%)`,
      boxShadow: `0 16px 40px rgba(0,0,0,0.9), 0 2px 0 rgba(255,255,255,0.1) inset, 0 -3px 6px rgba(0,0,0,0.6) inset, 0 0 0 1px rgba(255,255,255,0.06)`,
      height: "20px",
      borderRadius: "0 0 2px 2px",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)", height: "32px" },
    innerPadding: "16px 16px 0 16px",
  },
  glass: {
    frame: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      borderLeft: "1px solid rgba(255,255,255,0.15)",
      borderRight: "1px solid rgba(255,255,255,0.15)",
      borderTop: "1px solid rgba(255,255,255,0.25)",
      boxShadow: `inset 0 2px 12px rgba(255,255,255,0.06), inset 0 -2px 8px rgba(0,0,0,0.3), 0 0 32px rgba(255,255,255,0.04)`,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderRadius: "4px 4px 0 0",
      paddingTop: "16px",
    },
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.02) 100%)",
      boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 3px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(255,255,255,0.1) inset, 0 0 32px rgba(255,255,255,0.1)`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      height: "18px",
      borderRadius: "0 0 4px 4px",
      borderLeft: "1px solid rgba(255,255,255,0.18)",
      borderRight: "1px solid rgba(255,255,255,0.18)",
      borderBottom: "1px solid rgba(255,255,255,0.18)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)", height: "24px" },
    innerPadding: "12px 12px 0 12px",
  },
};

function artwork(url: string | null, size = 300): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function ShelfDetail({ shelf, items: initialItems, isOwner }: Props) {
  const [items, setItems] = useState(initialItems);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const styleKey = (shelf.style || "minimal") as ShelfStyle;
  const style = SHELF_STYLES[styleKey] || SHELF_STYLES.minimal;

  async function handleRemoveItem(itemId: string) {
    const supabase = createClient();
    await supabase.from("shelf_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleDeleteShelf() {
    if (!confirm("Delete this shelf? This cannot be undone.")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("shelves").delete().eq("id", shelf.id);
    router.push(`/${shelf.profiles.username}`);
  }

  // Group into rows of 5 (each row is a "shelf")
  const rows: ShelfItem[][] = [];
  for (let i = 0; i < items.length; i += 5) {
    rows.push(items.slice(i, i + 5));
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Curated shelf</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-2">
            {shelf.is_favorites ? "★ Favorites" : shelf.title}
          </h1>
          {shelf.description && <p className="editorial text-base text-zinc-400 mt-3">{shelf.description}</p>}
          <p className="text-xs text-zinc-600 mt-3">
            <Link href={`/${shelf.profiles.username}`} className="hover:text-accent transition-colors">@{shelf.profiles.username}</Link>
            {" · "}{items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        {isOwner && !shelf.is_favorites && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="px-4 py-2 border border-border rounded-full text-xs text-zinc-400 hover:text-foreground transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteShelf}
              disabled={deleting}
              className="px-4 py-2 border border-border rounded-full text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/50 transition-colors"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Items — proper shelf rows */}
      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-zinc-500 text-sm">This shelf is empty.</p>
          {isOwner && <p className="text-xs text-zinc-700 mt-1">Add albums or songs from their detail pages.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="relative">
              {/* Frame wraps the row */}
              <div style={{ ...style.frame, padding: style.innerPadding }}>
                <div className="flex gap-2 sm:gap-3 pb-2 relative z-10">
                {row.map((item) => {
                  const data = item.item_type === "album" ? item.albums : item.songs;
                  const href = item.item_type === "album" ? `/album/${data?.apple_id}` : `/song/${data?.apple_id}`;
                  return (
                    <div key={item.id} className="group flex-1 min-w-0 max-w-[20%] relative">
                      <Link href={href} className="block">
                        <div
                          className="aspect-square rounded-sm overflow-hidden border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/10"
                          style={{
                            transformOrigin: "bottom center",
                            boxShadow: styleKey === "minimal"
                              ? "0 6px 16px rgba(0,0,0,0.6)"
                              : "0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.6)",
                          }}
                        >
                          {data?.artwork_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={artwork(data.artwork_url)!} alt={data.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-card flex items-center justify-center text-border">♪</div>
                          )}
                        </div>
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-xs font-medium truncate">{data?.title}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{data?.artist_name}</p>
                        </div>
                      </Link>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Fill empty slots so the shelf width is consistent */}
                {Array.from({ length: 5 - row.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex-1 min-w-0 max-w-[20%]" />
                ))}
                </div>
              </div>

              {/* Shelf ledge — front lip below the frame */}
              <div className="relative z-0" style={style.ledge} />
              <div style={style.shadow} />
            </div>
          ))}
        </div>
      )}

      {showEdit && (
        <ShelfEditor
          shelf={shelf}
          onClose={() => setShowEdit(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
