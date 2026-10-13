create or replace function public.admin_storage() returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'tables', (select coalesce(jsonb_agg(jsonb_build_object('name', t, 'bytes', pg_total_relation_size(('public.'||t)::regclass)) order by t),'[]')
      from unnest(array['chat_interactions','search_history','role_assessments','resumes','resume_versions','saved_roles','application_research','shared_companies','user_api_keys']) t),
    'files_bytes', (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects),
    'files_count', (select count(*) from storage.objects)
  );
end $$;
revoke all on function public.admin_storage() from public, anon;
grant execute on function public.admin_storage() to authenticated;

create or replace function public.admin_dataset() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'chats', (select coalesce(jsonb_agg(jsonb_build_object('context', context, 'messages', messages) order by created_at),'[]') from chat_interactions),
    'quizzes', (select coalesce(jsonb_agg(jsonb_build_object('company',company,'role',role,'questions',questions,'answers',answers,'score',score,'feedback',feedback)),'[]') from role_assessments where submitted_at is not null)
  );
end $$;
revoke all on function public.admin_dataset() from public, anon;
grant execute on function public.admin_dataset() to authenticated;