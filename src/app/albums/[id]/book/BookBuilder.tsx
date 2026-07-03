"use client";

import { useMemo, useState } from "react";

type Photo = { id: string; url: string; caption: string; width: number | null; height: number | null };

// Book sizes in inches, mirroring BOOK_SIZES on the server. The longest print
// edge (in inches) drives the resolution check below.
const SIZES: Record<string, { label: string; longEdgeIn: number }> = {
  "8x8": { label: '8" × 8" square', longEdgeIn: 8 },
  "8x10": { label: '8" × 10" portrait', longEdgeIn: 10 },
  "10x10": { label: '10" × 10" large square', longEdgeIn: 10 },
};

// Below ~150 DPI, prints look soft. Photo's long edge must cover the printable
// area (page long edge minus 1" of margins) at 150 DPI.
const MIN_DPI = 150;

export default function BookBuilder({
  albumId,
  defaultTitle,
  photos,
}: {
  albumId: string;
  defaultTitle: string;
  photos: Photo[];
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [size, setSize] = useState("8x8");
  const [selected, setSelected] = useState<Set<string>>(new Set(photos.map((p) => p.id)));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minPixels = (SIZES[size].longEdgeIn - 1) * MIN_DPI;

  function isLowRes(p: Photo) {
    const longEdge = Math.max(p.width ?? 0, p.height ?? 0);
    return longEdge > 0 && longEdge < minPixels;
  }

  const lowResSelectedCount = useMemo(
    () => photos.filter((p) => selected.has(p.id) && isLowRes(p)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, size, photos]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      // Keep the on-screen (chronological) order in the book.
      const photoIds = photos.filter((p) => selected.has(p.id)).map((p) => p.id);
      const res = await fetch(`/api/albums/${albumId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds, title, size }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "-") || "album"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't generate the book.");
    } finally {
      setGenerating(false);
    }
  }

  if (photos.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>Add some photos to the album first.</p>;
  }

  return (
    <>
      <section style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", margin: "1rem 0" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cover title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Book size</span>
          <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
            {Object.entries(SIZES).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
        <button onClick={generate} disabled={generating || selected.size === 0} style={{ padding: "10px 20px" }}>
          {generating ? "Building PDF..." : `Generate book (${selected.size} photos)`}
        </button>
      </section>

      {lowResSelectedCount > 0 && (
        <p style={{ fontSize: 13, color: "var(--text-warning, #a60)" }}>
          {lowResSelectedCount} selected photo{lowResSelectedCount > 1 ? "s" : ""} may look soft at this
          size — they&apos;re outlined below. You can still include them.
        </p>
      )}
      {error && <p style={{ color: "var(--text-danger, #c00)" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {photos.map((photo) => {
          const on = selected.has(photo.id);
          const lowRes = isLowRes(photo);
          return (
            <button
              key={photo.id}
              onClick={() => toggle(photo.id)}
              style={{
                padding: 0,
                border: lowRes ? "2px solid var(--border-warning, #d90)" : "2px solid transparent",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                opacity: on ? 1 : 0.4,
                position: "relative",
                background: "none",
              }}
              title={lowRes ? "Low resolution for this book size" : ""}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || "Photo"} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: on ? "var(--text-accent, #06c)" : "rgba(0,0,0,0.4)",
                  color: "#fff",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border, #ccc)",
};
