import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(`auth:login:${clientIp(req)}`);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing fields" } },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } },
        { status: 401 }
      );
    }

    const token = await signToken(user.id);
    const cookie = setAuthCookie(token);

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    logError("POST /api/auth/login", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Login failed" } },
      { status: 500 }
    );
  }
}
