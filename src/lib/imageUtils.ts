/**
 * Compresses an image to a maximum dimension while maintaining aspect ratio.
 * @param base64Str The original base64 image string.
 * @param maxDimension The maximum width or height.
 * @param quality The JPEG quality (0 to 1).
 * @returns A promise that resolves to the compressed base64 string.
 */
export async function compressImage(base64Str: string, maxDimension: number = 1600, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
    img.src = base64Str;
  });
}
