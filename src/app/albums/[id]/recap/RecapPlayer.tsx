"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Slide = { url: string; caption: string };

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
  const last = slides.length - 1;

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
      ) : (
        <div key={index} className={`fade ${kbClass}`} style={imageLayer(current!.url)} />
      )}

      {current?.caption && (
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

function imageLayer(url: string): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
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
