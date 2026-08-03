import Link from "next/link";
import { card, primaryButton, iconBadge } from "@/lib/ui";
import { Plus, Users, Camera, GuestBookIcon, BookIcon, Play } from "@/components/icons";

export default function AboutPotluck({ showCta = false }: { showCta?: boolean }) {
  const oneRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 } as const;

  return (
    <>
      {/* How it works */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>How it works</h2>
        <div style={oneRow}>
          {[
            { icon: <Plus size={16} />, title: "Create an album", body: "Name your trip or event and you're set." },
            { icon: <Users size={15} />, title: "Invite everyone", body: "Share a 5-character code, a link, or a QR." },
            { icon: <Camera size={15} color="var(--accent)" />, title: "Everyone adds", body: "Photos, captions, and guest-book notes." },
            { icon: <BookIcon size={15} />, title: "Keep the memories", body: "Make a photo book or play a recap." },
          ].map((step, i) => (
            <div key={i} style={card}>
              <div style={{ ...iconBadge, marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>{step.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>What you get</h2>
        <div style={oneRow}>
          {[
            { icon: <Camera size={15} color="var(--accent)" />, title: "Shared uploads", body: "Everyone's photos land in one place." },
            { icon: <GuestBookIcon size={15} />, title: "Guest book", body: "Notes about the trip, woven through the book and recap." },
            { icon: <Play size={14} />, title: "Recap slideshow", body: "An auto-playing memories reel, downloadable as a video." },
            { icon: <BookIcon size={15} />, title: "Photo book", body: "Pick a template and cover, export a print-ready PDF." },
          ].map((f, i) => (
            <div key={i} style={card}>
              <div style={{ ...iconBadge, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>Pricing</h2>
        <div style={{ ...card, maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 700 }}>Free</div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "8px 0 0" }}>
            Creating albums, collecting photos, the guest book, and recaps all cost nothing. When you want a
            physical book, you download a print-ready PDF and order it from a print service like Blurb, Mimeo,
            or Mixam — you only ever pay the printer for the book itself.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "14px 0 0" }}>
            Open source (AGPL-3.0) — you can also self-host it on your own storage for free.
          </p>
          {showCta && (
            <Link href="/login?mode=signup" style={{ ...primaryButton, marginTop: 20 }}>Start your first album</Link>
          )}
        </div>
      </section>
    </>
  );
}
