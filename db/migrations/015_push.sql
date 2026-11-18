CREATE TABLE push_subscription(endpoint text PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,session_id text NOT NULL REFERENCES session(id) ON DELETE CASCADE,keys jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX push_owner ON push_subscription(user_id);
