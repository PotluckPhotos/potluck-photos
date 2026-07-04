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
  classic: { label: "Classic", description: "White pages, one photo centered with a caption below." },
  modern: { label: "Modern", description: "Full-bleed photos, captions over a dark bar." },
  collage: { label: "Collage", description: "Two photos per page for a denser scrapbook feel." },
};

const MARGIN = 40;

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

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

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = rgb(0.2, 0.2, 0.2), maxWidth?: number) {
  const w = page.getWidth();
  let str = text;
  if (maxWidth) {
    while (str.length > 1 && font.widthOfTextAtSize(str, size) > maxWidth) str = str.slice(0, -2) + "…";
  }
  const tw = font.widthOfTextAtSize(str, size);
  page.drawText(str, { x: (w - tw) / 2, y, size, font, color });
}

// Draws an image scaled to *contain* within a box (whole photo visible).
function drawContain(page: PDFPage, img: { width: number; height: number }, drawImg: () => void, box: { x: number; y: number; w: number; h: number }) {
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  return { x: box.x + (box.w - dw) / 2, y: box.y + (box.h - dh) / 2, width: dw, height: dh, drawImg };
}

// Cover-crop values (image fills box; overflow is clipped by the page bounds).
// Positions by focal point (fx/fy percent from top-left). fy is flipped because
// pdf-lib's origin is bottom-left.
function coverDims(img: { width: number; height: number }, W: number, H: number, fx = 50, fy = 50) {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  return { x: (W - dw) * (fx / 100), y: (H - dh) * (1 - fy / 100), width: dw, height: dh };
}

export async function generateBook(
  opts: {
    title: string;
    template: Template;
    size: BookSize;
    cover: BookPhoto | null;
    photos: BookPhoto[];
    entries: BookEntry[];
  }
): Promise<Uint8Array> {
  const { title, template, size, cover, photos, entries } = opts;
  const { width: W, height: H } = size;
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  await drawCover(pdf, fonts, { title, template, W, H, cover });

  // Group photos per page, then evenly distribute guest entries between blocks.
  const perPage = template === "collage" ? 2 : 1;
  const photoBlocks: BookPhoto[][] = [];
  for (let i = 0; i < photos.length; i += perPage) photoBlocks.push(photos.slice(i, i + perPage));

  const gap = entries.length ? Math.max(1, Math.floor(photoBlocks.length / (entries.length + 1))) : 0;
  let ei = 0;
  for (let i = 0; i < photoBlocks.length; i++) {
    await drawPhotoBlock(pdf, fonts, { template, W, H, photos: photoBlocks[i] });
    if (gap && ei < entries.length && (i + 1) % gap === 0) {
      drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++] });
    }
  }
  while (ei < entries.length) drawEntryPage(pdf, fonts, { W, H, entry: entries[ei++] });

  return pdf.save();
}

async function drawCover(pdf: PDFDocument, fonts: Fonts, o: { title: string; template: Template; W: number; H: number; cover: BookPhoto | null }) {
  const page = pdf.addPage([o.W, o.H]);
  const img = o.cover ? await fetchImage(pdf, o.cover.url) : null;

  if (o.template === "classic") {
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(1, 1, 1) });
    if (img) {
      const d = drawContain(page, img, () => {}, { x: MARGIN, y: MARGIN + 70, w: o.W - MARGIN * 2, h: o.H - MARGIN * 2 - 70 });
      page.drawImage(img, d);
    }
    drawCentered(page, o.title, MARGIN + 28, fonts.bold, 26, rgb(0.1, 0.1, 0.1), o.W - MARGIN * 2);
  } else {
    // modern + collage: full-bleed cover photo with title over a dark bar.
    if (img) page.drawImage(img, coverDims(img, o.W, o.H, o.cover?.focusX, o.cover?.focusY));
    else page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.15, 0.15, 0.18) });
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: 110, color: rgb(0, 0, 0), opacity: 0.45 });
    drawCentered(page, o.title, 46, fonts.bold, 28, rgb(1, 1, 1), o.W - MARGIN * 2);
  }
}

async function drawPhotoBlock(pdf: PDFDocument, fonts: Fonts, o: { template: Template; W: number; H: number; photos: BookPhoto[] }) {
  const page = pdf.addPage([o.W, o.H]);

  if (o.template === "modern") {
    const photo = o.photos[0];
    const img = await fetchImage(pdf, photo.url);
    page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.1, 0.1, 0.1) });
    if (img) page.drawImage(img, coverDims(img, o.W, o.H, photo.focusX, photo.focusY));
    if (photo.caption) {
      page.drawRectangle({ x: 0, y: 0, width: o.W, height: 52, color: rgb(0, 0, 0), opacity: 0.4 });
      page.drawText(truncate(photo.caption, fonts.regular, 13, o.W - MARGIN * 2), { x: MARGIN, y: 20, size: 13, font: fonts.regular, color: rgb(1, 1, 1) });
    }
    return;
  }

  // classic (1 photo) and collage (up to 2 photos): white page, contained photos.
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(1, 1, 1) });
  const count = o.photos.length;
  const slotH = (o.H - MARGIN * 2 - (count - 1) * 16) / count;

  for (let i = 0; i < count; i++) {
    const photo = o.photos[i];
    const img = await fetchImage(pdf, photo.url);
    const slotY = o.H - MARGIN - (i + 1) * slotH - i * 16;
    const capH = photo.caption ? 22 : 0;
    if (img) {
      const d = drawContain(page, img, () => {}, { x: MARGIN, y: slotY + capH, w: o.W - MARGIN * 2, h: slotH - capH });
      page.drawImage(img, d);
    }
    if (photo.caption) {
      drawCentered(page, photo.caption, slotY + 4, fonts.regular, 11, rgb(0.35, 0.35, 0.35), o.W - MARGIN * 2);
    }
  }
}

function drawEntryPage(pdf: PDFDocument, fonts: Fonts, o: { W: number; H: number; entry: BookEntry }) {
  const page = pdf.addPage([o.W, o.H]);
  page.drawRectangle({ x: 0, y: 0, width: o.W, height: o.H, color: rgb(0.97, 0.96, 0.93) });

  const size = 18;
  const maxWidth = o.W - MARGIN * 3;
  const lines = wrapText(`“${o.entry.body}”`, fonts.italic, size, maxWidth);
  const lineHeight = size * 1.5;
  const blockHeight = lines.length * lineHeight;
  let y = o.H / 2 + blockHeight / 2;

  for (const line of lines) {
    const tw = fonts.italic.widthOfTextAtSize(line, size);
    page.drawText(line, { x: (o.W - tw) / 2, y, size, font: fonts.italic, color: rgb(0.25, 0.22, 0.2) });
    y -= lineHeight;
  }
  drawCentered(page, `— ${o.entry.author}`, y - 8, fonts.regular, 13, rgb(0.45, 0.42, 0.4), maxWidth);
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let str = text;
  while (str.length > 1 && font.widthOfTextAtSize(str, size) > maxWidth) str = str.slice(0, -2) + "…";
  return str;
}
