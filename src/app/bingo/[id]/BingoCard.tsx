"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toggleSquare, updateCell, resizeBoard } from "../actions";
import { input, primaryButton, ghostButton } from "@/lib/ui";

// The center square is free for everyone. Only meaningful when both dimensions
// are odd; even grids simply have no free space.
export function freeIndex(cols: number, rows: number): number | null {
  if (cols % 2 === 0 || rows % 2 === 0) return null;
  return Math.floor(rows / 2) * cols + Math.floor(cols / 2);
}

function buildLines(cols: number, rows: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < rows; r++) lines.push(Array.from({ length: cols }, (_, c) => r * cols + c));
  for (let c = 0; c < cols; c++) lines.push(Array.from({ length: rows }, (_, r) => r * cols + c));
  if (cols === rows) {
    lines.push(Array.from({ length: cols }, (_, i) => i * cols + i));
    lines.push(Array.from({ length: cols }, (_, i) => i * cols + (cols - 1 - i)));
  }
  return lines;
}

export default function BingoCard({
  boardId,
  cols,
  rows,
  cells: initialCells,
  marks: initialMarks,
  isOwner,
}: {
  boardId: string;
  cols: number;
  rows: number;
  cells: string[];
  marks: boolean[];
  isOwner: boolean;
}) {
  const [cells, setCells] = useState(initialCells);
  const [marks, setMarks] = useState(initialMarks);
  const [open, setOpen] = useState<number | null>(null);

  const free = freeIndex(cols, rows);
  const isMarked = (i: number) => (i === free ? true : !!marks[i]);

  const winningLines = buildLines(cols, rows).filter((line) => line.every(isMarked));
  const winning = new Set(winningLines.flat());
  const hasBingo = winningLines.length > 0;

  async function onToggle(i: number) {
    if (i === free) return;
    const prev = marks;
    const next = [...marks];
    next[i] = !next[i];
    setMarks(next);
    try {
      await toggleSquare({ boardId, index: i, marks: prev });
    } catch {
      setMarks(prev);
    }
  }

  async function onSaveText(i: number, text: string) {
    const prev = cells;
    const next = [...cells];
    next[i] = text;
    setCells(next);
    try {
      await updateCell({ boardId, index: i, text });
    } catch {
      setCells(prev);
    }
  }

  return (
    <>
      {isOwner && <SizeControls boardId={boardId} cols={cols} rows={rows} />}

      {hasBingo && (
        <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: 12, background: "var(--accent-tint)", color: "var(--accent)", fontWeight: 700, textAlign: "center", fontFamily: "var(--font-head)", fontSize: 20 }}>
          Bingo! {winningLines.length > 1 && `(${winningLines.length} lines)`}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, margin: "16px 0 24px" }}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const isFree = i === free;
          const on = isMarked(i);
          const inWin = winning.has(i);
          const text = isFree ? "FREE" : cells[i] || "";
          return (
            <button
              key={i}
              onClick={() => (isFree ? undefined : setOpen(i))}
              disabled={isFree}
              style={{
                aspectRatio: "1",
                padding: 6,
                borderRadius: 12,
                cursor: isFree ? "default" : "pointer",
                border: inWin ? "2px solid var(--accent)" : "1px solid var(--hairline)",
                background: on ? "var(--accent-tint)" : "rgba(255,255,255,0.65)",
                color: on ? "var(--accent)" : text ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 11,
                fontWeight: on ? 700 : 400,
                lineHeight: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {text || (isOwner ? "+ add" : "")}
            </button>
          );
        })}
      </div>

      {open !== null && (
        <SquareModal
          index={open}
          text={cells[open] ?? ""}
          marked={!!marks[open]}
          isOwner={isOwner}
          onSaveText={onSaveText}
          onToggle={onToggle}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function SizeControls({ boardId, cols, rows }: { boardId: string; cols: number; rows: number }) {
  const [c, setC] = useState(cols);
  const [r, setR] = useState(rows);
  const [busy, setBusy] = useState(false);
  const changed = c !== cols || r !== rows;

  const num: React.CSSProperties = { ...input, width: 64, textAlign: "center", padding: "8px 6px" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "16px 0 0", fontSize: 13.5, color: "var(--text-secondary)" }}>
      <span>Grid size</span>
      <input type="number" min={3} max={8} value={c} onChange={(e) => setC(Number(e.target.value))} aria-label="Columns" style={num} />
      <span>×</span>
      <input type="number" min={3} max={8} value={r} onChange={(e) => setR(Number(e.target.value))} aria-label="Rows" style={num} />
      {changed && (
        <button
          onClick={async () => {
            if (!confirm("Resizing clears everyone's marks. Continue?")) return;
            setBusy(true);
            try {
              await resizeBoard({ boardId, cols: c, rows: r });
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          style={{ ...primaryButton, padding: "8px 14px", fontSize: 13 }}
        >
          {busy ? "Resizing…" : "Apply"}
        </button>
      )}
    </div>
  );
}

function SquareModal({
  index,
  text,
  marked,
  isOwner,
  onSaveText,
  onToggle,
  onClose,
}: {
  index: number;
  text: string;
  marked: boolean;
  isOwner: boolean;
  onSaveText: (i: number, text: string) => Promise<void>;
  onToggle: (i: number) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 420, width: "100%" }}>
        {isOwner ? (
          <>
            <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-head)", fontSize: 17 }}>Edit square</h3>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={120}
              placeholder="What goes in this square?"
              style={{ ...input, resize: "vertical" }}
            />
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-head)", fontSize: 17 }}>
              {text || "Empty square"}
            </h3>
          </>
        )}

        <button
          onClick={async () => {
            await onToggle(index);
            onClose();
          }}
          style={{
            ...(marked ? ghostButton : primaryButton),
            width: "100%",
            marginTop: 14,
            justifyContent: "center",
          }}
        >
          {marked ? "✓ Marked — tap to undo" : "✓ Mark this square"}
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={ghostButton}>Close</button>
          {isOwner && (
            <button
              onClick={async () => {
                setSaving(true);
                await onSaveText(index, draft);
                setSaving(false);
                onClose();
              }}
              disabled={saving || draft === text}
              style={{ ...primaryButton, opacity: saving || draft === text ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
