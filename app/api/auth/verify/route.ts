import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyMagicToken, createSessionToken, logAudit } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=token_missing", req.url)
    );
  }

  const payload = await verifyMagicToken(token);
  if (!payload) {
    return NextResponse.redirect(
      new URL("/auth/login?error=token_invalid", req.url)
    );
  }

  const db = getServiceClient();
  const { data: user } = await db
    .from("users")
    .select("id, role, active")
    .eq("email", payload.email)
    .single();

  if (!user || !user.active) {
    return NextResponse.redirect(
      new URL("/auth/login?error=access_denied", req.url)
    );
  }

  // Actualizar last_seen
  await db
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  await logAudit(user.id, "login", {
    ip: req.headers.get("x-forwarded-for") || "unknown",
  });

  const sessionToken = await createSessionToken(user.id, user.role);

  const response = NextResponse.redirect(new URL("/chat", req.url));
  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}
