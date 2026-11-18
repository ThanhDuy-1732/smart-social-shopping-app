CREATE TABLE shop (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
  description text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE shop_verification (
  shop_id text PRIMARY KEY REFERENCES shop(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  bank_name text NOT NULL,
  bank_account text NOT NULL,
  bank_holder text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE trading_policy (
  id text PRIMARY KEY,
  version bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000),
  return_days integer NOT NULL CHECK(return_days BETWEEN 0 AND 365),
  seller_accept_hours integer NOT NULL CHECK(seller_accept_hours BETWEEN 1 AND 168),
  settlement_hold_days integer NOT NULL CHECK(settlement_hold_days BETWEEN 0 AND 365),
  cancellation_terms text NOT NULL CHECK(length(cancellation_terms)>=10),
  return_terms text NOT NULL CHECK(length(return_terms)>=10),
  receipt_terms text NOT NULL CHECK(length(receipt_terms)>=10),
  shipping_terms text NOT NULL CHECK(length(shipping_terms)>=10),
  active boolean NOT NULL DEFAULT false,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX trading_policy_single_active ON trading_policy(active) WHERE active=true;
