CREATE TABLE anon_quota_bucket(identity text NOT NULL,scope text NOT NULL,count integer NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(identity,scope));
