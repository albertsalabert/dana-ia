-- ============================================================
-- DANA-IA: Esquema de base de datos
-- Compatible con RGPD: no se almacena contenido de conversaciones
-- ============================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);

-- Tabla de logs de auditoría (sin contenido de mensajes)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de recrearlas
DROP POLICY IF EXISTS "No public access" ON public.users;
DROP POLICY IF EXISTS "No public access" ON public.audit_logs;

-- Política: ningún acceso público directo
CREATE POLICY "No public access" ON public.users FOR ALL TO anon USING (false);
CREATE POLICY "No public access" ON public.audit_logs FOR ALL TO anon USING (false);

-- ============================================================
-- INSERTAR PRIMER ADMINISTRADOR
-- Reemplaza el email con el del administrador real
-- ============================================================
INSERT INTO public.users (email, name, role, active)
VALUES ('admin@tuempresa.com', 'Administrador', 'admin', true)
ON CONFLICT (email) DO NOTHING;
