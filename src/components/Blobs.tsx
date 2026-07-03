// Gemini-style animated gradient blobs behind all content.
export default function Blobs() {
  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, overflow: "hidden", filter: "blur(64px)", pointerEvents: "none", zIndex: 0 }}
    >
      <div
        data-blob
        style={{ position: "absolute", width: 640, height: 640, left: -140, top: -120, borderRadius: "50%", opacity: 0.55, background: "radial-gradient(circle, var(--accent) 0%, transparent 68%)", animation: "drift1 18s ease-in-out infinite" }}
      />
      <div
        data-blob
        style={{ position: "absolute", width: 560, height: 560, right: -120, top: 120, borderRadius: "50%", opacity: 0.5, background: "radial-gradient(circle, var(--accent-2) 0%, transparent 68%)", animation: "drift2 24s ease-in-out infinite" }}
      />
      <div
        data-blob
        style={{ position: "absolute", width: 520, height: 520, left: "30%", bottom: -220, borderRadius: "50%", opacity: 0.45, background: "radial-gradient(circle, var(--gold) 0%, transparent 68%)", animation: "drift3 20s ease-in-out infinite" }}
      />
    </div>
  );
}
