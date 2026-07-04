import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from "pdf-lib";

export type BookPhoto = { url: string; caption: string; focusX?: number; focusY?: number };
export type BookEntry = { body: string; author: string };
export type BookSize = { label: string; width: number; height: number };
export type Template = "classic" | "modern" | "collage" | "polaroid" | "magazine";

export const BOOK_SIZES: Record<string, BookSize> = {
  "8x8": { label: '8" × 8" square', width: 576, height: 576 },
  "8x10": { label: '8" × 10" portrait', width: 576, height: 720 },
  "10x10": { label: '10" × 10" large square', width: 720, height: 720 },
};

export const TEMPLATES: Record<Template, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Matted prints on warm pages with a caption below." },
  modern: { label: "Modern", description: "Full-bleed photos, edge to edge, caption over a soft fade." },
  collage: { label: "Collage", description: "Up to four framed photos per page, scrapbook style." },
  polaroid: { label: "Polaroid", description: "One instant-photo card per page with a handwritten-style caption." },
  magazine: { label: "Magazine", description: "A big photo with the caption set as an editorial headline." },
};

const MARGIN = 44;
const CREAM = rgb(0.992, 0.984, 0.965);
const KRAFT = rgb(0.965, 0.945, 0.915);
const CARD = rgb(1, 1, 1);
const INK = rgb(0.17, 0.15, 0.13);
const MUTED = rgb(0.5, 0.46, 0.42);
const FRAME = rgb(0.86, 0.83, 0.77);
const ACCENT = rgb(1, 0.42, 0.35);

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
type Loaded = { img: PDFImage; orientation: number };
type Box = { x: number; y: number; w: number; h: number };

function detectImageType(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return null;
}

// Minimal EXIF orientation reader for JPEGs (tag 0x0112), normalized to the
// four non-mirrored cases {1,3,6,8}. pdf-lib doesn't apply orientation itself,
// so without this, phone photos come out sideways.
function parseOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let off = 2;
  while (off + 4 < bytes.length) {
    if (bytes[off] !== 0xff) { off++; continue; }
    const marker = bytes[off + 1];
    if (marker === 0xda) break;
    const size = (bytes[off + 2] << 8) | bytes[off + 3];
    if (marker === 0xe1 && bytes[off + 4] === 0x45 && bytes[off + 5] === 0x78) {
      const tiff = off + 10;
      const little = bytes[tiff] === 0x49;
      const r16 = (o: number) => (little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
      const r32 = (o: number) => (little ? bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24) : (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]);
      const ifd0 = tiff + r32(tiff + 4);
      const count = r16(ifd0);
      for (let i = 0; i < count; i++) {
        const entry = ifd0 + 2 + i * 12;
        if (r16(entry) === 0x0112) {
          const raw = r16(entry + 8);
          return ({ 2: 1, 4: 3, 5: 6, 7: 8 } as Record<number, number>)[raw] ?? raw;
        }
      }
      return 1;
    }
    off += 2 + size;
  }
  return 1;
}

async function fetchImage(pdf: PDFDocument, url: string): Promise<Loaded | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return null;
    const img = type === "jpg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
    return { img, orientation: type === "jpg" ? parseOrientation(bytes) : 1 };
  } catch {
    return null;
  }
}

// Display dimensions (width/height swap for 90°/270° rotations).
function dispDims(l: Loaded) {
  const swap = l.orientation === 6 || l.orientation === 8;
  return swap ? { w: l.img.height, h: l.img.width } : { w: l.img.width, h: l.img.height };
}

function containBox(dw0: number, dh0: number, box: Box) {
  const scale = Math.min(box.w / dw0, box.h / dh0);
  const dw = dw0 * scale;
  const dh = dh0 * scale;
  return { x: box.x + (box.w - dw) / 2, y: box.y + (box.h - dh) / 2, width: dw, height: dh };
}

function coverBox(dw0: number, dh0: number, W: number, H: number, fx = 50, fy = 50) {
  const scale = Math.max(W / dw0, H / dh0);
  const dw = dw0 * scale;
  const dh = dh0 * scale;
  return { x: (W - dw) * (fx / 100), y: (H - dh) * (1 - fy / 100), width: dw, height: dh };
}

