ALTER TABLE checkout ADD COLUMN cancel_reason text;
CREATE TABLE payment_intent (
 id text PRIMARY KEY,checkout_id text NOT NULL REFERENCES checkout(id) ON DELETE CASCADE,
 provider_reference text NOT NULL UNIQUE,amount bigint NOT NULL CHECK(amount>0),currency text NOT NULL CHECK(currency='VND'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')),
 paid_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_event (
 id text PRIMARY KEY,payment_id text NOT NULL REFERENCES payment_intent(id) ON DELETE CASCADE,
 payload_hash text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_exception (
 checkout_id text PRIMARY KEY REFERENCES checkout(id) ON DELETE CASCADE,
 reason text NOT NULL,status text NOT NULL DEFAULT 'open',created_at timestamptz NOT NULL DEFAULT now()
);
