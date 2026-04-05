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

function artwork(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function ShelfDetail({ shelf, items: initialItems, isOwner }: Props) {
  const [items, setItems] = useState(initialItems);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{shelf.is_favorites ? "★ Favorites" : shelf.title}</h1>
          {shelf.description && <p className="text-sm text-muted mt-1">{shelf.description}</p>}
          <p className="text-xs text-muted/50 mt-2">
            <Link href={`/${shelf.profiles.username}`} className="hover:text-accent">@{shelf.profiles.username}</Link>
            {" · "}{items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        {isOwner && !shelf.is_favorites && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted hover:text-foreground"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteShelf}
              disabled={deleting}
              className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted hover:text-red-400 hover:border-red-500/50"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted text-sm">This shelf is empty.</p>
          {isOwner && <p className="text-xs text-muted/60 mt-1">Add albums or songs from their detail pages.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => {
            const data = item.item_type === "album" ? item.albums : item.songs;
            const href = item.item_type === "album" ? `/album/${data?.apple_id}` : `/song/${data?.apple_id}`;

            return (
              <div key={item.id} className="group relative">
                <Link href={href} className="block">
                  <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border">
                    {data?.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={artwork(data.artwork_url)!} alt={data.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-border text-2xl">♪</div>
                    )}
                  </div>
                  <p className="font-medium text-sm mt-2 truncate">{data?.title}</p>
                  <p className="text-xs text-muted truncate">{data?.artist_name}</p>
                </Link>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
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
