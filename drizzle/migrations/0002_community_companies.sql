CREATE TABLE public.company_sharing (user_id uuid PRIMARY KEY DEFAULT auth.uid(), share boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_sharing TO authenticated;
GRANT ALL ON public.company_sharing TO service_role;
ALTER TABLE public.company_sharing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sharing choice" ON public.company_sharing FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE TABLE public.shared_companies (user_id uuid NOT NULL DEFAULT auth.uid(), name_key text NOT NULL, display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, name_key), CHECK (char_length(display_name) BETWEEN 2 AND 80));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_companies TO authenticated;
GRANT ALL ON public.shared_companies TO service_role;
ALTER TABLE public.shared_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shared companies" ON public.shared_companies FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- Public, anonymous aggregate: company name and how many opted-in people listed it. Never exposes who.
CREATE OR REPLACE FUNCTION public.community_companies()
RETURNS TABLE(name text, people integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT min(c.display_name) AS name, count(DISTINCT c.user_id)::int AS people
  FROM public.shared_companies c
  JOIN public.company_sharing s ON s.user_id = c.user_id AND s.share
  GROUP BY c.name_key
  ORDER BY people DESC, name
  LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.community_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_companies() TO anon, authenticated;