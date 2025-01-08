-- Initialize search vectors for existing records
UPDATE soc_major_groups
SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '')
);

UPDATE soc_minor_groups
SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '')
);

UPDATE soc_detailed_occupations
SET search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(alternative_titles, ' '), '')
);

-- Update searchable_text field for better matching
UPDATE soc_detailed_occupations
SET searchable_text = 
  title || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(alternative_titles, ' '), '');

CREATE OR REPLACE FUNCTION update_detailed_occupation_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' || 
    COALESCE(array_to_string(NEW.alternative_titles, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing column types
ALTER TABLE soc_major_groups ALTER COLUMN code TYPE VARCHAR(15);
ALTER TABLE soc_minor_groups ALTER COLUMN code TYPE VARCHAR(15);
ALTER TABLE soc_minor_groups ALTER COLUMN major_group_code TYPE VARCHAR(15);
ALTER TABLE soc_detailed_occupations ALTER COLUMN code TYPE VARCHAR(15);
ALTER TABLE soc_detailed_occupations ALTER COLUMN minor_group_code TYPE VARCHAR(15);