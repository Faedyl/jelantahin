-- ============================================================
-- jelantahin — Save extra profile fields on signup
-- Updates handle_new_user() trigger to capture phone, address,
-- umkm_name, and company_name from raw_user_meta_data
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone, address, umkm_name, company_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    nullif(new.raw_user_meta_data ->> 'umkm_name', ''),
    nullif(new.raw_user_meta_data ->> 'company_name', '')
  );
  return new;
end;
$$;
