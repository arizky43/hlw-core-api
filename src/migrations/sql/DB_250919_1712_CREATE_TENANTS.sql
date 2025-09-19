CREATE TABLE public.tenants (
	id uuid NOT NULL,
	"name" varchar NOT NULL,
	code varchar NOT NULL,
	created_at timestamp with time zone NOT NULL,
	deleted_at timestamp with time zone NULL,
	CONSTRAINT tenants_pk PRIMARY KEY (id)
);
CREATE INDEX tenants_code_idx ON public.tenants (code);
