-- Create promotions table
create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  source_tab text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS (Row Level Security)
alter table public.promotions enable row level security;

-- Add RLS Policies
create policy "Allow anyone to view promotions."
  on public.promotions for select
  using ( true );

create policy "Allow anyone to insert promotions."
  on public.promotions for insert
  with check ( true );
