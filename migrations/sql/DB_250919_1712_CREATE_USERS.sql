CREATE TABLE IF NOT EXISTS public.users (
	id uuid NOT NULL,
	email varchar NOT NULL,
	"password" varchar NOT NULL,
	is_active boolean,
	created_at timestamp with time zone NOT NULL,
	deleted_at timestamp with time zone NULL,
	CONSTRAINT users_pk PRIMARY KEY (id)
);
CREATE INDEX users_email_idx ON public.users (email);
