import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getServiceClient } from "./supabase";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default-secret-change-in-production-32ch"
);

const MAGIC_LINK_EXPIRY = 60 * 15; // 15 minutos
const SESSION_EXPIRY = 60 * 60 * 8; // 8 horas

export async function createMagicToken(email: string): Promise<string> {
  return new SignJWT({ email, type: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAGIC_LINK_EXPIRY}s`)
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyMagicToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== "magic" || typeof payload.email !== "string") {
      return null;
    }
    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function createSessionToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_EXPIRY}s`)
    .setIssuedAt()
    .sign(SECRET);
}

export async function getSession(): Promise<{
  userId: string;
  role: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (
      payload.type !== "session" ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function updateLastSeen(userId: string) {
  const db = getServiceClient();
  await db
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function logAudit(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getServiceClient();
  await db.from("audit_logs").insert({
    user_id: userId,
    action,
    metadata,
    created_at: new Date().toISOString(),
  });
}
