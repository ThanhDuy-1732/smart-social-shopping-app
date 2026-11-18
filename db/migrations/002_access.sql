CREATE TABLE account_state (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  suspended boolean NOT NULL DEFAULT false
);
CREATE TABLE user_role (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'support', 'finance')),
  PRIMARY KEY(user_id,role)
);
CREATE TABLE audit_event (
  id text PRIMARY KEY,
  actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_target ON audit_event(target_id,created_at);
