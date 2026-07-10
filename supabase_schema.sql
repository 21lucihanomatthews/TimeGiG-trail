-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  status text default 'Active', -- 'Active' or 'Verified'
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create topups table
create table public.topups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create referrals table
create table public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) not null,
  referred_id uuid references public.profiles(id) not null,
  status text default 'Pending', -- 'Pending', 'Completed'
  reward_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(referred_id)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.topups enable row level security;
alter table public.referrals enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Policies for topups
create policy "Topups are viewable by everyone."
  on topups for select
  using ( true );

-- Policies for referrals
create policy "Referrals are viewable by everyone."
  on referrals for select
  using ( true );

create policy "Users can insert referrals."
  on referrals for insert
  with check ( true );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create friendships table
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id1 uuid references public.profiles(id) not null,
  user_id2 uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create friend_requests table
create table if not exists public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

create policy "Users can view their friendships."
  on friendships for select
  using ( auth.uid() = user_id1 or auth.uid() = user_id2 );

create policy "Users can insert friendships."
  on friendships for insert
  with check ( auth.uid() = user_id1 or auth.uid() = user_id2 );

create policy "Users can view their friend requests."
  on friend_requests for select
  using ( auth.uid() = receiver_id );

create policy "Users can send friend requests."
  on friend_requests for insert
  with check ( auth.uid() = sender_id );
