CREATE TABLE IF NOT EXISTS public.roles (
	id uuid NOT NULL,
	"name" varchar NOT NULL,
	access jsonb NOT NULL,
	is_active boolean,
	created_at timestamp with time zone NOT NULL,
	deleted_at timestamp with time zone NULL,
	CONSTRAINT roles_pk PRIMARY KEY (id)
);
