CREATE TABLE IF NOT EXISTS public.users (
	id uuid NOT NULL,
	email varchar NOT NULL,
	"password" varchar NOT NULL,
	is_active boolean,
	role_id uuid,
	created_at timestamp with time zone NOT NULL,
	deleted_at timestamp with time zone NULL,
	CONSTRAINT users_pk PRIMARY KEY (id),
	CONSTRAINT fk_users_role
		FOREIGN KEY (role_id)
		REFERENCES public.roles(id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE
);
CREATE INDEX users_email_idx ON public.users (email);
