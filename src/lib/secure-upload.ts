/**
 * Secure File Upload Validation & Path Traversal Prevention
 */

export interface FileValidationResult {
  valid: boolean;
  sanitizedFilename?: string;
  error?: string;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageUpload(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  buffer?: Buffer | Uint8Array
): FileValidationResult {
  // 1. File size check
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File exceeds the maximum permitted size of 5MB" };
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { valid: false, error: "Invalid image format. Allowed: JPEG, PNG, WEBP" };
  }

  // 3. Extension check
  const parts = filename.split(".");
  const ext = parts.pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: "Disallowed file extension" };
  }

  // 4. Magic bytes verification (if buffer available)
  if (buffer && buffer.length >= 4) {
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // WEBP container

    if (!isPng && !isJpg && !isRiff) {
      return { valid: false, error: "File header does not match expected image format signature" };
    }
  }

  // 5. Sanitize filename: avoid path traversal (../, ..\, null bytes)
  const safeRandomId = Math.random().toString(36).substring(2, 10);
  const sanitizedFilename = `img_${Date.now()}_${safeRandomId}.${ext}`;

  return {
    valid: true,
    sanitizedFilename,
  };
}
