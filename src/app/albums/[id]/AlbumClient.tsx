"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { savePhoto, updateCaption, deletePhoto, updateFocus } from "./actions";
import { card, iconBadge, input, primaryButton, ghostButton } from "@/lib/ui";
import { Envelope, Copy, Users, Camera } from "@/components/icons";

type Photo = {
  id: string;
  key: string;
  caption: string;
  uploadedBy: string;
  url: string;
  focusX: number;
  focusY: number;
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
  const [editingFocus, setEditingFocus] = useState(false);
  const [focus, setFocus] = useState({ x: photo.focusX, y: photo.focusY });
  const [savingFocus, setSavingFocus] = useState(false);

  async function saveFocus() {
    setSavingFocus(true);
    await updateFocus({ albumId, photoId: photo.id, x: focus.x, y: focus.y });
    setSavingFocus(false);
    setEditingFocus(false);
  }

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption || "Album photo"}
          style={{ width: "100%", height: 150, objectFit: "cover", objectPosition: `${focus.x}% ${focus.y}%`, display: "block" }}
        />
        <button
          onClick={() => setEditingFocus(true)}
          aria-label="Adjust framing"
          style={{ position: "absolute", top: 8, right: 8, fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          Adjust
        </button>
      </div>
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

      {editingFocus && (
        <FocusEditor
          url={photo.url}
          focus={focus}
          setFocus={setFocus}
          onSave={saveFocus}
          onCancel={() => {
            setFocus({ x: photo.focusX, y: photo.focusY });
            setEditingFocus(false);
          }}
          saving={savingFocus}
        />
      )}
    </div>
  );
}

function FocusEditor({
  url,
  focus,
  setFocus,
  onSave,
  onCancel,
  saving,
}: {
  url: string;
  focus: { x: number; y: number };
  setFocus: (f: { x: number; y: number }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function updateFromEvent(e: React.PointerEvent) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFocus({ x: Math.max(0, Math.min(100, Math.round(x))), y: Math.max(0, Math.min(100, Math.round(y))) });
  }

  const modal = (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 16, maxWidth: 460, width: "100%" }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-secondary)" }}>
          Drag the circle onto the face or subject — it&apos;ll stay in frame wherever the photo is cropped.
        </p>
        <div
          ref={areaRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            updateFromEvent(e);
          }}
          onPointerMove={(e) => dragging && updateFromEvent(e)}
          onPointerUp={() => setDragging(false)}
          style={{ position: "relative", cursor: dragging ? "grabbing" : "grab", touchAction: "none", lineHeight: 0, borderRadius: 10, overflow: "hidden" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Set focal point" draggable={false} style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }} />
          <div
            style={{
              position: "absolute",
              left: `${focus.x}%`,
              top: `${focus.y}%`,
              width: 34,
              height: 34,
              marginLeft: -17,
              marginTop: -17,
              borderRadius: "50%",
              border: "3px solid #fff",
              background: "rgba(255,107,107,0.35)",
              boxShadow: "0 0 0 2px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={onCancel} style={ghostButton}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save framing"}
          </button>
        </div>
      </div>
    </div>
  );

  // Render outside the card — the glass card's backdrop-filter creates a
  // containing block that would otherwise trap and clip this fixed overlay.
  return createPortal(modal, document.body);
}
