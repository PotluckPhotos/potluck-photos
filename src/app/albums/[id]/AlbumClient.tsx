"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { savePhoto, updateCaption, deletePhoto } from "./actions";

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
      <section
        style={{
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          margin: "1.5rem 0",
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--border, #e5e5e5)",
        }}
      >
        <div>
          <h3 style={{ marginTop: 0 }}>Invite people</h3>
          <p style={{ margin: "4px 0" }}>
            Code: <strong style={{ letterSpacing: 3 }}>{joinCode}</strong>
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied!" : "Copy invite link"}
          </button>

          <form onSubmit={handleInvite} style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="name@email.com"
              value={inviteEmail}
              onChange={(ev) => setInviteEmail(ev.target.value)}
              required
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border, #ccc)" }}
            />
            <button type="submit">Email invite</button>
          </form>
          {inviteMsg && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{inviteMsg}</p>
          )}
        </div>

        <div id="album-qr" style={{ textAlign: "center" }}>
          {joinUrl && <QRCodeCanvas value={joinUrl} size={120} includeMargin />}
          <div>
            <button onClick={downloadQR} style={{ marginTop: 8, fontSize: 13 }}>
              Download QR
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Members</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14 }}>
            {members.map((m) => (
              <li key={m.userId}>
                {m.name} {m.role === "owner" && <span style={{ color: "var(--text-secondary)" }}>(owner)</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ margin: "1.5rem 0" }}>
        <label style={{ display: "inline-block", cursor: "pointer" }}>
          <span
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border-strong, #ccc)",
            }}
          >
            {uploading ? "Uploading..." : "Add photos"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
        {progress && <span style={{ marginLeft: 12, color: "var(--text-secondary)" }}>{progress}</span>}
      </section>

      {photos.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No photos yet. Add the first ones above.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              albumId={albumId}
              canDelete={isOwner || photo.uploadedBy === currentUserId}
            />
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
    <div style={{ border: "1px solid var(--border, #e5e5e5)", borderRadius: 12, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || "Album photo"}
        style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
      />
      <div style={{ padding: 8 }}>
        <input
          value={caption}
          placeholder="Add a caption..."
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
          style={{ width: "100%", border: "none", fontSize: 13, background: "transparent" }}
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
              style={{ fontSize: 11, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-danger, #c00)" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
