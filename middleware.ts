import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default-secret-change-in-production-32ch"
);

const PUBLIC_PATHS = ["/auth/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Permitir rutas públicas
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Redirigir raíz al chat
  if (path === "/") {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  const token = req.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    if (payload.type !== "session") {
      throw new Error("Invalid token type");
    }

    // Proteger rutas de admin
    if (path.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/chat", req.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
