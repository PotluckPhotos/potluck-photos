"use client";

import { useEffect, useRef, useState } from "react";

type Service = { name: string; tag: string; url: string; logo: string };

// Only services that accept a finished print-ready PDF (what Potluck exports).
// API-based print services aren't listed since there's no direct-order flow.
const SERVICES: Service[] = [
  { name: "Mimeo Photos", tag: "PDF import", url: "https://mimeophotos.com/pdf-import-service/", logo: "/logos/mimeo.svg" },
  { name: "Blurb", tag: "PDF upload", url: "https://www.blurb.com/", logo: "/logos/blurb.svg" },
  { name: "Mixam", tag: "PDF upload", url: "https://www.mixam.com/", logo: "/logos/mixam.svg" },
];

const GAP = 20;
const SPEED = 32; // px/second
const RADIUS = 150; // magnification falloff distance, px
const MAX_BOOST = 0.5; // center item scales to 1.5x, dock-style
const COPIES = 6; // enough repeats that the loop always spans the viewport

export default function ServiceMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const track = trackRef.current;
    if (!track) return;

    let segmentWidth = 0;
    let offset = 0;

    function measure() {
      const firstSegment = itemRefs.current.slice(0, SERVICES.length);
      segmentWidth = firstSegment.reduce((sum, el) => sum + (el?.offsetWidth ?? 0) + GAP, 0);
      offset = -segmentWidth;
      if (track) track.style.transform = `translateX(${offset}px)`;
    }
    measure();
    window.addEventListener("resize", measure);

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      if (segmentWidth > 0) {
        offset += SPEED * dt;
        if (offset >= 0) offset -= segmentWidth;
        if (track) track.style.transform = `translateX(${offset}px)`;
      }

      const container = track?.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.left + containerRect.width / 2;
        for (const el of itemRefs.current) {
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const itemCenter = rect.left + rect.width / 2;
          const dist = Math.abs(itemCenter - centerX);
          const scale = 1 + MAX_BOOST * Math.max(0, 1 - dist / RADIUS);
          el.style.transform = `scale(${scale})`;
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [reduceMotion]);

  const loop = reduceMotion ? SERVICES : Array.from({ length: COPIES }, () => SERVICES).flat();

  return (
    <div
      style={{
        overflow: "hidden",
        // Generous top padding so the magnified center item grows upward
        // without being clipped by the container.
        padding: "56px 0 20px",
        maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: GAP,
          width: "max-content",
          flexWrap: reduceMotion ? "wrap" : "nowrap",
          justifyContent: reduceMotion ? "center" : "flex-start",
          willChange: "transform",
        }}
      >
        {loop.map((service, i) => (
          <a
            key={i}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              width: 116,
              flexShrink: 0,
              textDecoration: "none",
              color: "inherit",
              transformOrigin: "center bottom",
              transition: reduceMotion ? undefined : "transform 0.05s linear",
            }}
          >
            <div
              style={{
                width: 100,
                height: 56,
                borderRadius: 14,
                background: "#fff",
                border: "1px solid var(--hairline)",
                boxShadow: "0 6px 16px rgba(120,60,40,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 10px",
              }}
            >
              {failed.has(i) ? (
                <span style={{ fontWeight: 700, fontSize: 15 }}>{service.name.split(" ")[0]}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.logo}
                  alt={service.name}
                  style={{ maxWidth: 80, maxHeight: 28 }}
                  onError={() => setFailed((prev) => new Set(prev).add(i))}
                />
              )}
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: 0.5,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--accent-tint)",
                color: "var(--accent)",
              }}
            >
              {service.tag}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
