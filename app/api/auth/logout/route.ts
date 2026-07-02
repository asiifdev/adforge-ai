import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(`auth:logout:${clientIp(req)}`);
  if (limited) return limited;

  const cookie = clearAuthCookie();
  const res = NextResponse.json({ success: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
  return res;
}
