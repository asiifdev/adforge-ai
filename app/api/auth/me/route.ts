import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(`auth:me:${clientIp(req)}`);
  if (limited) return limited;

  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  });
}
