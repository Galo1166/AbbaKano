create table if not exists price_overrides (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  plan_code text not null,
  price numeric not null,
  enabled boolean not null default true,
  label text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table price_overrides add column if not exists enabled boolean not null default true;
alter table price_overrides add column if not exists label text;

create unique index if not exists price_overrides_provider_plan_code_idx on price_overrides(provider, plan_code);
