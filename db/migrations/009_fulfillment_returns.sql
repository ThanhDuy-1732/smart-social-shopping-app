ALTER TABLE shop_order
 ADD COLUMN paid_at timestamptz,ADD COLUMN accepted_at timestamptz,ADD COLUMN shipped_at timestamptz,ADD COLUMN received_at timestamptz,
 ADD COLUMN carrier text,ADD COLUMN tracking_code text,
 ADD COLUMN refunded_amount bigint NOT NULL DEFAULT 0 CHECK(refunded_amount>=0),
 ADD COLUMN refunded_items_amount bigint NOT NULL DEFAULT 0 CHECK(refunded_items_amount>=0 AND refunded_items_amount<=subtotal),
 ADD COLUMN refunded_shipping_amount bigint NOT NULL DEFAULT 0 CHECK(refunded_shipping_amount>=0 AND refunded_shipping_amount<=shipping),
 ADD COLUMN payout_status text NOT NULL DEFAULT 'none' CHECK(payout_status IN ('none','reserved','paid')),
 ADD CONSTRAINT refund_components_equal CHECK(refunded_amount=refunded_items_amount+refunded_shipping_amount);
UPDATE shop_order o SET paid_at=p.paid_at FROM payment_intent p WHERE p.checkout_id=o.checkout_id AND p.status='paid';
CREATE TABLE return_case (
 id text PRIMARY KEY,order_id text NOT NULL REFERENCES shop_order(id) ON DELETE CASCADE,
 requester_id text REFERENCES "user"(id) ON DELETE SET NULL,
 kind text NOT NULL DEFAULT 'return' CHECK(kind IN ('return','cancellation')),
 reason text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','rejected','refund_pending','refunded')),
 requested_items_amount bigint NOT NULL CHECK(requested_items_amount>=0),requested_shipping_amount bigint NOT NULL DEFAULT 0 CHECK(requested_shipping_amount>=0),
 created_at timestamptz NOT NULL DEFAULT now(),resolution text
);
CREATE TABLE return_item (
 case_id text NOT NULL REFERENCES return_case(id) ON DELETE CASCADE,
 item_id text NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,quantity integer NOT NULL CHECK(quantity>0),PRIMARY KEY(case_id,item_id)
);
CREATE TABLE return_evidence (
 case_id text NOT NULL REFERENCES return_case(id) ON DELETE CASCADE,media_id text NOT NULL REFERENCES media(id),PRIMARY KEY(case_id,media_id)
);
CREATE TABLE order_evidence (
 order_id text NOT NULL REFERENCES shop_order(id) ON DELETE CASCADE,media_id text NOT NULL REFERENCES media(id),PRIMARY KEY(order_id,media_id)
);
CREATE TABLE refund (
 id text PRIMARY KEY,case_id text NOT NULL UNIQUE REFERENCES return_case(id) ON DELETE CASCADE,
 amount bigint NOT NULL CHECK(amount>0),item_amount bigint NOT NULL CHECK(item_amount>=0),shipping_amount bigint NOT NULL CHECK(shipping_amount>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','failed','succeeded')),
 provider_reference text UNIQUE,approved_by text REFERENCES "user"(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(amount=item_amount+shipping_amount)
);
CREATE TABLE purchase_review (
 id text PRIMARY KEY,order_item_id text NOT NULL UNIQUE REFERENCES order_item(id) ON DELETE CASCADE,
 author_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 text text NOT NULL,hidden boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
