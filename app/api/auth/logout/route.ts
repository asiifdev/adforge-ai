import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(`auth:logout:${clientIp(req)}`);
  if (limited) return limited;

  const cookie = clearAuthCookie();
  // Don't build the redirect target from req.url — behind the reverse proxy it
  // can reflect the internal bind address (0.0.0.0:3103) instead of the public
  // domain when Host/X-Forwarded-Host aren't forwarded correctly. The public
  // URL is already known and trusted via env, so use that instead.
  const res = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL), { status: 303 });
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
  return res;
}
