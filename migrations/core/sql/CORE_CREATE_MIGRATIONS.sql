CREATE TABLE IF NOT EXISTS public.hlw_migrations (
	id varchar NOT NULL,
	created_at timestamp with time zone NOT NULL,
	CONSTRAINT hlw_migrations_pk PRIMARY KEY (id)
);
