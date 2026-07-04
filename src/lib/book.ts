import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

export type BookPhoto = { url: string; caption: string; focusX?: number; focusY?: number };
export type BookEntry = { body: string; author: string };
export type BookSize = { label: string; width: number; height: number };
export type Template = "classic" | "modern" | "collage";

export const BOOK_SIZES: Record<string, BookSize> = {
  "8x8": { label: '8" × 8" square', width: 576, height: 576 },
  "8x10": { label: '8" × 10" portrait', width: 576, height: 720 },
  "10x10": { label: '10" × 10" large square', width: 720, height: 720 },
};

export const TEMPLATES: Record<Template, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Matted prints on warm pages with a caption below." },
  modern: { label: "Modern", description: "Full-bleed photos, edge to edge, caption over a soft fade." },
  collage: { label: "Collage", description: "Up to four framed photos per page, scrapbook style." },
};

const MARGIN = 44;

// Warm photo-book palette.
const CREAM = rgb(0.992, 0.984, 0.965);
const CARD = rgb(1, 1, 1);
const INK = rgb(0.17, 0.15, 0.13);
const MUTED = rgb(0.5, 0.46, 0.42);
const FRAME = rgb(0.86, 0.83, 0.77);
const ACCENT = rgb(1, 0.42, 0.35);

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
type Img = { width: number; height: number };

function detectImageType(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return null;
}

async function fetchImage(pdf: PDFDocument, url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return null;
    return type === "jpg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let str = text;
  while (str.length > 1 && font.widthOfTextAtSize(str, size) > maxWidth) str = str.slice(0, -2) + "…";
  return str;
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK, maxWidth?: number) {
  const str = maxWidth ? truncate(text, font, size, maxWidth) : text;
  const tw = font.widthOfTextAtSize(str, size);
  page.drawText(str, { x: (page.getWidth() - tw) / 2, y, size, font, color });
}

// Fit the whole image inside a box (letterboxed), returning draw coords.
function contain(img: Img, box: { x: number; y: number; w: number; h: number }) {
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  return { x: box.x + (box.w - dw) / 2, y: box.y + (box.h - dh) / 2, width: dw, height: dh };
}

// Cover-crop to fill W×H by focal point (overflow clipped by the page bounds).
function coverDims(img: Img, W: number, H: number, fx = 50, fy = 50) {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  return { x: (W - dw) * (fx / 100), y: (H - dh) * (1 - fy / 100), width: dw, height: dh };
}

// Fake a bottom-up dark gradient by stacking translucent bars — used to keep
// overlaid captions legible on full-bleed photos.
function drawBottomScrim(page: PDFPage, W: number, height: number) {
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: (height * (i + 1)) / steps, color: rgb(0, 0, 0), opacity: 0.06 });
  }
}

function drawPageNumber(page: PDFPage, fonts: Fonts, n: number, light = false) {
  drawCentered(page, String(n), 22, fonts.regular, 9, light ? rgb(1, 1, 1) : MUTED);
}

// A white "print" card with a hairline frame, photo contained inside.
function drawFramedPhoto(page: PDFPage, img: Img | null, box: { x: number; y: number; w: number; h: number }, embed: (d: { x: number; y: number; width: number; height: number }) => void) {
  page.drawRectangle({ x: box.x, y: box.y, width: box.w, height: box.h, color: CARD, borderColor: FRAME, borderWidth: 0.75 });
  if (!img) return;
  const pad = 8;
  const d = contain(img, { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 });
  embed(d);
}

export async function generateBook(opts: {
  title: string;
  template: Template;
  size: BookSize;
  cover: BookPhoto | null;
  photos: BookPhoto[];
  entries: BookEntry[];
}): Promise<Uint8Array> {
  const { title, template, size, cover, photos, entries } = opts;
  const { width: W, height: H } = size;
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  await drawCover(pdf, fonts, { title, template, W, H, cover });

  const perPage = template === "collage" ? 4 : 1;
  const photoBlocks: BookPhoto[][] = [];
  for (let i = 0; i < photos.length; i += perPage) photoBlocks.push(photos.slice(i, i + perPage));

  const gap = entries.length ? Math.max(1, Math.floor(photoBlocks.length / (entries.length + 1))) : 0;
  let pageNo = 1;
  let ei = 0;
  for (let i = 0; i < photoBlocks.length; i++) {
    await drawPhotoBlock(pdf, fonts, { template, W, H, photos: photoBlocks[i], pageNo: pageNo++ });
    if (gap && ei < entries.length && (i + 1) % gap === 0) {
      drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++], pageNo: pageNo++ });
    }
  }
  while (ei < entries.length) drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++], pageNo: pageNo++ });

  return pdf.save();
}

