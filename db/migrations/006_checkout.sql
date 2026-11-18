CREATE TABLE shipping_rate (
 shop_id text NOT NULL REFERENCES shop(id) ON DELETE CASCADE,region text NOT NULL,
 fee bigint NOT NULL CHECK(fee>=0 AND fee<=1000000000000),estimated_days integer NOT NULL CHECK(estimated_days BETWEEN 1 AND 60),PRIMARY KEY(shop_id,region)
);
CREATE TABLE cart_item (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 variant_id text NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),PRIMARY KEY(user_id,variant_id)
);
CREATE TABLE checkout (
 id text PRIMARY KEY,buyer_id text NOT NULL REFERENCES "user"(id),idempotency_key text NOT NULL,
 request_hash text NOT NULL,total bigint NOT NULL CHECK(total>0),address jsonb NOT NULL,
 policy_id text NOT NULL REFERENCES trading_policy(id),
 status text NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','paid','expired','refund_required')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(buyer_id,idempotency_key)
);
CREATE TABLE shop_order (
 id text PRIMARY KEY,checkout_id text NOT NULL REFERENCES checkout(id) ON DELETE CASCADE,
 shop_id text NOT NULL REFERENCES shop(id),
 status text NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','paid','accepted','shipped','received','cancelled','refund_required')),
 subtotal bigint NOT NULL CHECK(subtotal>=0),shipping bigint NOT NULL CHECK(shipping>=0),
 commission_bps integer NOT NULL,policy_snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_order_shop ON shop_order(shop_id,created_at);
CREATE TABLE order_item (
 id text PRIMARY KEY,order_id text NOT NULL REFERENCES shop_order(id) ON DELETE CASCADE,
 product_id text NOT NULL REFERENCES product(id),variant_id text NOT NULL REFERENCES product_variant(id),
 name text NOT NULL,label text NOT NULL,attributes jsonb NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),unit_price bigint NOT NULL CHECK(unit_price>0)
);
CREATE TABLE inventory_reservation (
 checkout_id text NOT NULL REFERENCES checkout(id) ON DELETE CASCADE,
 variant_id text NOT NULL REFERENCES product_variant(id),quantity integer NOT NULL CHECK(quantity>0),
 status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','released','consumed')),PRIMARY KEY(checkout_id,variant_id)
);
