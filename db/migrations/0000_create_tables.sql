
CREATE TABLE IF NOT EXISTS soc_major_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    search_vector TSVECTOR NOT NULL DEFAULT ''::TSVECTOR
);

CREATE TABLE IF NOT EXISTS soc_minor_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    major_group_code VARCHAR(10) NOT NULL REFERENCES soc_major_groups(code),
    title TEXT NOT NULL,
    description TEXT,
    search_vector TSVECTOR NOT NULL DEFAULT ''::TSVECTOR
);

CREATE TABLE IF NOT EXISTS soc_detailed_occupations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    minor_group_code VARCHAR(10) NOT NULL REFERENCES soc_minor_groups(code),
    alternative_titles TEXT[],
    searchable_text TEXT NOT NULL DEFAULT '',
    search_vector TSVECTOR NOT NULL DEFAULT ''::TSVECTOR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
