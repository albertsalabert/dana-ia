import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getServiceClient } from "./supabase";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default-secret-change-in-production-32ch"
);

const SESSION_EXPIRY = 60 * 60 * 8; // 8 horas

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") throw new Error("Forbidden");
  return session;
}

export async function logAudit(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getServiceClient();
  const row: Record<string, unknown> = {
    user_id: userId,
    action,
    metadata,
    created_at: new Date().toISOString(),
  };
  // Guardar tokens como columnas propias si están presentes
  if (typeof metadata.input_tokens === "number") row.input_tokens = metadata.input_tokens;
  if (typeof metadata.output_tokens === "number") row.output_tokens = metadata.output_tokens;
  if (typeof metadata.cache_read_tokens === "number") row.cache_read_tokens = metadata.cache_read_tokens;

  const { error } = await db.from("audit_logs").insert(row);
  if (error) console.error("logAudit error:", error.message);
}
