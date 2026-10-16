import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Rate Limiting for sensitive API paths
  if (pathname.startsWith("/api/auth/")) {
    const rateCheck = checkRateLimit(`auth:${ip}`, 30, 60); // 30 per min
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
          },
        }
      );
    }
  }

  if (pathname.startsWith("/api/checkout") || pathname.startsWith("/api/payments")) {
    const rateCheck = checkRateLimit(`checkout:${ip}`, 40, 60); // 40 per min
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many payment requests. Please wait before retrying." },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
          },
        }
      );
    }
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/checkout/:path*",
    "/api/payments/:path*",
  ],
};
