// Renders the recap to a video file entirely in the browser: draws each frame
// to a canvas (Ken Burns + crossfades + captions + guest-entry cards) and
// records it with MediaRecorder. Encoding happens on the viewer's device.

import type { Slide } from "./RecapPlayer";

const W = 1280;
const H = 720;
const TITLE_MS = 3000;
const SLIDE_MS = 3500;
const CF_MS = 800;

function pickMime(withAudio: boolean): string {
  const candidates = withAudio
    ? ["video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function loadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  return Promise.all(
    urls.map(
      (u) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve([u, img]);
          img.onerror = () => reject(new Error("Couldn't load an image for the video."));
          img.src = u + (u.includes("?") ? "&" : "?") + "v=cors";
        })
    )
  ).then((pairs) => new Map(pairs));
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number, panX: number, panY: number, fx = 50, fy = 50) {
  const ir = img.width / img.height;
  const cr = W / H;
  let dw: number, dh: number;
  if (ir > cr) {
    dh = H * scale;
    dw = dh * ir;
  } else {
    dw = W * scale;
    dh = dw / ir;
  }
  // Position by focal point instead of centering, then add the Ken Burns pan.
  const x = (W - dw) * (fx / 100) + panX;
  const y = (H - dh) * (fy / 100) + panY;
  ctx.drawImage(img, x, y, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "400 16px system-ui, sans-serif";
  ctx.fillText("A LOOK BACK", W / 2, H / 2 - 30);
  ctx.fillStyle = "#fff";
  ctx.font = "500 44px system-ui, sans-serif";
  ctx.fillText(title, W / 2, H / 2 + 24, W - 120);
}

function drawEntry(ctx: CanvasRenderingContext2D, body: string, author: string) {
  ctx.fillStyle = "#1a1815";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5efe6";
  ctx.font = "italic 500 30px system-ui, sans-serif";
  const lines = wrapLines(ctx, `“${body}”`, W - 200);
  const lineHeight = 44;
  let y = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }
  ctx.fillStyle = "rgba(245,239,230,0.7)";
  ctx.font = "400 18px system-ui, sans-serif";
  ctx.fillText(`— ${author}`, W / 2, y + 12);
}

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, caption: string, prog: number, fx = 50, fy = 50) {
  const p = Math.max(0, Math.min(1, prog));
  drawCover(ctx, img, 1.04 + 0.09 * p, -18 * p, -10 * p, fx, fy);
  if (caption) {
    ctx.save();
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 14;
    ctx.fillText(caption, W / 2, H - 56, W - 120);
    ctx.restore();
  }
}

export async function recordRecap(
  slides: Slide[],
  title: string,
  onProgress: (fraction: number) => void,
  musicUrl: string | null = null
): Promise<{ blob: Blob; ext: string }> {
  const photoUrls = slides.filter((s): s is Extract<Slide, { type: "photo" }> => s.type === "photo").map((s) => s.url);
  const images = await loadImages(photoUrls);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Scene 0 = title card; scenes 1..n = slides.
  const sceneStart = (k: number) => (k === 0 ? 0 : TITLE_MS + (k - 1) * SLIDE_MS);
  const sceneDur = (k: number) => (k === 0 ? TITLE_MS : SLIDE_MS);
  const sceneCount = slides.length + 1;
  const total = TITLE_MS + slides.length * SLIDE_MS;

  function drawScene(k: number, localT: number) {
    if (k === 0) return drawTitle(ctx, title);
    const slide = slides[k - 1];
    if (slide.type === "entry") return drawEntry(ctx, slide.body, slide.author);
    const img = images.get(slide.url);
    if (img) drawPhoto(ctx, img, slide.caption, localT / sceneDur(k), slide.focusX, slide.focusY);
  }

  function drawFrame(t: number) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    let k = 0;
    while (k < sceneCount - 1 && t >= sceneStart(k + 1)) k++;
    const localT = t - sceneStart(k);
    drawScene(k, localT);

    const intoNext = localT - (sceneDur(k) - CF_MS);
    if (intoNext > 0 && k + 1 < sceneCount) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, intoNext / CF_MS);
      drawScene(k + 1, 0);
      ctx.restore();
    }
  }

  const videoStream = canvas.captureStream(30);

  // Optionally mix a music track into the recording by routing an <audio>
  // element through the Web Audio API into the recorded stream.
  let stream = videoStream;
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  if (musicUrl) {
    try {
      audioEl = new Audio(musicUrl);
      audioEl.loop = true;
      audioCtx = new AudioContext();
      const srcNode = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      srcNode.connect(dest);
      stream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    } catch {
      stream = videoStream; // fall back to silent video if audio setup fails
      audioEl = null;
      audioCtx = null;
    }
  }

  const mimeType = pickMime(!!audioEl);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
    ...(audioEl ? { audioBitsPerSecond: 128_000 } : {}),
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
  if (audioEl && audioCtx) {
    await audioCtx.resume().catch(() => {});
    await audioEl.play().catch(() => {});
  }
  const startTime = performance.now();
  await new Promise<void>((resolve) => {
    function loop(now: number) {
      const t = now - startTime;
      if (t >= total) {
        drawFrame(total - 1);
        recorder.stop();
        resolve();
        return;
      }
      drawFrame(t);
      onProgress(t / total);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  const blob = await finished;
  audioEl?.pause();
  await audioCtx?.close().catch(() => {});
  return { blob, ext: mimeType.includes("mp4") ? "mp4" : "webm" };
}
