CREATE TABLE charger (
    id BIGINT PRIMARY KEY, 
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    postal_code VARCHAR(20),
    zone VARCHAR(255),
    num_visits SMALLINT -- Num visits init to 0, need to update in 
);

CREATE TABLE assignable (
    id BIGINT PRIMARY KEY,
    status VARCHAR(255),
    priority SMALLINT,
    charger_id BIGINT REFERENCES charger(id)
);

CREATE TABLE contract (
    id BIGINT PRIMARY KEY REFERENCES assignable(id),
    type VARCHAR(255),
    client_id BIGINT,
    domain_id VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_visits INT,
    frequency VARCHAR(255)
);

CREATE TABLE incidence (
    id BIGINT PRIMARY KEY REFERENCES assignable(id),
    domain_id BIGINT,
    auto_create_visit BOOLEAN,
    created_at TIMESTAMP
);

CREATE TABLE user_info (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    phone VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP,
    passwd VARCHAR(255)
);

CREATE TABLE technician (
    id BIGINT PRIMARY KEY REFERENCES user_info(id),
    zone VARCHAR(255),
    vehicle VARCHAR(255),
    status VARCHAR(255),
    start_work_day TIME,
    end_work_day TIME
);

CREATE TABLE visit (
    id BIGINT PRIMARY KEY,
    assignable_id BIGINT REFERENCES assignable(id),
    technician_id BIGINT REFERENCES technician(id),
    visit_type VARCHAR(255),
    status VARCHAR(255),
    planned_date TIMESTAMP,
    estimated_duration INT,
    score DOUBLE PRECISION
);

CREATE TABLE report (
    id BIGINT PRIMARY KEY,
    visit_id BIGINT UNIQUE REFERENCES visit(id),
    report_type VARCHAR(255),
    status TEXT,
    created_at TIMESTAMP
);