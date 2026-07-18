-- ============================================================
-- VAULTX — Migration 002: Fuzzy duplicate detection function
-- Run AFTER 001_initial.sql
-- ============================================================

-- pg_trgm fuzzy match function for Stage 2 duplicate detection
-- Returns submissions in the same program with similarity > threshold
create or replace function find_similar_submissions(
  p_program_id  uuid,
  p_title       text,
  p_description text,
  p_threshold   float default 0.4
)
returns table (
  id            uuid,
  title         text,
  title_sim     float,
  desc_sim      float,
  combined_sim  float
)
language sql stable security definer
set search_path = public
as $$
  select
    s.id,
    s.title,
    similarity(s.title, p_title)                              as title_sim,
    similarity(s.description, p_description)                  as desc_sim,
    (similarity(s.title, p_title) * 0.6 +
     similarity(s.description, p_description) * 0.4)         as combined_sim
  from submissions s
  where
    s.program_id = p_program_id
    and s.status not in ('rejected', 'wont_fix')
    and (
      similarity(s.title, p_title) > p_threshold
      or similarity(s.description, p_description) > p_threshold
    )
  order by combined_sim desc
  limit 5;
$$;

-- Add Supabase storage bucket for attachments
-- (Run this in Supabase dashboard Storage section OR via API)
-- bucket name: attachments, public: false, max file size: 2MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  2097152,  -- 2MB
  array['image/png','image/jpeg','image/gif','image/webp','application/pdf','text/plain','video/mp4']
)
on conflict (id) do nothing;

-- RLS for storage: researchers can upload to their own folder
drop policy if exists "Researchers can upload attachments" on storage.objects;
create policy "Researchers can upload attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid()::text = (string_to_array(storage.objects.name, '/'))[1]
  );

drop policy if exists "Submission owners and org can read attachments" on storage.objects;
create policy "Submission owners and org can read attachments"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (
      auth.uid()::text = (string_to_array(storage.objects.name, '/'))[1]
      or exists (
        select 1 from submissions s
        join programs p on p.id = s.program_id
        join organizations o on o.id = p.org_id
        where s.id::text = (string_to_array(storage.objects.name, '/'))[2]
          and o.owner_id = auth.uid()
      )
    )
  );
