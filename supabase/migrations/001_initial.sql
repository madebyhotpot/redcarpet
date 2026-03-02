-- result_type enum
create type result_type_enum as enum ('image', 'video');

-- effects table
create table effects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  preview_image_url text not null
);

-- shots table
create table shots (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  effect_id uuid not null references effects(id),
  result_url text,
  result_type result_type_enum,
  created_at timestamptz not null default now()
);
