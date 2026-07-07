-- Run this file in the Supabase SQL Editor for your project.
-- The frontend never accesses this table directly; only the server-side service role does.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  customer_name text not null,
  phone text not null,
  booking_date date not null,
  booking_time time without time zone not null,
  guests integer not null,
  special_request text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_booking_id_format check (booking_id ~ '^BK-[0-9]{8}-[A-F0-9]{8}$'),
  constraint bookings_name_length check (char_length(customer_name) between 2 and 80),
  constraint bookings_phone_length check (char_length(phone) between 7 and 20),
  constraint bookings_guest_range check (guests between 1 and 20),
  constraint bookings_request_length check (char_length(special_request) <= 500),
  constraint bookings_service_hours check (booking_time >= time '10:00' and booking_time <= time '23:59'),
  constraint bookings_status_values check (status in ('Pending', 'Confirmed', 'Cancelled'))
);

create index if not exists bookings_service_date_idx
  on public.bookings (booking_date, booking_time);

create index if not exists bookings_status_idx
  on public.bookings (status);

create or replace function public.set_bookings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_bookings_updated_at();

alter table public.bookings enable row level security;
alter table public.bookings force row level security;

-- No policies are intentionally created for anon or authenticated roles.
-- Supabase's server-only service_role bypasses RLS and is used by the API functions.
revoke all on table public.bookings from anon, authenticated;
grant all on table public.bookings to service_role;

comment on table public.bookings is 'Restaurant bookings accessed only through authenticated server-side API functions.';
