// Re-encodes an oversized image as JPEG until it fits. Returns the original file if it can't.
export async function fitImage(file, maxBytes) {
  if (file.size <= maxBytes) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    let scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    for (const quality of [0.85, 0.7, 0.55]) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= maxBytes) {
        bitmap.close();
        return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
      scale *= 0.8;
    }
    bitmap.close();
  } catch { /* Fall through: the size check will report it. */ }
  return file;
}

// "image.jpg" taken -> "image-2.jpg"
export function uniqueName(file, taken) {
  if (!taken.has(file.name)) return file;
  const dot = file.name.lastIndexOf('.');
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : '';
  let n = 2;
  while (taken.has(`${base}-${n}${ext}`)) n++;
  return new File([file], `${base}-${n}${ext}`, { type: file.type });
}