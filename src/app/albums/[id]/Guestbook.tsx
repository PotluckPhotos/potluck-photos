"use client";

import { useState } from "react";
import { addGuestbookEntry, deleteGuestbookEntry } from "./actions";

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
    <section style={{ margin: "2rem 0" }}>
      <h2 style={{ fontSize: 20 }}>Guest book</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 0 }}>
        Write a few words about the trip — these get scattered through the book and recap.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Best week of the summer. That sunset on the last night…"
          rows={3}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border, #ccc)", resize: "vertical" }}
        />
        <button type="submit" disabled={saving || !body.trim()} style={{ alignSelf: "flex-start" }}>
          {saving ? "Adding…" : "Add entry"}
        </button>
      </form>

      {entries.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20, display: "grid", gap: 12, maxWidth: 640 }}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid var(--border, #e5e5e5)",
                background: "var(--surface-1, #fafafa)",
              }}
            >
              <p style={{ margin: 0, fontStyle: "italic" }}>&ldquo;{entry.body}&rdquo;</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>— {entry.authorName}</span>
                {(isOwner || entry.authorId === currentUserId) && (
                  <button
                    onClick={() => deleteGuestbookEntry({ albumId, entryId: entry.id })}
                    style={{ fontSize: 12, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-danger, #c00)" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
