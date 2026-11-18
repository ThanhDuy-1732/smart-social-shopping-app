ALTER TABLE payment_intent ADD CONSTRAINT payment_intent_checkout_unique UNIQUE(checkout_id);
