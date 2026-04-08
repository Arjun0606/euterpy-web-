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
      backgroundImage: `
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.0) 0px,
          rgba(0,0,0,0.12) 1px,
          rgba(255,200,140,0.08) 2px,
          rgba(0,0,0,0.0) 4px
        ),
        linear-gradient(to bottom,
          #d49060 0%,
          #b66f3a 25%,
          #8a4f22 60%,
          #5a3010 100%
        )
      `,
      boxShadow: `
        0 8px 24px rgba(0,0,0,0.85),
        0 4px 8px rgba(255,200,140,0.25) inset,
        0 -3px 3px rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(80,40,15,0.6)
      `,
      height: "18px",
      borderRadius: "2px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(50,25,5,0.85) 0%, rgba(50,25,5,0.2) 50%, transparent 100%)", height: "32px" },
  },
  ornate: {
    ledge: {
      backgroundImage: `linear-gradient(to bottom, #f5d99a 0%, #e8b870 12%, #c89548 30%, #966828 55%, #5a3c0e 90%, #2e1f06 100%)`,
      boxShadow: `
        0 10px 32px rgba(0,0,0,0.9),
        0 5px 0 rgba(245,217,154,0.5) inset,
        0 -3px 0 rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(245,217,154,0.6),
        0 0 0 3px rgba(40,25,5,0.8),
        0 0 24px rgba(232,184,112,0.35)
      `,
      height: "22px",
      borderRadius: "4px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(40,25,5,0.85) 0%, rgba(40,25,5,0.2) 50%, transparent 100%)", height: "36px" },
  },
  glass: {
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.02) 100%)",
      boxShadow: `
        0 6px 24px rgba(0,0,0,0.5),
        0 3px 0 rgba(255,255,255,0.5) inset,
        0 -1px 0 rgba(255,255,255,0.1) inset,
        0 0 32px rgba(255,255,255,0.08)
      `,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      height: "16px",
      borderRadius: "3px",
      border: "1px solid rgba(255,255,255,0.18)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)", height: "24px" },
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
