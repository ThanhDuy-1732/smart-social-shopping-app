CREATE TABLE media (
 id text PRIMARY KEY,owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('image','video')),
 max_bytes integer NOT NULL CHECK(max_bytes>0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','ready','rejected')),
 mime text,expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE background_job (
 id text PRIMARY KEY,kind text NOT NULL,key text NOT NULL,payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','working','done','failed')),
 attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,lease_token text,last_error text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(kind,key)
);
CREATE INDEX background_job_due ON background_job(kind,status,available_at);
CREATE TABLE product_media (
 product_id text NOT NULL REFERENCES product(id) ON DELETE CASCADE,
 media_id text NOT NULL REFERENCES media(id),position integer NOT NULL,
 PRIMARY KEY(product_id,media_id),UNIQUE(product_id,position)
);
