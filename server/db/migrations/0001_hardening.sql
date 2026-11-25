-- Append-only ledger: no DELETE, and the only permitted UPDATE is status pending -> settled
-- (cash-on-delivery entries settle on DELIVERED). All other columns are immutable.
CREATE OR REPLACE FUNCTION ledger_entries_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ledger_entries is append-only (DELETE rejected)';
  END IF;
  IF OLD.status = 'pending' AND NEW.status = 'settled'
     AND NEW.id = OLD.id AND NEW.seller_id = OLD.seller_id
     AND NEW.order_id IS NOT DISTINCT FROM OLD.order_id
     AND NEW.sub_order_id IS NOT DISTINCT FROM OLD.sub_order_id
     AND NEW.type = OLD.type AND NEW.gross_cents = OLD.gross_cents
     AND NEW.commission_cents = OLD.commission_cents AND NEW.net_cents = OLD.net_cents
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'ledger_entries is append-only (only pending -> settled is allowed)';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_guard();
--> statement-breakpoint
-- Table layout required by connect-pg-simple.
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
