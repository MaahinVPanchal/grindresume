CREATE TABLE public.demo_usage (
  bucket text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  kind text NOT NULL,
  used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, day, kind)
);
GRANT ALL ON public.demo_usage TO service_role;
ALTER TABLE public.demo_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.demo_consume(_bucket text, _kind text, _limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO demo_usage(bucket, day, kind, used) VALUES (_bucket, current_date, _kind, 1)
  ON CONFLICT (bucket, day, kind) DO UPDATE SET used = demo_usage.used + 1
  WHERE demo_usage.used < _limit
  RETURNING used INTO n;
  IF n IS NULL THEN RETURN -1; END IF;
  RETURN _limit - n;
END $$;

CREATE OR REPLACE FUNCTION public.demo_used(_bucket text, _kind text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT used FROM demo_usage WHERE bucket=_bucket AND day=current_date AND kind=_kind), 0)
$$;

REVOKE ALL ON FUNCTION public.demo_consume(text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demo_used(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_consume(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.demo_used(text,text) TO service_role;