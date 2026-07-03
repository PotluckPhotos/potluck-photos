"use client";

import { useMemo, useState } from "react";

type Photo = { id: string; url: string; caption: string; width: number | null; height: number | null };

const SIZES: Record<string, { label: string; longEdgeIn: number }> = {
  "8x8": { label: '8" × 8" square', longEdgeIn: 8 },
  "8x10": { label: '8" × 10" portrait', longEdgeIn: 10 },
  "10x10": { label: '10" × 10" large square', longEdgeIn: 10 },
};

const TEMPLATES: Record<string, { label: string; description: string }> = {
  classic: { label: "Classic", description: "White pages, one photo centered with a caption below." },
  modern: { label: "Modern", description: "Full-bleed photos, captions over a dark bar." },
  collage: { label: "Collage", description: "Two photos per page for a denser scrapbook feel." },
};

const MIN_DPI = 150;

export default function BookBuilder({
  albumId,
  defaultTitle,
  photos,
  entryCount,
}: {
  albumId: string;
  defaultTitle: string;
  photos: Photo[];
  entryCount: number;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [size, setSize] = useState("8x8");
  const [template, setTemplate] = useState("classic");
  const [selected, setSelected] = useState<Set<string>>(new Set(photos.map((p) => p.id)));
  const [coverId, setCoverId] = useState<string | null>(photos[0]?.id ?? null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minPixels = (SIZES[size].longEdgeIn - 1) * MIN_DPI;
  const isLowRes = (p: Photo) => {
    const longEdge = Math.max(p.width ?? 0, p.height ?? 0);
    return longEdge > 0 && longEdge < minPixels;
  };

  const lowResSelectedCount = useMemo(
    () => photos.filter((p) => selected.has(p.id) && isLowRes(p)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, size, photos]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (coverId === id) setCoverId(null); // cover must stay selected
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setCover(id: string) {
    setSelected((prev) => new Set(prev).add(id));
    setCoverId(id);
  }

  async function generate() {
    setError(null);
    if (!coverId) {
      setError("Pick a cover photo first (tap “Set cover” on one).");
      return;
    }
    setGenerating(true);
    try {
      const photoIds = photos.filter((p) => selected.has(p.id)).map((p) => p.id);
      const res = await fetch(`/api/albums/${albumId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds, coverPhotoId: coverId, title, size, template }),
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
        <label style={fieldStyle}>
          <span style={labelStyle}>Cover title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Template</span>
          <select value={template} onChange={(e) => setTemplate(e.target.value)} style={inputStyle}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Book size</span>
          <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
            {Object.entries(SIZES).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
        <button onClick={generate} disabled={generating || selected.size === 0} style={{ padding: "10px 20px" }}>
          {generating ? "Building PDF…" : `Generate book (${selected.size} photos)`}
        </button>
      </section>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 0 }}>
        {TEMPLATES[template].description}
        {entryCount > 0 && ` · ${entryCount} guest-book ${entryCount === 1 ? "entry" : "entries"} will be woven in.`}
      </p>

      {!coverId && (
        <p style={{ fontSize: 13, color: "var(--text-warning, #a60)" }}>
          Pick a cover photo — tap “Set cover” on the one you want on the front.
        </p>
      )}
      {lowResSelectedCount > 0 && (
        <p style={{ fontSize: 13, color: "var(--text-warning, #a60)" }}>
          {lowResSelectedCount} selected photo{lowResSelectedCount > 1 ? "s" : ""} may look soft at this
          size — outlined below. You can still include them.
        </p>
      )}
      {error && <p style={{ color: "var(--text-danger, #c00)" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
        {photos.map((photo) => {
          const on = selected.has(photo.id);
          const lowRes = isLowRes(photo);
          const isCover = coverId === photo.id;
          return (
            <div
              key={photo.id}
              style={{
                border: isCover
                  ? "2px solid var(--text-accent, #06c)"
                  : lowRes
                  ? "2px solid var(--border-warning, #d90)"
                  : "2px solid transparent",
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                opacity: on ? 1 : 0.4,
              }}
            >
              <button
                onClick={() => toggle(photo.id)}
                style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                aria-label={on ? "Remove from book" : "Add to book"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || "Photo"} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
              </button>
              <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: on ? "var(--text-accent, #06c)" : "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on ? "✓" : ""}
              </span>
              <button
                onClick={() => setCover(photo.id)}
                style={{ position: "absolute", bottom: 6, left: 6, fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: isCover ? "var(--text-accent, #06c)" : "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                {isCover ? "★ Cover" : "Set cover"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)" };
const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border, #ccc)" };
