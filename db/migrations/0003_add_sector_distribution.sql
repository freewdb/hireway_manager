
-- First, create a temporary table to hold unique entries
CREATE TEMP TABLE temp_sector_dist AS
SELECT DISTINCT ON (soc_code, sector_label)
    id, soc_code, sector_label, sample_size, percentage, date_updated
FROM soc_sector_distribution
ORDER BY soc_code, sector_label, date_updated DESC;

-- Drop the original table
DROP TABLE soc_sector_distribution;

-- Recreate with unique constraint
CREATE TABLE soc_sector_distribution (
    id SERIAL PRIMARY KEY,
    soc_code VARCHAR(15) NOT NULL REFERENCES soc_detailed_occupations(code),
    sector_label TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    date_updated DATE NOT NULL,
    UNIQUE(soc_code, sector_label)
);

-- Insert unique data from temp table
INSERT INTO soc_sector_distribution (soc_code, sector_label, sample_size, percentage, date_updated)
SELECT soc_code, sector_label, sample_size, percentage, date_updated
FROM temp_sector_dist;

-- Drop temp table
DROP TABLE temp_sector_dist;
