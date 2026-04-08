"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Track {
  appleId: string;
  title: string;
  trackNumber?: number;
}

interface Props {
  initialStory: string | null;
  albumAppleId: string;
  isOwner: boolean;
  onSave: (story: string) => Promise<void>;
}

// Parse a story with @@song:appleId|title@@ tokens into renderable parts
export function parseStory(story: string | null): Array<{ type: "text" | "song"; value: string; appleId?: string }> {
  if (!story) return [];
  const parts: Array<{ type: "text" | "song"; value: string; appleId?: string }> = [];
  const regex = /@@song:([^|]+)\|([^@]+)@@/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(story)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: story.slice(lastIndex, match.index) });
    }
    parts.push({ type: "song", value: match[2], appleId: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < story.length) {
    parts.push({ type: "text", value: story.slice(lastIndex) });
  }
  return parts;
}

// Render-only component (read mode)
export function StoryRenderer({ story }: { story: string | null }) {
  const parts = parseStory(story);
  if (parts.length === 0) return null;

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "song" && part.appleId) {
          return (
            <Link
              key={i}
              href={`/song/${part.appleId}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-accent/15 text-accent text-[0.92em] hover:bg-accent/25 transition-colors no-underline align-baseline"
            >
              ♪ {part.value}
            </Link>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}

// Editor component with @ autocomplete
export default function StoryEditor({ initialStory, albumAppleId, isOwner, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialStory || "");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestPos, setSuggestPos] = useState(0);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch tracks when entering edit mode
  useEffect(() => {
    if (!editing || tracks.length > 0) return;
    fetch(`/api/albums/${albumAppleId}/tracks`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedTracks = (data.tracks || []).map((t: any) => ({
          appleId: t.appleId || t.id,
          title: t.title || t.attributes?.name,
          trackNumber: t.trackNumber || t.attributes?.trackNumber,
        }));
        setTracks(fetchedTracks);
      })
      .catch(() => setTracks([]));
  }, [editing, albumAppleId, tracks.length]);

  // Detect @ trigger and current query
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setDraft(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowSuggest(true);
      setSuggestQuery(atMatch[1].toLowerCase());
      setSuggestPos(cursorPos - atMatch[0].length);
    } else {
      setShowSuggest(false);
    }
  }

  function insertTrack(track: Track) {
    if (!textareaRef.current) return;
    const before = draft.slice(0, suggestPos);
    const after = draft.slice(textareaRef.current.selectionStart);
    const token = `@@song:${track.appleId}|${track.title}@@`;
    const newDraft = before + token + " " + after;
    setDraft(newDraft);
    setShowSuggest(false);
    setSuggestQuery("");

    // Restore focus and place cursor after the inserted token
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPos = before.length + token.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // parent handles error toast
    }
    setSaving(false);
  }

  function handleCancel() {
    setDraft(initialStory || "");
    setEditing(false);
    setShowSuggest(false);
  }

  const filteredTracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(suggestQuery)
  ).slice(0, 6);

  // READ MODE
  if (!editing) {
    if (!initialStory && !isOwner) return null;
    if (!initialStory && isOwner) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-zinc-500 text-sm italic hover:text-zinc-700 transition-colors text-left"
        >
          Tap to write your story...
        </button>
      );
    }
    return (
      <div
        className={isOwner ? "cursor-text" : ""}
        onClick={isOwner ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
      >
        <p className="editorial text-zinc-800 text-base leading-relaxed">
          <StoryRenderer story={initialStory} />
        </p>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        rows={6}
        maxLength={500}
        placeholder="Why this album? Type @ to mention a track..."
        className="w-full bg-transparent border border-zinc-400/40 rounded-md p-3 text-zinc-900 placeholder:text-zinc-500 text-base leading-relaxed focus:outline-none focus:border-zinc-700 resize-none editorial"
      />

      {/* @ autocomplete dropdown */}
      {showSuggest && filteredTracks.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-300 rounded-md shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-3 py-2 border-b border-zinc-200 font-mono">
            Tracks
          </p>
          {filteredTracks.map((track) => (
            <button
              key={track.appleId}
              onClick={() => insertTrack(track)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-100 text-left"
            >
              {track.trackNumber && (
                <span className="text-[11px] text-zinc-500 font-mono w-5 text-right">{track.trackNumber}.</span>
              )}
              <span className="text-sm text-zinc-900 truncate">{track.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-1.5 text-zinc-600 text-xs hover:text-zinc-900 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto text-[10px] text-zinc-500">{draft.length}/500</span>
      </div>
    </div>
  );
}
