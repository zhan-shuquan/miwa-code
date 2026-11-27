BEGIN;
-- Allocation history survives discarded/deleted opportunities. No FK cascade.
CREATE TABLE IF NOT EXISTS selection_number_allocations (
 selection_id TEXT PRIMARY KEY, selection_no TEXT NOT NULL UNIQUE,
 employee_id TEXT NOT NULL, item_prefix TEXT NOT NULL, selection_date DATE NOT NULL,
 sequence_number INTEGER NOT NULL CHECK(sequence_number BETWEEN 1 AND 999),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(employee_id, selection_date, sequence_number), UNIQUE(item_prefix, selection_date, sequence_number)
);
ALTER TABLE product_opportunities ADD COLUMN IF NOT EXISTS selector_employee_id TEXT;
ALTER TABLE product_opportunities ADD COLUMN IF NOT EXISTS owner_employee_id TEXT;
UPDATE product_opportunities p SET selector_employee_id=e.employee_id
 FROM aione_employee_directory e WHERE p.created_by_person_id=e.id AND p.selector_employee_id IS NULL;
UPDATE product_opportunities p SET owner_employee_id=e.employee_id
 FROM aione_employee_directory e WHERE p.owner_person_id=e.id AND p.owner_employee_id IS NULL;
CREATE OR REPLACE FUNCTION selection_employee_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE resolved TEXT;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.selection_no IS NOT NULL AND NEW.selection_no IS DISTINCT FROM OLD.selection_no THEN
   RAISE EXCEPTION 'Selection number is immutable';
  END IF;
  IF OLD.selector_employee_id IS NOT NULL THEN
   IF NEW.selector_employee_id IS DISTINCT FROM OLD.selector_employee_id THEN
    RAISE EXCEPTION 'Original selector Employee ID is immutable';
   END IF;
  END IF;
 END IF;
 IF NEW.selector_employee_id IS NULL THEN
  SELECT employee_id INTO NEW.selector_employee_id FROM aione_employee_directory WHERE id=NEW.created_by_person_id;
 END IF;
 IF TG_OP='INSERT' OR NEW.owner_person_id IS DISTINCT FROM OLD.owner_person_id OR NEW.owner_employee_id IS NULL THEN
  SELECT employee_id INTO resolved FROM aione_employee_directory WHERE id=NEW.owner_person_id;
  -- Audited member correction updates member references before the next cache snapshot.
  IF NEW.owner_person_id IS NULL THEN NEW.owner_employee_id=NULL;
  ELSIF resolved IS NOT NULL THEN NEW.owner_employee_id=resolved;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS selection_employee_links ON product_opportunities;
CREATE TRIGGER selection_employee_links BEFORE INSERT OR UPDATE ON product_opportunities
 FOR EACH ROW EXECUTE FUNCTION selection_employee_links();
COMMIT;
