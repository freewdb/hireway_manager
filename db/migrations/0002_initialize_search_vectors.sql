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
