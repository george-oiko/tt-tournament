-- ============================================================
-- Table Tennis Tournament Platform — Supabase Schema
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'event_manager')),
  created_at timestamptz default now()
);

-- 2. EVENTS
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('groups', 'knockout', 'groups_knockout')),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  group_size int default 4,                  -- players per group (for group stage)
  groups_advance int default 2,              -- top N per group advance to knockout
  sets_to_win int default 3,                 -- best of N sets
  points_per_win int default 2,
  points_per_loss int default 1,
  points_per_no_show int default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. EVENT MANAGERS (junction: which managers can manage which events)
create table public.event_managers (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- 4. PLAYERS
create table public.players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  ranking int not null,                      -- global/national ranking (lower = better)
  seed_position int,                         -- computed seed within this event
  club text,
  email text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 5. GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,                        -- e.g. "Group A"
  created_at timestamptz default now()
);

-- 6. GROUP PLAYERS
create table public.group_players (
  group_id uuid references public.groups(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  seed_in_group int,                         -- position within group (1 = favorite)
  primary key (group_id, player_id)
);

-- 7. MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  group_id uuid references public.groups(id),   -- null for knockout matches
  stage text not null check (stage in ('group', 'knockout')),
  round int not null default 1,               -- 1 = first round / group round-robin
  match_number int,                           -- ordering within round
  player1_id uuid references public.players(id),
  player2_id uuid references public.players(id),
  winner_id uuid references public.players(id),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'walkover')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 8. SETS (individual sets within a match)
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  set_number int not null,
  score_p1 int not null default 0,
  score_p2 int not null default 0,
  created_at timestamptz default now(),
  unique (match_id, set_number)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update events.updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger events_updated_at before update on public.events
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'event_manager')
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_managers enable row level security;
alter table public.players enable row level security;
alter table public.groups enable row level security;
alter table public.group_players enable row level security;
alter table public.matches enable row level security;
alter table public.sets enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: does the current user manage this event?
create or replace function manages_event(eid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.event_managers where event_id = eid and user_id = auth.uid()
  );
$$;

-- PROFILES
create policy "Users can read their own profile" on public.profiles for select using (id = auth.uid());
create policy "Admins can read all profiles" on public.profiles for select using (is_admin());
create policy "Users can update their own profile" on public.profiles for update using (id = auth.uid());

-- EVENTS
create policy "Anyone authenticated can view events" on public.events for select using (auth.role() = 'authenticated');
create policy "Admins can do everything on events" on public.events for all using (is_admin());
create policy "Event managers can update their events" on public.events for update using (manages_event(id));

-- EVENT MANAGERS
create policy "Admins manage assignments" on public.event_managers for all using (is_admin());
create policy "Managers can view their assignments" on public.event_managers for select using (user_id = auth.uid());

-- PLAYERS
create policy "Authenticated can view players" on public.players for select using (auth.role() = 'authenticated');
create policy "Admins full access on players" on public.players for all using (is_admin());
create policy "Managers can manage players in their events" on public.players for all using (manages_event(event_id));

-- GROUPS
create policy "Authenticated can view groups" on public.groups for select using (auth.role() = 'authenticated');
create policy "Admins full access on groups" on public.groups for all using (is_admin());
create policy "Managers can manage groups in their events" on public.groups for all using (manages_event(event_id));

-- GROUP PLAYERS
create policy "Authenticated can view group_players" on public.group_players for select using (auth.role() = 'authenticated');
create policy "Admins full access on group_players" on public.group_players for all using (is_admin());
create policy "Managers can manage group_players" on public.group_players for all
  using (exists (select 1 from public.groups g where g.id = group_id and manages_event(g.event_id)));

-- MATCHES
create policy "Authenticated can view matches" on public.matches for select using (auth.role() = 'authenticated');
create policy "Admins full access on matches" on public.matches for all using (is_admin());
create policy "Managers can manage matches in their events" on public.matches for all using (manages_event(event_id));

-- SETS
create policy "Authenticated can view sets" on public.sets for select using (auth.role() = 'authenticated');
create policy "Admins full access on sets" on public.sets for all using (is_admin());
create policy "Managers can manage sets" on public.sets for all
  using (exists (select 1 from public.matches m where m.id = match_id and manages_event(m.event_id)));

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Group standings
create or replace view public.group_standings as
select
  gp.group_id,
  g.event_id,
  g.name as group_name,
  p.id as player_id,
  p.name as player_name,
  p.ranking,
  count(m.id) filter (where m.status = 'completed') as played,
  count(m.id) filter (where m.winner_id = p.id) as wins,
  count(m.id) filter (where m.status = 'completed' and m.winner_id != p.id) as losses,
  coalesce(sum(case when m.winner_id = p.id then e.points_per_win
                    when m.status = 'completed' then e.points_per_loss
                    else 0 end), 0) as points
from public.group_players gp
join public.groups g on g.id = gp.group_id
join public.players p on p.id = gp.player_id
join public.events e on e.id = g.event_id
left join public.matches m on m.group_id = gp.group_id
  and m.stage = 'group'
  and (m.player1_id = p.id or m.player2_id = p.id)
group by gp.group_id, g.event_id, g.name, p.id, p.name, p.ranking, e.points_per_win, e.points_per_loss
order by points desc, wins desc, p.ranking asc;
