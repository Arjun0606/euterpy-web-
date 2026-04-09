"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  username: string;
}

/**
 * The Three share card. The single highest-leverage shareable artifact
 * in the product. Renders the user's three GTKM albums as a magazine
 * spread, with download + link share. Modeled on Letterboxd's Four
 * Favourites — this is meant to escape the app and live on Twitter,
 * Instagram, iMessage. The whole growth strategy hinges on this card
 * being beautiful enough that people *want* to share it.
 */
export default function ThreeShareCard({ username }: Props) {
  const [downloading, setDownloading] = useState(false);
  const cardUrl = `/api/og/three/${username}?ts=${Date.now()}`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${username}-the-three.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Saved");
    } catch {
      toast.error("Couldn't download");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/${username}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `${username}'s three on Euterpy` });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <div className="mb-12">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">— Share your three</p>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="rounded-xl overflow-hidden mb-5 border border-border bg-black aspect-[1080/1350]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt="The Three card" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 px-6 py-3 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {downloading ? "Saving..." : "Download as image"}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-6 py-3 border border-border text-zinc-300 text-sm font-medium rounded-full hover:border-zinc-700 hover:text-white transition-colors"
          >
            Share link
          </button>
        </div>
      </div>
    </div>
  );
}
