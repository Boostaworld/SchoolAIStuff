-- Admin audit logging for GodModePanel actions
create table if not exists public.admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_logs' and policyname = 'Admins can insert audit logs'
  ) then
    create policy "Admins can insert audit logs"
      on public.admin_audit_logs
      for insert
      to authenticated
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_logs' and policyname = 'Admins can view audit logs'
  ) then
    create policy "Admins can view audit logs"
      on public.admin_audit_logs
      for select
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
  end if;
end$$;

comment on table public.admin_audit_logs is 'Audit trail for admin actions performed in GodModePanel';
