
CREATE TABLE IF NOT EXISTS sectorlu (
    id SERIAL PRIMARY KEY,
    naics VARCHAR(5) NOT NULL,
    concat VARCHAR(10) NOT NULL,
    sector VARCHAR(255) NOT NULL
);

CREATE INDEX idx_sectorlu_naics ON sectorlu(naics);
