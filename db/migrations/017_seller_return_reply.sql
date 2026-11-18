ALTER TABLE return_case ADD COLUMN seller_reply text CHECK(length(seller_reply) BETWEEN 10 AND 2000),ADD COLUMN seller_replied_at timestamptz;
