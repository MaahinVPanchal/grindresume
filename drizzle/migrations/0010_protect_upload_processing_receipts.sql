ALTER TABLE public.feature_allowance_usage ADD COLUMN own_key boolean NOT NULL DEFAULT false;
ALTER TABLE public.feature_allowance_usage ADD COLUMN processing_claimed boolean NOT NULL DEFAULT false;