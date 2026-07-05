-- ============================================================
-- VAULTX — Migration 019: Custom Reporting Builder (Core)
-- ============================================================

create table report_templates (
  id            uuid        primary key default uuid_generate_v4(),
  org_id        uuid        not null references organizations(id) on delete cascade,
  created_by    uuid        not null references profiles(id) on delete set null,
  name          text        not null,
  config        jsonb       not null, -- {metrics, chartType, filters, dateRange, comparisonMode}
  is_embeddable boolean     not null default false,
  embed_token   text        unique,   -- set only when is_embeddable is toggled on
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index report_templates_org_id_idx on report_templates(org_id);
create unique index report_templates_embed_token_idx on report_templates(embed_token) where embed_token is not null;

alter table report_templates enable row level security;

create policy "Org members manage their own report templates"
  on report_templates for all
  using (org_id in (select org_id from profiles where id = auth.uid())
         or org_id in (select id from organizations where owner_id = auth.uid()))
  with check (org_id in (select org_id from profiles where id = auth.uid())
         or org_id in (select id from organizations where owner_id = auth.uid()));

-- Public embed access is intentionally NOT an RLS policy on this table —
-- the embed route (app/r/[token]/page.tsx) uses the admin client and
-- looks up by embed_token directly, since anonymous visitors have no
-- auth.uid() to match against org membership. is_embeddable is the gate.

create table scheduled_reports (
  id              uuid        primary key default uuid_generate_v4(),
  template_id     uuid        not null references report_templates(id) on delete cascade,
  frequency       text        not null check (frequency in ('weekly', 'monthly')),
  recipient_emails text[]     not null default '{}',
  last_sent_at    timestamptz,
  created_by      uuid        references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table scheduled_reports enable row level security;

create policy "Org members manage their own scheduled reports"
  on scheduled_reports for all
  using (template_id in (select id from report_templates where org_id in (
    select org_id from profiles where id = auth.uid())
    or org_id in (select id from organizations where owner_id = auth.uid())
  ));
