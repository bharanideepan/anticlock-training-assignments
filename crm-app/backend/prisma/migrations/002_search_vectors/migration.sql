-- GIN indexes for full-text search on tsvector columns
CREATE INDEX "customers_searchVector_idx" ON "customers" USING GIN ("searchVector");
CREATE INDEX "contacts_searchVector_idx" ON "contacts" USING GIN ("searchVector");
CREATE INDEX "opportunities_searchVector_idx" ON "opportunities" USING GIN ("searchVector");
