-- ============================================================
-- VAULTX — Migration 023: Fix Cross-Tenant Submission Modification
-- ============================================================

drop policy if exists "Triagers and org owners can update submissions" on submissions;

create policy "Triagers and org owners can update submissions"
  on submissions for update using (
    program_id in (
      select p.id from programs p
      join organizations o on o.id = p.org_id
      where o.owner_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      join programs prog on prog.org_id = p.org_id
      where p.id = auth.uid() 
        and p.role in ('triager', 'admin') 
        and prog.id = submissions.program_id
    )
  );