// Draws an embedded image into a target display-rect, applying EXIF rotation.
function drawOriented(page: PDFPage, l: Loaded, r: { x: number; y: number; width: number; height: number }) {
  const { img, orientation } = l;
  const { x, y, width: W, height: H } = r;
  if (orientation === 3) page.drawImage(img, { x: x + W, y: y + H, width: W, height: H, rotate: degrees(180) });
  else if (orientation === 6) page.drawImage(img, { x, y: y + H, width: H, height: W, rotate: degrees(-90) });
  else if (orientation === 8) page.drawImage(img, { x: x + W, y, width: H, height: W, rotate: degrees(90) });
  else page.drawImage(img, { x, y, width: W, height: H });
}

function drawContainOriented(page: PDFPage, l: Loaded, box: Box) {
  const { w, h } = dispDims(l);
  drawOriented(page, l, containBox(w, h, box));
}

function drawCoverOriented(page: PDFPage, l: Loaded, W: number, H: number, fx?: number, fy?: number) {
  const { w, h } = dispDims(l);
  drawOriented(page, l, coverBox(w, h, W, H, fx, fy));
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
    } else line = candidate;
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

function drawBottomScrim(page: PDFPage, W: number, height: number) {
  for (let i = 0; i < 10; i++) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: (height * (i + 1)) / 10, color: rgb(0, 0, 0), opacity: 0.06 });
  }
}

function drawPageNumber(page: PDFPage, fonts: Fonts, n: number, light = false) {
  drawCentered(page, String(n), 22, fonts.regular, 9, light ? rgb(1, 1, 1) : MUTED);
}

function drawFramedPhoto(page: PDFPage, loaded: Loaded | null, box: Box) {
  page.drawRectangle({ x: box.x, y: box.y, width: box.w, height: box.h, color: CARD, borderColor: FRAME, borderWidth: 0.75 });
  if (!loaded) return;
  const pad = 8;
  drawContainOriented(page, loaded, { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 });
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
  const blocks: BookPhoto[][] = [];
  for (let i = 0; i < photos.length; i += perPage) blocks.push(photos.slice(i, i + perPage));

  const gap = entries.length ? Math.max(1, Math.floor(blocks.length / (entries.length + 1))) : 0;
  let pageNo = 1;
  let ei = 0;
  for (let i = 0; i < blocks.length; i++) {
    await drawPhotoBlock(pdf, fonts, { template, W, H, photos: blocks[i], pageNo: pageNo++ });
    if (gap && ei < entries.length && (i + 1) % gap === 0) drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++], pageNo: pageNo++ });
  }
  while (ei < entries.length) drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++], pageNo: pageNo++ });

  return pdf.save();
}

function drawPolaroidCard(page: PDFPage, fonts: Fonts, loaded: Loaded | null, cardBox: Box, caption: string) {
  const b = cardBox.w * 0.055;
  const bottom = cardBox.w * 0.17;
  page.drawRectangle({ x: cardBox.x, y: cardBox.y, width: cardBox.w, height: cardBox.h, color: CARD, borderColor: FRAME, borderWidth: 0.75 });
  const photoBox: Box = { x: cardBox.x + b, y: cardBox.y + bottom, w: cardBox.w - b * 2, h: cardBox.h - bottom - b };
  page.drawRectangle({ x: photoBox.x, y: photoBox.y, width: photoBox.w, height: photoBox.h, color: rgb(0.93, 0.92, 0.9) });
  if (loaded) drawContainOriented(page, loaded, photoBox);
  if (caption) drawCentered(page, caption, cardBox.y + bottom / 2 - 5, fonts.italic, 13, INK, cardBox.w - b * 2);
}

