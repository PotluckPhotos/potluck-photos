"use client";

import { useState } from "react";
import { deleteAlbum } from "./actions";
import { card, input, ghostButton } from "@/lib/ui";

export default function DeleteAlbum({ albumId, albumName }: { albumId: string; albumName: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = typed.trim() === albumName;

  async function confirm() {
    if (!match) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAlbum({ albumId, confirmName: typed });
      // On success the action redirects; this line isn't reached.
    } catch (e) {
      // A thrown redirect is expected control flow — don't treat it as an error.
      if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      setError(e instanceof Error ? e.message : "Couldn't delete the album.");
      setDeleting(false);
    }
  }

  const dangerButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "#c0392b",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <section style={{ ...card, marginTop: 20, border: "1.5px solid var(--border-warning)", background: "rgba(255,247,240,0.6)" }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 16, color: "var(--text-danger)" }}>Danger zone</h3>

      {!open ? (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--text-secondary)" }}>
            Permanently delete this album and everything in it.
          </p>
          <button onClick={() => setOpen(true)} style={dangerButton}>Delete album</button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            This permanently deletes the album, all its photos, and guest-book entries for everyone. This
            can&apos;t be undone. Type <strong>{albumName}</strong> to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={albumName}
            style={{ ...input, maxWidth: 320 }}
          />
          {error && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={confirm} disabled={!match || deleting} style={{ ...dangerButton, opacity: !match || deleting ? 0.5 : 1, cursor: !match || deleting ? "default" : "pointer" }}>
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button onClick={() => { setOpen(false); setTyped(""); setError(null); }} style={ghostButton}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}
