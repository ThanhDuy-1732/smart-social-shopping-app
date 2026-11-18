ALTER TABLE shop ADD COLUMN suspended_from text;
CREATE TABLE content_report(id text PRIMARY KEY,reporter_id text REFERENCES "user"(id) ON DELETE SET NULL,kind text NOT NULL CHECK(kind IN ('post','product','comment','review','shop','user')),target_id text NOT NULL,reason text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),decision text,resolution text,resolved_by text REFERENCES "user"(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz);
CREATE UNIQUE INDEX content_report_open ON content_report(reporter_id,kind,target_id) WHERE status='open';
CREATE INDEX content_report_queue ON content_report(status,created_at);
