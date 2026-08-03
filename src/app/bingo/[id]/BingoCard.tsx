"use client";

import { useState } from "react";
import { toggleSquare } from "../actions";

// The card is 5x5 with a free center; `squares`/`marks` hold the 24 real
// squares, so grid position 12 is the free space and indices shift after it.
const FREE_POS = 12;

function gridToIndex(pos: number): number | null {
  if (pos === FREE_POS) return null;
  return pos < FREE_POS ? pos : pos - 1;
}

const LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
})();

export default function BingoCard({
  boardId,
  squares,
  marks: initialMarks,
}: {
  boardId: string;
  squares: string[];
  marks: boolean[];
}) {
  const [marks, setMarks] = useState(initialMarks);

  const isMarked = (pos: number) => {
    const i = gridToIndex(pos);
    return i === null ? true : !!marks[i]; // free space always counts
  };

  const winningLines = LINES.filter((line) => line.every(isMarked));
  const winning = new Set(winningLines.flat());
  const hasBingo = winningLines.length > 0;

  async function onToggle(pos: number) {
    const i = gridToIndex(pos);
    if (i === null) return;
    const next = [...marks];
    next[i] = !next[i];
    setMarks(next); // optimistic
    try {
      await toggleSquare({ boardId, index: i, marks });
    } catch {
      setMarks(marks); // revert on failure
    }
  }

  return (
    <>
      {hasBingo && (
        <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: 12, background: "var(--accent-tint)", color: "var(--accent)", fontWeight: 700, textAlign: "center", fontFamily: "var(--font-head)", fontSize: 20 }}>
          Bingo! {winningLines.length > 1 && `(${winningLines.length} lines)`}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, margin: "16px 0 24px" }}>
        {Array.from({ length: 25 }, (_, pos) => {
          const i = gridToIndex(pos);
          const free = i === null;
          const on = isMarked(pos);
          const inWin = winning.has(pos);
          return (
            <button
              key={pos}
              onClick={() => onToggle(pos)}
              disabled={free}
              style={{
                aspectRatio: "1",
                padding: 6,
                borderRadius: 12,
                cursor: free ? "default" : "pointer",
                border: inWin ? "2px solid var(--accent)" : "1px solid var(--hairline)",
                background: on ? "var(--accent-tint)" : "rgba(255,255,255,0.65)",
                color: on ? "var(--accent)" : "var(--text-primary)",
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
              {free ? "FREE" : squares[i]}
            </button>
          );
        })}
      </div>
    </>
  );
}
