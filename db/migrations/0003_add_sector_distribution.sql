
DROP TABLE IF EXISTS soc_sector_distribution;

CREATE TABLE soc_sector_distribution (
    id SERIAL PRIMARY KEY,
    soc_code VARCHAR(50) NOT NULL REFERENCES soc_detailed_occupations(code),
    sector_label VARCHAR(10) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    UNIQUE(soc_code, sector_label)
);