async function drawCover(pdf: PDFDocument, fonts: Fonts, o: { title: string; template: Template; W: number; H: number; cover: BookPhoto | null }) {
  const page = pdf.addPage([o.W, o.H]);
  const loaded = o.cover ? await fetchImage(pdf, o.cover.url) : null;
  const cx = o.W / 2;

  if (o.template === "modern" || o.template === "magazine") {
    if (loaded) drawCoverOriented(page, loaded, o.W, o.H, o.cover?.focusX, o.cover?.focusY);
    else page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.15, 0.15, 0.18) });
    drawBottomScrim(page, o.W, o.H * 0.42);
    page.drawLine({ start: { x: cx - 34, y: 92 }, end: { x: cx + 34, y: 92 }, thickness: 1.2, color: ACCENT });
    drawCentered(page, o.title, 54, fonts.bold, 30, rgb(1, 1, 1), o.W - MARGIN * 2);
    return;
  }

  if (o.template === "collage") {
    if (loaded) drawCoverOriented(page, loaded, o.W, o.H, o.cover?.focusX, o.cover?.focusY);
    else page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: 96, color: CREAM });
    drawCentered(page, o.title, 96 / 2 - 6, fonts.bold, 28, INK, o.W - MARGIN * 2);
    return;
  }

  if (o.template === "polaroid") {
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: KRAFT });
    const cardW = Math.min(o.W - MARGIN * 2, (o.H - MARGIN * 2) * 0.82);
    const cardH = cardW / 0.82;
    drawPolaroidCard(page, fonts, loaded, { x: (o.W - cardW) / 2, y: (o.H - cardH) / 2, w: cardW, h: cardH }, o.title);
    return;
  }

  // classic
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
  drawFramedPhoto(page, loaded, { x: MARGIN, y: MARGIN + 96, w: o.W - MARGIN * 2, h: o.H - MARGIN * 2 - 96 });
  page.drawLine({ start: { x: cx - 40, y: MARGIN + 74 }, end: { x: cx + 40, y: MARGIN + 74 }, thickness: 1, color: ACCENT });
  drawCentered(page, o.title, MARGIN + 44, fonts.bold, 26, INK, o.W - MARGIN * 2);
}

async function drawPhotoBlock(pdf: PDFDocument, fonts: Fonts, o: { template: Template; W: number; H: number; photos: BookPhoto[]; pageNo: number }) {
  const page = pdf.addPage([o.W, o.H]);
  const photo = o.photos[0];

  if (o.template === "modern") {
    const loaded = await fetchImage(pdf, photo.url);
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.1, 0.1, 0.1) });
    if (loaded) drawCoverOriented(page, loaded, o.W, o.H, photo.focusX, photo.focusY);
    if (photo.caption) {
      drawBottomScrim(page, o.W, 90);
      page.drawText(truncate(photo.caption, fonts.regular, 13, o.W - MARGIN * 2), { x: MARGIN, y: 30, size: 13, font: fonts.regular, color: rgb(1, 1, 1) });
    }
    drawPageNumber(page, fonts, o.pageNo, true);
    return;
  }

  if (o.template === "magazine") {
    const loaded = await fetchImage(pdf, photo.url);
    const bandH = 132;
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.1, 0.1, 0.1) });
    if (loaded) drawCoverOriented(page, loaded, o.W, o.H, photo.focusX, photo.focusY);
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: bandH, color: CREAM });
    page.drawLine({ start: { x: MARGIN, y: bandH - 26 }, end: { x: MARGIN + 44, y: bandH - 26 }, thickness: 2, color: ACCENT });
    const cap = photo.caption || "Untitled";
    const lines = wrapText(cap, fonts.bold, 22, o.W - MARGIN * 2).slice(0, 2);
    let ty = bandH - 52;
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y: ty, size: 22, font: fonts.bold, color: INK });
      ty -= 26;
    }
    drawPageNumber(page, fonts, o.pageNo);
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
      const loaded = await fetchImage(pdf, o.photos[i].url);
      drawFramedPhoto(page, loaded, { x, y, w: cellW, h: cellH });
    }
    drawPageNumber(page, fonts, o.pageNo);
    return;
  }

  if (o.template === "polaroid") {
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: KRAFT });
    const loaded = await fetchImage(pdf, photo.url);
    const cardW = Math.min(o.W - MARGIN * 2, (o.H - MARGIN * 2) * 0.82);
    const cardH = cardW / 0.82;
    drawPolaroidCard(page, fonts, loaded, { x: (o.W - cardW) / 2, y: (o.H - cardH) / 2, w: cardW, h: cardH }, photo.caption);
    drawPageNumber(page, fonts, o.pageNo);
    return;
  }

  // classic
  const loaded = await fetchImage(pdf, photo.url);
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: CREAM });
  const capH = photo.caption ? 40 : 0;
  drawFramedPhoto(page, loaded, { x: MARGIN, y: MARGIN + capH, w: o.W - MARGIN * 2, h: o.H - MARGIN * 2 - capH });
  if (photo.caption) drawCentered(page, photo.caption, MARGIN + 14, fonts.italic, 13, MUTED, o.W - MARGIN * 2);
  drawPageNumber(page, fonts, o.pageNo);
}

function drawEntryPage(pdf: PDFDocument, fonts: Fonts, o: { W: number; H: number; entry: BookEntry; pageNo: number }) {
  const page = pdf.addPage([o.W, o.H]);
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.97, 0.955, 0.925) });
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
