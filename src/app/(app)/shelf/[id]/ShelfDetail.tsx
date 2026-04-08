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

const SHELF_STYLES: Record<ShelfStyle, { ledge: React.CSSProperties; shadow: React.CSSProperties }> = {
  minimal: {
    ledge: {
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.04) inset",
      height: "5px",
      borderRadius: "1px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)", height: "16px" },
  },
  wood: {
    ledge: {
      backgroundImage: `linear-gradient(to bottom, #c4895a 0%, #a0633d 15%, #8b5a32 35%, #6b3f1a 60%, #4a2810 100%)`,
      boxShadow: "0 6px 20px rgba(0,0,0,0.8), 0 3px 6px rgba(255,200,140,0.2) inset, 0 -2px 2px rgba(0,0,0,0.5) inset",
      height: "14px",
      borderRadius: "2px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(60,30,5,0.8) 0%, transparent 100%)", height: "24px" },
  },
  ornate: {
    ledge: {
      backgroundImage: `linear-gradient(to bottom, #e8c39e 0%, #d4a574 20%, #b8865a 45%, #8b5a2b 75%, #5a3a1a 100%)`,
      boxShadow: "0 6px 24px rgba(0,0,0,0.8), 0 3px 6px rgba(255,220,150,0.35) inset, 0 -2px 2px rgba(0,0,0,0.5) inset, 0 0 0 1px rgba(232,195,158,0.4), 0 0 16px rgba(212,165,116,0.2)",
      height: "16px",
      borderRadius: "3px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(50,25,8,0.8) 0%, transparent 100%)", height: "26px" },
  },
  glass: {
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.04) 100%)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.25) inset, 0 -1px 0 rgba(255,255,255,0.06) inset",
      backdropFilter: "blur(16px)",
      height: "12px",
      borderRadius: "2px",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)", height: "20px" },
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
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="relative">
              {/* Items on the shelf */}
              <div className="flex gap-2 sm:gap-3 pb-2 relative z-10">
                {row.map((item) => {
                  const data = item.item_type === "album" ? item.albums : item.songs;
                  const href = item.item_type === "album" ? `/album/${data?.apple_id}` : `/song/${data?.apple_id}`;
                  return (
                    <div key={item.id} className="group flex-1 min-w-0 max-w-[20%] relative">
                      <Link href={href} className="block">
                        <div
                          className="aspect-square rounded-sm overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/10"
                          style={{ transformOrigin: "bottom center" }}
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

              {/* Shelf ledge — uses the shelf's style */}
              <div className="rounded-full relative z-0" style={style.ledge} />
              <div className="-mt-1" style={style.shadow} />
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
