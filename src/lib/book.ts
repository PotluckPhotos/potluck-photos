import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type BookPhoto = { url: string; caption: string };
export type BookSize = { label: string; width: number; height: number };

// Sizes in PDF points (72 pt = 1 inch).
export const BOOK_SIZES: Record<string, BookSize> = {
  "8x8": { label: '8" × 8" square', width: 576, height: 576 },
  "8x10": { label: '8" × 10" portrait', width: 576, height: 720 },
  "10x10": { label: '10" × 10" large square', width: 720, height: 720 },
};

const MARGIN = 36; // 0.5"
const CAPTION_AREA = 44;

function detectImageType(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return null;
}

export async function generateBook(
  photos: BookPhoto[],
  title: string,
  size: BookSize
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Cover page.
  const cover = pdf.addPage([size.width, size.height]);
  const coverSize = 28;
  const titleWidth = titleFont.widthOfTextAtSize(title, coverSize);
  cover.drawText(title, {
    x: Math.max(MARGIN, (size.width - titleWidth) / 2),
    y: size.height / 2,
    size: coverSize,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  for (const photo of photos) {
    const page = pdf.addPage([size.width, size.height]);

    let bytes: Uint8Array;
    try {
      const res = await fetch(photo.url);
      if (!res.ok) continue;
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      continue; // skip a photo that can't be fetched rather than fail the book
    }

    const type = detectImageType(bytes);
    if (!type) continue; // unsupported format (e.g. HEIC) — skip
    const image = type === "jpg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);

    const boxW = size.width - MARGIN * 2;
    const boxH = size.height - MARGIN * 2 - CAPTION_AREA;
    const scale = Math.min(boxW / image.width, boxH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;

    page.drawImage(image, {
      x: (size.width - drawW) / 2,
      y: size.height - MARGIN - drawH,
      width: drawW,
      height: drawH,
    });

    if (photo.caption) {
      const capSize = 11;
      const capWidth = font.widthOfTextAtSize(photo.caption, capSize);
      page.drawText(photo.caption, {
        x: Math.max(MARGIN, (size.width - capWidth) / 2),
        y: MARGIN + CAPTION_AREA / 2,
        size: capSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  return pdf.save();
}
