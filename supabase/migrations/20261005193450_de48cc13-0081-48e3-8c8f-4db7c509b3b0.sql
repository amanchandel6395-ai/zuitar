create table public.ai_characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text not null,
  prompt text not null,
  consent_type text not null default 'fictional',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ai_characters to authenticated;
grant all on public.ai_characters to service_role;
alter table public.ai_characters enable row level security;
create policy "read active characters" on public.ai_characters for select to authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "admins manage characters" on public.ai_characters for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.ai_characters (name, description, image_url, prompt, consent_type, sort_order) values
('Nova', 'Cyber explorer', '/characters/nova.png', 'Nova, a confident woman with silver bob hair in a glowing lime-and-black techwear jacket (exactly as in the reference image)', 'fictional', 1),
('Rex', 'Friendly robot', '/characters/rex.png', 'Rex, a friendly rounded white robot with pink glowing eyes (exactly as in the reference image)', 'fictional', 2),
('Kai', 'Street artist', '/characters/kai.png', 'Kai, a smiling young man with curly hair in a paint-splattered hoodie (exactly as in the reference image)', 'fictional', 3);