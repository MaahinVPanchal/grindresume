CREATE TABLE public.chat_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'chat',
  company text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT '',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_interactions TO authenticated;
GRANT ALL ON public.chat_interactions TO service_role;
ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chat interactions" ON public.chat_interactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX chat_interactions_user_idx ON public.chat_interactions (user_id, created_at DESC);