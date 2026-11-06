-- Run in Supabase SQL Editor after creating the account in Authentication > Users.
-- Links the existing application profile to the authenticated admin account.
DO $$
DECLARE
  v_auth_user_id UUID;
  v_role_id SMALLINT;
  v_profile_id BIGINT;
  v_profile_count INTEGER;
BEGIN
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = lower('cheikdev7@gmail.com');

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth account found for cheikdev7@gmail.com';
  END IF;

  INSERT INTO public.roles (code, label)
  VALUES ('admin', 'Administrateur')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_role_id
  FROM public.roles
  WHERE code = 'admin';

  SELECT count(*), min(id) INTO v_profile_count, v_profile_id
  FROM public.users
  WHERE lower(email) = lower('cheikdev7@gmail.com');

  IF v_profile_count = 0 THEN
    RAISE EXCEPTION 'No application profile found for cheikdev7@gmail.com. Create or assign a tenant profile first.';
  END IF;

  IF v_profile_count > 1 THEN
    RAISE EXCEPTION 'Multiple application profiles found for cheikdev7@gmail.com. Resolve the tenant ambiguity before linking.';
  END IF;

  UPDATE public.users
  SET auth_user_id = v_auth_user_id,
      role_id = v_role_id
  WHERE id = v_profile_id;
END;
$$;
