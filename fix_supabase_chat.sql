-- Drop existing tables and policies to ensure columns and schemas are reset correctly
drop table if exists public.friendships cascade;
drop table if exists public.friend_requests cascade;

-- Create friendships table
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id1 uuid references public.profiles(id) not null,
  user_id2 uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create friend_requests table
create table public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

-- Add RLS Policies for friendships
create policy "Users can view their friendships."
  on public.friendships for select
  using ( auth.uid() = user_id1 or auth.uid() = user_id2 );

create policy "Users can insert friendships."
  on public.friendships for insert
  with check ( auth.uid() = user_id1 or auth.uid() = user_id2 );

-- Add RLS Policies for friend requests
create policy "Users can view their friend requests."
  on public.friend_requests for select
  using ( auth.uid() = receiver_id );

create policy "Users can send friend requests."
  on public.friend_requests for insert
  with check ( auth.uid() = sender_id );


-- Ensure storage bucket "avatars" exists and is public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Allow public read access to objects in avatars bucket
create policy "Allow public read access to avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
create policy "Allow authenticated upload of avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Allow users to update their own avatars
create policy "Allow users to update their own avatars"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- Allow users to delete their own avatars
create policy "Allow users to delete their own avatars"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );


