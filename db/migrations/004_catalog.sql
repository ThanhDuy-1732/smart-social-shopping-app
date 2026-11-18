CREATE TABLE category (
 id text PRIMARY KEY,name text NOT NULL,parent_id text REFERENCES category(id),
 attributes jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE product (
 id text PRIMARY KEY,shop_id text NOT NULL REFERENCES shop(id) ON DELETE CASCADE,
 category_id text NOT NULL REFERENCES category(id),name text NOT NULL,description text NOT NULL,
 attributes jsonb NOT NULL DEFAULT '{}',search_text text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_search ON product USING gin(to_tsvector('simple',search_text));
CREATE INDEX product_shop ON product(shop_id,status);
CREATE INDEX product_category ON product(category_id,status);
CREATE TABLE product_variant (
 id text PRIMARY KEY,product_id text NOT NULL REFERENCES product(id) ON DELETE CASCADE,
 shop_id text NOT NULL REFERENCES shop(id) ON DELETE CASCADE,
 sku text NOT NULL,label text NOT NULL,price bigint NOT NULL CHECK(price>0 AND price<=1000000000000),
 stock integer NOT NULL CHECK(stock>=0),reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=stock),
 active boolean NOT NULL DEFAULT true,UNIQUE(shop_id,sku)
);
CREATE INDEX product_variant_product ON product_variant(product_id,active);
