"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  shelf?: { id: string; title: string; description: string | null; style: string };
  onClose: () => void;
  onSaved: () => void;
}

const STYLES = [
  { value: "minimal", label: "Minimal" },
  { value: "wood", label: "Wood" },
  { value: "ornate", label: "Ornate" },
  { value: "glass", label: "Glass" },
];

export default function ShelfEditor({ shelf, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(shelf?.title || "");
  const [description, setDescription] = useState(shelf?.description || "");
  const [style, setStyle] = useState(shelf?.style || "minimal");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (shelf) {
      await supabase
        .from("shelves")
        .update({ title: title.trim(), description: description.trim() || null, style })
        .eq("id", shelf.id);
    } else {
      await supabase.from("shelves").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        style,
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{shelf ? "Edit Shelf" : "New Shelf"}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Late Night Drives"
              maxLength={100}
              autoFocus
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Albums for the road..."
              maxLength={300}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Style</label>
            <div className="flex gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    style === s.value ? "bg-accent text-white" : "bg-card border border-border text-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover disabled:opacity-40"
          >
            {saving ? "Saving..." : shelf ? "Save" : "Create Shelf"}
          </button>
        </div>
      </div>
    </div>
  );
}
