/**
 * CDN & Image Optimization Helper
 */

export function getOptimizedImageUrl(
  url?: string | null,
  width: number = 800,
  quality: number = 80
): string {
  if (!url) return "/placeholder-event.jpg";

  // Unsplash dynamic compression params
  if (url.includes("images.unsplash.com")) {
    const cleanUrl = url.split("?")[0];
    return `${cleanUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  return url;
}

/**
 * Generates an ultra-lightweight inline SVG shimmer placeholder
 */
export function getShimmerDataUrl(w: number = 700, h: number = 475): string {
  const shimmerSvg = `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f3f4f6" offset="20%" />
          <stop stop-color="#e5e7eb" offset="50%" />
          <stop stop-color="#f3f4f6" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f3f4f6" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    </svg>`;

  if (typeof window === "undefined") {
    return `data:image/svg+xml;base64,${Buffer.from(shimmerSvg).toString("base64")}`;
  }
  return `data:image/svg+xml;base64,${btoa(shimmerSvg)}`;
}
