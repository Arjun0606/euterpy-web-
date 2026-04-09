"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  username: string;
}

/**
 * The Three share card. Collapsed by default — just a small inline
 * button that says "Share your three". Click it to expand the preview
 * + download/share controls. This keeps the GTKM carousel as the hero
 * of the profile and treats sharing as an explicit action, not a
 * giant always-on preview.
 *
 * The card itself is the highest-leverage viral artifact in the
 * product. Modeled on Letterboxd's Four Favourites — it's meant to
 * escape the app and live on Twitter, Instagram, iMessage. The OG
 * route at /api/og/three/[username] does the actual rendering.
 */
export default function ThreeShareCard({ username }: Props) {
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <div className="-mt-8 mb-14 flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-accent px-4 py-2 border border-border hover:border-accent/40 rounded-full transition-colors font-semibold"
        >
          ↓ Share your three
        </button>
      </div>
    );
  }

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">— Share your three</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label="Close share preview"
        >
          Close
        </button>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 max-w-md mx-auto">
        <div className="rounded-xl overflow-hidden mb-4 border border-border bg-black aspect-[1080/1350]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt="The Three card" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 px-5 py-2.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {downloading ? "Saving..." : "Download as image"}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-5 py-2.5 border border-border text-zinc-300 text-xs font-medium rounded-full hover:border-zinc-700 hover:text-white transition-colors"
          >
            Share link
          </button>
        </div>
      </div>
    </div>
  );
}
