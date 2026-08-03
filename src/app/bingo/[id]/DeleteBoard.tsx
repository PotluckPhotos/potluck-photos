"use client";

import { useState } from "react";
import { deleteBoard } from "../actions";
import { card, input, ghostButton } from "@/lib/ui";

export default function DeleteBoard({ boardId, title }: { boardId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = typed.trim() === title;

  const dangerButton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px",
    borderRadius: 10, border: "none", cursor: "pointer", background: "#c0392b", color: "#fff", fontSize: 14, fontWeight: 600,
  };

  return (
    <section style={{ ...card, marginTop: 24, border: "1.5px solid var(--border-warning)", background: "rgba(255,247,240,0.6)" }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 16, color: "var(--text-danger)" }}>Danger zone</h3>
      {!open ? (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--text-secondary)" }}>
            Delete this board and everyone&apos;s cards for it.
          </p>
          <button onClick={() => setOpen(true)} style={dangerButton}>Delete board</button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            This permanently deletes the board and every player&apos;s card. Type <strong>{title}</strong> to confirm.
          </p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={title} style={{ ...input, maxWidth: 320 }} />
          {error && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={async () => {
                if (!match) return;
                setBusy(true);
                setError(null);
                try {
                  await deleteBoard({ boardId, confirmTitle: typed });
                } catch (e) {
                  if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
                  setError(e instanceof Error ? e.message : "Couldn't delete the board.");
                  setBusy(false);
                }
              }}
              disabled={!match || busy}
              style={{ ...dangerButton, opacity: !match || busy ? 0.5 : 1 }}
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button onClick={() => { setOpen(false); setTyped(""); setError(null); }} style={ghostButton}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}
