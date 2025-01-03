-- Create GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS soc_major_groups_search_idx ON soc_major_groups USING gin(search_vector);
CREATE INDEX IF NOT EXISTS soc_minor_groups_search_idx ON soc_minor_groups USING gin(search_vector);
CREATE INDEX IF NOT EXISTS soc_detailed_occupations_search_idx ON soc_detailed_occupations USING gin(search_vector);

-- Create trigger functions to automatically update search vectors
CREATE OR REPLACE FUNCTION update_major_group_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_minor_group_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_detailed_occupation_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.alternative_titles, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trig_update_major_group_search_vector ON soc_major_groups;
CREATE TRIGGER trig_update_major_group_search_vector
  BEFORE INSERT OR UPDATE ON soc_major_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_major_group_search_vector();

DROP TRIGGER IF EXISTS trig_update_minor_group_search_vector ON soc_minor_groups;
CREATE TRIGGER trig_update_minor_group_search_vector
  BEFORE INSERT OR UPDATE ON soc_minor_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_minor_group_search_vector();

DROP TRIGGER IF EXISTS trig_update_detailed_occupation_search_vector ON soc_detailed_occupations;
CREATE TRIGGER trig_update_detailed_occupation_search_vector
  BEFORE INSERT OR UPDATE ON soc_detailed_occupations
  FOR EACH ROW
  EXECUTE FUNCTION update_detailed_occupation_search_vector();
