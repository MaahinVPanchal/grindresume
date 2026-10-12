CREATE TABLE public.user_api_keys (
  user_id uuid PRIMARY KEY,
  tavily text NOT NULL DEFAULT '',
  nebius text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_keys TO authenticated;
GRANT ALL ON public.user_api_keys TO service_role;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keys select" ON public.user_api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own keys insert" ON public.user_api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own keys update" ON public.user_api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own keys delete" ON public.user_api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);