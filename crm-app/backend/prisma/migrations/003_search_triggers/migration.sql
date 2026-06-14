-- Trigger function to update searchVector on customers
CREATE OR REPLACE FUNCTION customers_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."companyName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."industry", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."city", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW."country", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_search_vector_trigger
BEFORE INSERT OR UPDATE ON "customers"
FOR EACH ROW EXECUTE FUNCTION customers_search_vector_update();

-- Trigger function to update searchVector on contacts
CREATE OR REPLACE FUNCTION contacts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."firstName", '') || ' ' || coalesce(NEW."lastName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."email", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."designation", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW."department", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_search_vector_trigger
BEFORE INSERT OR UPDATE ON "contacts"
FOR EACH ROW EXECUTE FUNCTION contacts_search_vector_update();

-- Trigger function to update searchVector on opportunities
CREATE OR REPLACE FUNCTION opportunities_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."closeNote", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunities_search_vector_trigger
BEFORE INSERT OR UPDATE ON "opportunities"
FOR EACH ROW EXECUTE FUNCTION opportunities_search_vector_update();
