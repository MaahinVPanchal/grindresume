CREATE TABLE public.feature_allowance_usage (
 user_id uuid NOT NULL, kind text NOT NULL, period date NOT NULL, resource text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,kind,period,resource)
);
GRANT SELECT ON public.feature_allowance_usage TO authenticated;
GRANT ALL ON public.feature_allowance_usage TO service_role;
ALTER TABLE public.feature_allowance_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own feature usage" ON public.feature_allowance_usage FOR SELECT TO authenticated USING(user_id=auth.uid());
INSERT INTO public.feature_allowance_usage(user_id,kind,period,resource)
SELECT user_id,'upload',DATE '1970-01-01',original_path FROM public.resumes WHERE original_path IS NOT NULL ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.consume_feature_allowance(_user uuid,_kind text,_resource text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cap integer; p date; n integer;
BEGIN
 IF _kind='company' THEN cap:=5; p:=DATE '1970-01-01';
 ELSIF _kind='upload' THEN cap:=1; p:=DATE '1970-01-01';
 ELSE RAISE EXCEPTION 'Invalid allowance'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user::text||':'||_kind,0));
 SELECT count(*) INTO n FROM feature_allowance_usage WHERE user_id=_user AND kind=_kind AND period=p;
 IF EXISTS(SELECT 1 FROM feature_allowance_usage WHERE user_id=_user AND kind=_kind AND period=p AND resource=_resource) THEN RETURN greatest(0,cap-n); END IF;
 IF n>=cap THEN RETURN -1; END IF;
 INSERT INTO feature_allowance_usage(user_id,kind,period,resource) VALUES(_user,_kind,p,_resource);
 RETURN cap-n-1;
END $$;
REVOKE ALL ON FUNCTION public.consume_feature_allowance(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_feature_allowance(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.resume_upload_authorized(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM feature_allowance_usage WHERE user_id=auth.uid() AND kind='upload' AND resource=_path)
$$;
REVOKE ALL ON FUNCTION public.resume_upload_authorized(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resume_upload_authorized(text) TO authenticated;
CREATE POLICY "Require reserved resume upload" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'resumes' OR public.resume_upload_authorized(name));