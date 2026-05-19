/**
 * Compress an image File to a base64 JPEG string.
 * @param file     The image file to compress
 * @param maxPx    Max width/height in pixels (default 800 for docs, 200 for avatars)
 * @param quality  JPEG quality 0–1 (default 0.8)
 */
export function compressImage(file: File, maxPx = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = objectUrl;
  });
}
