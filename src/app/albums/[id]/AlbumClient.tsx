"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { savePhoto, updateCaption, deletePhoto } from "./actions";
import { card, iconBadge, input, primaryButton, ghostButton } from "@/lib/ui";
import { Envelope, Copy, Users, Camera } from "@/components/icons";

type Photo = {
  id: string;
  key: string;
  caption: string;
  uploadedBy: string;
  url: string;
};

type Member = { userId: string; role: string; name: string };

export default function AlbumClient({
  albumId,
  joinCode,
  origin,
  isOwner,
  currentUserId,
  members,
  photos,
}: {
  albumId: string;
  joinCode: string;
  origin: string;
  isOwner: boolean;
  currentUserId: string;
  members: Member[];
  photos: Photo[];
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = `${origin}/join?code=${joinCode}`;

  async function readDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve({ width: null, height: null });
      img.src = url;
    });
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}...`);
        const ext = file.name.split(".").pop() ?? "jpg";
        const dims = await readDimensions(file);

        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ albumId, contentType: file.type, ext }),
        });
        if (!presignRes.ok) throw new Error("Couldn't prepare the upload.");
        const { uploadUrl, key } = await presignRes.json();

        // A CORS/network failure here throws (not a non-ok response), so it's
        // caught below rather than crashing into the error overlay.
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Storage rejected the upload.");

        await savePhoto({ albumId, key, caption: "", width: dims.width, height: dims.height });
      }
      setProgress(null);
      e.target.value = "";
    } catch {
      setProgress("Upload failed — likely a storage CORS setting. Check the R2 bucket's CORS policy.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, email: inviteEmail }),
      });
      const data = await res.json();
      setInviteMsg(res.ok ? `Invite sent to ${inviteEmail}` : data.error);
      if (res.ok) setInviteEmail("");
    } catch {
      setInviteMsg("Couldn't send the invite. Share the link or QR code instead.");
    }
  }

  function downloadQR() {
    const canvas = document.querySelector("#album-qr canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `potluck-${joinCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <section style={{ ...card, display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={iconBadge}><Envelope size={15} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 16 }}>Invite people</h3>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--text-secondary)" }}>
            Share this code — people enter it at potluck.photos to join.
          </p>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, letterSpacing: 6, marginBottom: 10 }}>
            {joinCode}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(joinCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            style={{ ...primaryButton, width: "100%" }}
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy code"}
          </button>

          <form onSubmit={handleInvite} style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="name@email.com"
              value={inviteEmail}
              onChange={(ev) => setInviteEmail(ev.target.value)}
              required
              style={{ ...input, flex: 1 }}
            />
            <button type="submit" style={{ ...ghostButton, whiteSpace: "nowrap" }}>Invite</button>
          </form>
          {inviteMsg && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 0 }}>{inviteMsg}</p>}
        </div>

        <div id="album-qr" style={{ textAlign: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 10, border: "1px solid var(--hairline)", display: "inline-block" }}>
            {joinUrl && <QRCodeCanvas value={joinUrl} size={104} />}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>scan to join</div>
          <button onClick={downloadQR} style={{ marginTop: 6, fontSize: 12, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>
            Download QR
          </button>
        </div>

        <div style={{ minWidth: 150 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={iconBadge}><Users size={15} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 16 }}>Members</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-tint)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                {m.name}
                {m.role === "owner" && <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>(owner)</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <label style={{ display: "block", marginBottom: 20 }}>
        <span style={{ ...primaryButton, width: "100%", cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1 }}>
          <Camera size={15} />
          {uploading ? "Uploading…" : "Add photos"}
        </span>
        <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={uploading} style={{ display: "none" }} />
      </label>
      {progress && <p style={{ marginTop: -8, marginBottom: 16, color: "var(--text-secondary)", fontSize: 13 }}>{progress}</p>}

      {photos.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No photos yet. Add the first ones above.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 20 }}>
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} albumId={albumId} canDelete={isOwner || photo.uploadedBy === currentUserId} />
          ))}
        </div>
      )}
    </>
  );
}

function PhotoCard({
  photo,
  albumId,
  canDelete,
}: {
  photo: Photo;
  albumId: string;
  canDelete: boolean;
}) {
  const [caption, setCaption] = useState(photo.caption);
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || "Album photo"}
        style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
      />
      <div style={{ padding: "9px 10px" }}>
        <input
          value={caption}
          placeholder="Add a caption…"
          onChange={(e) => {
            setCaption(e.target.value);
            setSaved(false);
          }}
          onBlur={async () => {
            if (caption !== photo.caption) {
              await updateCaption({ albumId, photoId: photo.id, caption });
              setSaved(true);
            }
          }}
          style={{ width: "100%", border: "none", fontSize: 12.5, background: "transparent", color: "var(--text-secondary)", outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{saved ? "Saved" : ""}</span>
          {canDelete && (
            <button
              onClick={async () => {
                if (confirm("Delete this photo?")) {
                  await deletePhoto({ albumId, photoId: photo.id, key: photo.key });
                }
              }}
              style={{ fontSize: 11, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-danger)" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
