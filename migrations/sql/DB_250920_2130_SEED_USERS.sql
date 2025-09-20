INSERT INTO public.users (
  id,
  email,
  "password",
  is_active,
  role_id,
  created_at
) VALUES (
  '8fc8b356-00dd-45c6-b6f5-1c2c256204e5',
  'arizky.nurillahi@gmail.com',
  '$argon2id$v=19$m=65536,t=2,p=1$UCaFcLiS++W+43h/KS2uYMeO50QyfUHlTz8Y8gRH7cM$9To/tI8XiCszS5sY4FTbgTtpJdlpXghnHpR2QeYtR8A',
  true,
  '8fc8b356-00dd-45c6-b6f5-1c2c256204e5',
  NOW()
);