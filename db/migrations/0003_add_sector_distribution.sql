
CREATE TABLE IF NOT EXISTS soc_sector_distribution (
    id SERIAL PRIMARY KEY,
    soc_code VARCHAR(10) NOT NULL,
    sector_label TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    date_updated DATE NOT NULL,
    CONSTRAINT fk_soc_code 
      FOREIGN KEY(soc_code) 
      REFERENCES soc_detailed_occupations(code)
);

CREATE INDEX idx_soc_sector_dist_code ON soc_sector_distribution(soc_code);
