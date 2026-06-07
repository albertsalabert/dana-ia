import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type UserRole = "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Cliente con service role para operaciones de servidor (admin)
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Cliente para server components con cookies
export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        },
      },
    }
  );
}
