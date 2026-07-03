"use client";

import { useState } from "react";
import { addGuestbookEntry, deleteGuestbookEntry } from "./actions";
import { card, iconBadge, input, ghostButton } from "@/lib/ui";
import { GuestBookIcon } from "@/components/icons";

export type Entry = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
};

export default function Guestbook({
  albumId,
  currentUserId,
  isOwner,
  entries,
}: {
  albumId: string;
  currentUserId: string;
  isOwner: boolean;
  entries: Entry[];
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addGuestbookEntry({ albumId, body });
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ ...card, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={iconBadge}><GuestBookIcon size={15} /></div>
        <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 16 }}>Guest book</h3>
      </div>
      <p style={{ margin: "2px 0 14px", fontSize: 13.5, color: "var(--text-secondary)" }}>
        A few words about the trip — scattered through the book and recap.
      </p>

      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Best week of the summer…"
          rows={2}
          style={{ ...input, flex: 1, resize: "vertical" }}
        />
        <button type="submit" disabled={saving || !body.trim()} style={{ ...ghostButton, whiteSpace: "nowrap", alignSelf: "flex-start" }}>
          {saving ? "Adding…" : "Add entry"}
        </button>
      </form>

      {entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ borderRadius: 14, padding: "12px 16px", background: "var(--accent-tint)" }}>
              <p style={{ margin: 0, fontStyle: "italic", fontSize: 14 }}>&ldquo;{entry.body}&rdquo;</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>— {entry.authorName}</span>
                {(isOwner || entry.authorId === currentUserId) && (
                  <button
                    onClick={() => deleteGuestbookEntry({ albumId, entryId: entry.id })}
                    style={{ fontSize: 12, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-danger)" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
