// Renders the recap to a video file entirely in the browser: draws each frame
// to a canvas (Ken Burns + crossfades + captions) and records the canvas with
// MediaRecorder. No server work — encoding happens on the viewer's device.

type Slide = { url: string; caption: string };

const W = 1280;
const H = 720;
const TITLE_MS = 3000;
const SLIDE_MS = 3500;
const CF_MS = 800; // crossfade duration

function pickMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (u) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Couldn't load an image for the video."));
          // Cache-bust so we get a fresh CORS-enabled response, not a cached
          // non-CORS one that would taint the canvas.
          img.src = u + (u.includes("?") ? "&" : "?") + "v=cors";
        })
    )
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scale: number,
  panX: number,
  panY: number
) {
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
  ctx.drawImage(img, (W - dw) / 2 + panX, (H - dh) / 2 + panY, dw, dh);
}

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, slide: Slide, prog: number) {
  const p = Math.max(0, Math.min(1, prog));
  const scale = 1.04 + 0.09 * p;
  const panX = -18 * p;
  const panY = -10 * p;
  drawCover(ctx, img, scale, panX, panY);

  if (slide.caption) {
    ctx.save();
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 14;
    ctx.fillText(slide.caption, W / 2, H - 56, W - 120);
    ctx.restore();
  }
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

export async function recordRecap(
  slides: Slide[],
  title: string,
  onProgress: (fraction: number) => void
): Promise<{ blob: Blob; ext: string }> {
  const images = await loadImages(slides.map((s) => s.url));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Scene 0 is the title card; scenes 1..n are photos.
  const sceneStart = (k: number) => (k === 0 ? 0 : TITLE_MS + (k - 1) * SLIDE_MS);
  const sceneDur = (k: number) => (k === 0 ? TITLE_MS : SLIDE_MS);
  const sceneCount = slides.length + 1;
  const total = TITLE_MS + slides.length * SLIDE_MS;

  function drawScene(k: number) {
    if (k === 0) {
      drawTitle(ctx, title);
    } else {
      const localT = performanceScene(k);
      drawPhoto(ctx, images[k - 1], slides[k - 1], localT / sceneDur(k));
    }
  }

  // Set at each frame so drawScene can read the current scene-local time.
  let sceneLocalT = 0;
  function performanceScene(_k: number) {
    return sceneLocalT;
  }

  function drawFrame(t: number) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    let k = 0;
    while (k < sceneCount - 1 && t >= sceneStart(k + 1)) k++;
    const localT = t - sceneStart(k);
    const dur = sceneDur(k);

    sceneLocalT = localT;
    drawScene(k);

    // Crossfade into the next scene during the tail of this one.
    const intoNext = localT - (dur - CF_MS);
    if (intoNext > 0 && k + 1 < sceneCount) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, intoNext / CF_MS);
      sceneLocalT = 0;
      drawScene(k + 1);
      ctx.restore();
    }
  }

  const stream = canvas.captureStream(30);
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
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
  return { blob, ext: mimeType.includes("mp4") ? "mp4" : "webm" };
}
