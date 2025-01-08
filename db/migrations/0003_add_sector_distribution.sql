
CREATE TABLE IF NOT EXISTS soc_sector_distribution (
    id SERIAL PRIMARY KEY,
    soc_code VARCHAR(15) NOT NULL REFERENCES soc_detailed_occupations(code),
    sector_label TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    date_updated DATE NOT NULL
);
