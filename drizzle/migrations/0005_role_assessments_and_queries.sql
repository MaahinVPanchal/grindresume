CREATE TABLE public.role_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 company text NOT NULL DEFAULT '',
 role text NOT NULL DEFAULT '',
 job_url text NOT NULL DEFAULT '',
 resume_id uuid,
 questions jsonb NOT NULL DEFAULT '[]'::jsonb,
 answers jsonb NOT NULL DEFAULT '[]'::jsonb,
 score integer,
 feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_assessments TO authenticated;
GRANT ALL ON public.role_assessments TO service_role;
ALTER TABLE public.role_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessments" ON public.role_assessments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.search_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 kind text NOT NULL DEFAULT 'chat',
 query text NOT NULL,
 company text NOT NULL DEFAULT '',
 urls jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own history" ON public.search_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());