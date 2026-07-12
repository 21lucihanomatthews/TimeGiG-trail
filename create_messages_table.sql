-- Create messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false,
  reactions jsonb default '{}'::jsonb
);

-- Set up RLS
alter table public.messages enable row level security;

-- Add RLS Policies
create policy "Users can view their messages."
  on public.messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can send messages."
  on public.messages for insert
  with check ( auth.uid() = sender_id );
