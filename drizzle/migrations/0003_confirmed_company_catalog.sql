ALTER TABLE public.shared_companies ADD COLUMN website text, ADD COLUMN logo_url text NOT NULL DEFAULT '', ADD COLUMN one_liner text NOT NULL DEFAULT '', ADD COLUMN industry text NOT NULL DEFAULT '', ADD COLUMN location text NOT NULL DEFAULT '', ADD COLUMN confirmed_at timestamptz;
ALTER TABLE public.shared_companies ADD CONSTRAINT shared_company_website CHECK (website IS NULL OR (char_length(website) <= 253 AND website ~ '^https://[a-z0-9][a-z0-9.-]+[a-z0-9]/$'));
ALTER TABLE public.shared_companies ADD CONSTRAINT shared_company_details CHECK (char_length(one_liner) <= 300 AND char_length(industry) <= 80 AND char_length(location) <= 100 AND char_length(logo_url) <= 500);
CREATE OR REPLACE FUNCTION public.community_catalog() RETURNS TABLE(name text, people integer, website text, logo_url text, one_liner text, industry text, location text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH confirmed AS (
 SELECT c.* FROM public.shared_companies c JOIN public.company_sharing s ON s.user_id=c.user_id AND s.share WHERE c.confirmed_at IS NOT NULL AND c.website IS NOT NULL
), counts AS (SELECT c.website, count(DISTINCT c.user_id)::integer people FROM confirmed c GROUP BY c.website), details AS (SELECT DISTINCT ON (c.website) c.* FROM confirmed c ORDER BY c.website, c.confirmed_at DESC, c.name_key)
SELECT d.display_name, n.people, d.website, d.logo_url, d.one_liner, d.industry, d.location FROM details d JOIN counts n ON n.website=d.website ORDER BY n.people DESC, d.display_name LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.community_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_catalog() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.community_companies() RETURNS TABLE(name text, people integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT c.name, c.people FROM public.community_catalog() c $$;
COMMENT ON FUNCTION public.community_companies() IS 'DEPRECATED: use community_catalog for confirmed website and card details';