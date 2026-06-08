-- Base de conocimiento corporativo
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  file_type  TEXT DEFAULT 'text',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_active ON public.knowledge_base(active);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No public access" ON public.knowledge_base;
CREATE POLICY "No public access" ON public.knowledge_base FOR ALL TO anon USING (false);

-- Añadir campos de tokens a audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER;