async function drawCover(pdf: PDFDocument, fonts: Fonts, o: { title: string; template: Template; W: number; H: number; cover: BookPhoto | null }) {
  const page = pdf.addPage([o.W, o.H]);
  const img = o.cover ? await fetchImage(pdf, o.cover.url) : null;
  const cx = o.W / 2;

  if (o.template === "modern") {
    // Full-bleed cover, title in the lower third over a fade.
    if (img) page.drawImage(img, coverDims(img, o.W, o.H, o.cover?.focusX, o.cover?.focusY));
    else page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.15, 0.15, 0.18) });
    drawBottomScrim(page, o.W, o.H * 0.4);
    drawCentered(page, o.title, 54, fonts.bold, 30, rgb(1, 1, 1), o.W - MARGIN * 2);
    return;
  }

  if (o.template === "collage") {
    // Full-bleed cover with a clean cream title band at the bottom.
    if (img) page.drawImage(img, coverDims(img, o.W, o.H, o.cover?.focusX, o.cover?.focusY));
    else page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
    const band = 96;
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: band, color: CREAM });
    drawCentered(page, o.title, band / 2 - 6, fonts.bold, 28, INK, o.W - MARGIN * 2);
    return;
  }

  // classic: matted cover photo on a cream page, title below with rules.
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
  drawFramedPhoto(page, img, { x: MARGIN, y: MARGIN + 96, w: o.W - MARGIN * 2, h: o.H - MARGIN * 2 - 96 }, (d) => img && page.drawImage(img, d));
  const titleY = MARGIN + 44;
  page.drawLine({ start: { x: cx - 40, y: titleY + 30 }, end: { x: cx + 40, y: titleY + 30 }, thickness: 1, color: ACCENT });
  drawCentered(page, o.title, titleY, fonts.bold, 26, INK, o.W - MARGIN * 2);
}

async function drawPhotoBlock(pdf: PDFDocument, fonts: Fonts, o: { template: Template; W: number; H: number; photos: BookPhoto[]; pageNo: number }) {
  const page = pdf.addPage([o.W, o.H]);

  if (o.template === "modern") {
    const photo = o.photos[0];
    const img = await fetchImage(pdf, photo.url);
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.1, 0.1, 0.1) });
    if (img) page.drawImage(img, coverDims(img, o.W, o.H, photo.focusX, photo.focusY));
    if (photo.caption) {
      drawBottomScrim(page, o.W, 90);
      page.drawText(truncate(photo.caption, fonts.regular, 13, o.W - MARGIN * 2), { x: MARGIN, y: 30, size: 13, font: fonts.regular, color: rgb(1, 1, 1) });
    }
    drawPageNumber(page, fonts, o.pageNo, true);
    return;
  }

  if (o.template === "collage") {
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
    const gutter = 16;
    const cellW = (o.W - MARGIN * 2 - gutter) / 2;
    const cellH = (o.H - MARGIN * 2 - gutter) / 2;
    for (let i = 0; i < o.photos.length && i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + col * (cellW + gutter);
      const y = o.H - MARGIN - (row + 1) * cellH - row * gutter;
      const img = await fetchImage(pdf, o.photos[i].url);
      drawFramedPhoto(page, img, { x, y, w: cellW, h: cellH }, (d) => img && page.drawImage(img, d));
    }
    drawPageNumber(page, fonts, o.pageNo);
    return;
  }

  // classic: one matted print with a serif-italic caption below.
  const photo = o.photos[0];
  const img = await fetchImage(pdf, photo.url);
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
  const capH = photo.caption ? 40 : 0;
  drawFramedPhoto(page, img, { x: MARGIN, y: MARGIN + capH, w: o.W - MARGIN * 2, h: o.H - MARGIN * 2 - capH }, (d) => img && page.drawImage(img, d));
  if (photo.caption) {
    drawCentered(page, photo.caption, MARGIN + 14, fonts.italic, 13, MUTED, o.W - MARGIN * 2);
  }
  drawPageNumber(page, fonts, o.pageNo);
}

function drawEntryPage(pdf: PDFDocument, fonts: Fonts, o: { W: number; H: number; entry: BookEntry; pageNo: number }) {
  const page = pdf.addPage([o.W, o.H]);
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.97, 0.955, 0.925) });

  // Oversized decorative opening quote.
  drawCentered(page, "“", o.H / 2 + 70, fonts.bold, 90, rgb(0.9, 0.83, 0.72));

  const size = 19;
  const maxWidth = o.W - MARGIN * 3;
  const lines = wrapText(o.entry.body, fonts.italic, size, maxWidth);
  const lineHeight = size * 1.5;
  let y = o.H / 2 + (lines.length * lineHeight) / 2;
  for (const line of lines) {
    drawCentered(page, line, y, fonts.italic, size, rgb(0.25, 0.22, 0.2));
    y -= lineHeight;
  }
  page.drawLine({ start: { x: o.W / 2 - 24, y: y + 4 }, end: { x: o.W / 2 + 24, y: y + 4 }, thickness: 1, color: ACCENT });
  drawCentered(page, o.entry.author.toUpperCase(), y - 18, fonts.regular, 11, MUTED, maxWidth);
  drawPageNumber(page, fonts, o.pageNo);
}
