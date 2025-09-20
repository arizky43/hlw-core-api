INSERT INTO public.roles (
  id,
  name,
  access,
  is_active,
  created_at
) VALUES (
  '8fc8b356-00dd-45c6-b6f5-1c2c256204e5',
  'Administrator',
  '[{"module": "roles", "read": true, "manage": true}]'::jsonb,
  true,
  NOW()
);