CREATE TABLE shopping_list(id text PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,title text NOT NULL,items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX shopping_list_owner ON shopping_list(user_id,updated_at DESC);
