ALTER TABLE shop_order ADD COLUMN finance_eligible boolean NOT NULL DEFAULT false,ADD COLUMN fee_amount bigint NOT NULL DEFAULT 0 CHECK(fee_amount>=0);
CREATE TABLE ledger_transaction (
 id text PRIMARY KEY,event_key text NOT NULL UNIQUE,kind text NOT NULL,
 order_id text NOT NULL REFERENCES shop_order(id) ON DELETE CASCADE,payload_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_entry (
 transaction_id text NOT NULL REFERENCES ledger_transaction(id) ON DELETE CASCADE,
 account text NOT NULL CHECK(account IN ('cash','shop_pending','shop_eligible','shop_reserved','platform_fee')),
 amount bigint NOT NULL CHECK(amount<>0),PRIMARY KEY(transaction_id,account)
);
CREATE FUNCTION check_ledger_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; total numeric; entries bigint;
BEGIN
 IF TG_TABLE_NAME='ledger_transaction' THEN target:=NEW.id; ELSE target:=coalesce(NEW.transaction_id,OLD.transaction_id); END IF;
 IF NOT EXISTS(SELECT 1 FROM ledger_transaction WHERE id=target) THEN RETURN NULL; END IF;
 SELECT sum(amount),count(*) INTO total,entries FROM ledger_entry WHERE transaction_id=target;
 IF entries<2 OR total<>0 THEN RAISE EXCEPTION 'Unbalanced ledger transaction'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_tx_balanced AFTER INSERT ON ledger_transaction DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_ledger_balance();
CREATE CONSTRAINT TRIGGER ledger_entries_balanced AFTER INSERT OR UPDATE OR DELETE ON ledger_entry DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_ledger_balance();
CREATE TABLE settlement (
 id text PRIMARY KEY,shop_id text NOT NULL REFERENCES shop(id),period_start date NOT NULL,cutoff timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','approved','paid','cancelled')),
 amount bigint NOT NULL CHECK(amount>0),beneficiary jsonb NOT NULL,
 created_by text REFERENCES "user"(id) ON DELETE SET NULL,approved_by text REFERENCES "user"(id) ON DELETE SET NULL,
 paid_by text REFERENCES "user"(id) ON DELETE SET NULL,evidence_id text REFERENCES media(id),bank_reference text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),paid_at timestamptz,cancel_reason text
);
CREATE UNIQUE INDEX settlement_weekly ON settlement(shop_id,period_start) WHERE status<>'cancelled';
CREATE TABLE settlement_item (
 settlement_id text NOT NULL REFERENCES settlement(id) ON DELETE CASCADE,order_id text NOT NULL REFERENCES shop_order(id) ON DELETE CASCADE,
 amount bigint NOT NULL CHECK(amount>0),PRIMARY KEY(settlement_id,order_id)
);
