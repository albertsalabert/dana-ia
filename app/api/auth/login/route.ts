import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyPassword, createSessionToken, logAudit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const db = getServiceClient();
    const { data: user } = await db
      .from("users")
      .select("id, role, active, password_hash")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!user || !user.active || !user.password_hash) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    await db.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    await logAudit(user.id, "login", { ip: req.headers.get("x-forwarded-for") || "unknown" });

    const sessionToken = await createSessionToken(user.id, user.role);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
