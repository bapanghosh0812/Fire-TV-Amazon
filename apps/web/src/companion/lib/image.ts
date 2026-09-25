/**
 * Prepares a photo of a drawing for upload: fixes orientation, scales it
 * down to at most 1280px, and re-encodes to JPEG. Re-encoding through a
 * canvas also strips EXIF metadata such as GPS location — important when the
 * photo is taken in a child's home.
 */
export async function prepareDrawing(file: File, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // Centre-crop to a square: the hero card and illustrator both expect 1:1.
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(bitmap, (side - w) / 2, (side - h) / 2, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process photo'))), 'image/jpeg', 0.88),
  );
}
