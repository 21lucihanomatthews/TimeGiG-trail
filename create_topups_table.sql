-- SQL Migration to create/fix topups table, add missing columns, and set up correct RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Create topups table if it doesn't exist
create table if not exists public.topups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  status text default 'Pending' not null,
  proof_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add updated_at column to public.topups in case the table already exists but lacks it
alter table public.topups add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 3. Enable Row Level Security (RLS)
alter table public.topups enable row level security;

-- 4. Drop existing policies to prevent conflicts
drop policy if exists "Users can insert their own topups" on public.topups;
drop policy if exists "Users can view their own topups" on public.topups;
drop policy if exists "Allow authenticated users to view topups" on public.topups;
drop policy if exists "Allow admin to view all topups" on public.topups;
drop policy if exists "Allow admin to update topups" on public.topups;
drop policy if exists "Admins can update topups" on public.topups;
drop policy if exists "Admins can view all topups" on public.topups;

-- 5. Create new secure, correct RLS policies

-- Allow users to insert their own topups
create policy "Users can insert their own topups"
  on public.topups for insert
  to authenticated
  with check ( auth.uid() = user_id );

-- Allow users to view only their own topups (important for privacy)
create policy "Users can view their own topups"
  on public.topups for select
  to authenticated
  using ( auth.uid() = user_id );

-- Allow admin to view ALL topups
create policy "Admins can view all topups"
  on public.topups for select
  to authenticated
  using ( auth.jwt() ->> 'email' = '21lucihanomatthews@gmail.com' );

-- Allow admin specifically to update topup status
create policy "Admins can update topups"
  on public.topups for update
  to authenticated
  using ( auth.jwt() ->> 'email' = '21lucihanomatthews@gmail.com' )
  with check ( auth.jwt() ->> 'email' = '21lucihanomatthews@gmail.com' );
