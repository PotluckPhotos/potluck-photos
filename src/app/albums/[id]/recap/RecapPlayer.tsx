"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { recordRecap } from "./recap-video";

export type Slide =
  | { type: "photo"; url: string; caption: string; focusX: number; focusY: number }
  | { type: "entry"; body: string; author: string };

const SLIDE_MS = 5000;

// -1 represents the intro title card; 0..n-1 are the photos.
export default function RecapPlayer({
  albumId,
  title,
  slides,
}: {
  albumId: string;
  title: string;
  slides: Slide[];
}) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [recording, setRecording] = useState<number | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const last = slides.length - 1;

  async function downloadVideo() {
    setRecordError(null);
    setPlaying(false);
    setRecording(0);
    try {
      const { blob, ext } = await recordRecap(slides, title, (f) => setRecording(f));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "-") || "recap"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : "Couldn't create the video.");
    } finally {
      setRecording(null);
    }
  }

  const next = useCallback(() => {
    setIndex((i) => (i >= last ? -1 : i + 1));
  }, [last]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= -1 ? last : i - 1));
  }, [last]);

  useEffect(() => {
    if (!playing || slides.length === 0) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, playing, next, slides.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (slides.length === 0) {
    return (
      <div style={fullscreen}>
        <p style={{ color: "#fff" }}>No photos to recap yet.</p>
        <Link href={`/albums/${albumId}`} style={closeStyle}>✕</Link>
      </div>
    );
  }

  const showingTitle = index === -1;
  const current = showingTitle ? null : slides[index];
  // Alternate the pan direction each slide for variety.
  const kbClass = index % 2 === 0 ? "kb-a" : "kb-b";

  return (
    <div style={fullscreen} onClick={() => setPlaying((p) => !p)}>
      <style>{keyframes}</style>

      {showingTitle ? (
        <div key="title" style={titleCard} className="fade">
          <div style={{ fontSize: 14, letterSpacing: 3, opacity: 0.7, marginBottom: 12 }}>A LOOK BACK</div>
          <div style={{ fontSize: 44, fontWeight: 500, textAlign: "center", padding: "0 24px" }}>{title}</div>
        </div>
      ) : current!.type === "photo" ? (
        <div key={index} className={`fade ${kbClass}`} style={imageLayer(current!.url, current!.focusX, current!.focusY)} />
      ) : (
        <div key={index} style={entryCard} className="fade">
          <div style={{ fontSize: 26, fontStyle: "italic", fontWeight: 500, textAlign: "center", padding: "0 40px", lineHeight: 1.5 }}>
            &ldquo;{current!.body}&rdquo;
          </div>
          <div style={{ fontSize: 16, opacity: 0.7, marginTop: 20 }}>— {current!.author}</div>
        </div>
      )}

      {current?.type === "photo" && current.caption && (
        <div key={`cap-${index}`} style={captionStyle} className="fade-up">
          {current.caption}
        </div>
      )}

      {/* Progress bar */}
      <div style={progressWrap}>
        {slides.map((_, i) => (
          <div key={i} style={{ ...progressSeg, background: i <= index ? "#fff" : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>

      {/* Controls (stopPropagation so they don't toggle play) */}
      <div style={controls} onClick={(e) => e.stopPropagation()}>
        <button style={ctrlBtn} onClick={prev} aria-label="Previous">‹</button>
        <button style={ctrlBtn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button style={ctrlBtn} onClick={next} aria-label="Next">›</button>
      </div>

      {/* Download video */}
      <button
        style={downloadBtn}
        onClick={(e) => {
          e.stopPropagation();
          if (recording === null) downloadVideo();
        }}
        disabled={recording !== null}
      >
        {recording !== null ? "Recording…" : "Download video"}
      </button>

      {recording !== null && (
        <div style={recordOverlay} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 18, marginBottom: 12 }}>Creating your video…</div>
          <div style={{ width: 260, height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 3 }}>
            <div style={{ width: `${Math.round(recording * 100)}%`, height: "100%", background: "#fff", borderRadius: 3, transition: "width 0.2s" }} />
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10 }}>
            This records in real time, so it takes about as long as the recap plays.
          </div>
        </div>
      )}
      {recordError && (
        <div style={{ ...recordOverlay, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setRecordError(null); }}>
          <div style={{ maxWidth: 320, textAlign: "center" }}>{recordError}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10 }}>Tap to dismiss</div>
        </div>
      )}

      <Link href={`/albums/${albumId}`} style={closeStyle} onClick={(e) => e.stopPropagation()}>✕</Link>
    </div>
  );
}

const fullscreen: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#000",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  cursor: "pointer",
};

function imageLayer(url: string, focusX = 50, focusY = 50): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: `${focusX}% ${focusY}%`,
    willChange: "transform, opacity",
  };
}

const titleCard: React.CSSProperties = {
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  fontFamily: "system-ui, sans-serif",
};

const entryCard: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#1a1815",
  color: "#f5efe6",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const captionStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 96,
  left: 0,
  right: 0,
  textAlign: "center",
  color: "#fff",
  fontSize: 22,
  fontWeight: 500,
  textShadow: "0 2px 12px rgba(0,0,0,0.7)",
  padding: "0 32px",
};

const progressWrap: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  right: 16,
  display: "flex",
  gap: 4,
};

const progressSeg: React.CSSProperties = {
  flex: 1,
  height: 3,
  borderRadius: 2,
  transition: "background 0.3s",
};

const controls: React.CSSProperties = {
  position: "absolute",
  bottom: 28,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  gap: 24,
};

const ctrlBtn: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "50%",
  width: 48,
  height: 48,
  fontSize: 18,
  cursor: "pointer",
};

const downloadBtn: React.CSSProperties = {
  position: "absolute",
  top: 28,
  left: 20,
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
};

const recordOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
};

const closeStyle: React.CSSProperties = {
  position: "absolute",
  top: 24,
  right: 20,
  color: "#fff",
  fontSize: 22,
  textDecoration: "none",
  background: "rgba(0,0,0,0.4)",
  width: 40,
  height: 40,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const keyframes = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kbA { from { transform: scale(1) translate(0,0); } to { transform: scale(1.12) translate(-2%,-1%); } }
@keyframes kbB { from { transform: scale(1.12) translate(2%,1%); } to { transform: scale(1) translate(0,0); } }
.fade { animation: fadeIn 1s ease forwards; }
.fade-up { animation: fadeUp 1s ease forwards; }
.kb-a { animation: fadeIn 1s ease forwards, kbA 6s ease-out forwards; }
.kb-b { animation: fadeIn 1s ease forwards, kbB 6s ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .kb-a, .kb-b { animation: fadeIn 1s ease forwards; }
}
`;
