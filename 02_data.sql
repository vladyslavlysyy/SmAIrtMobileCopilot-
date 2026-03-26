INSERT INTO charger (id, latitude, longitude, postal_code, zone, num_visits)
SELECT 
    -- 1. Generar ID secuencial
    seq_id,
    
    -- 2. Coordenadas aleatorias acotadas a la zona de Tarragona/Reus/Costa Dorada
    -- Latitud: aprox entre 41.0000 y 41.2000
    41.0 + (random() * 0.2), 
    -- Longitud: aprox entre 1.0000 y 1.3000
    1.0 + (random() * 0.3),  

    -- 3. Código postal condicionado
    CASE (seq_id % 6)
        WHEN 0 THEN '43001'
        WHEN 1 THEN '43005'
        WHEN 2 THEN '43201'
        WHEN 3 THEN '43840'
        WHEN 4 THEN '43850'
        ELSE '43800'
    END,

    -- 4. Zona condicionada al mismo bloque
    CASE (seq_id % 6)
        WHEN 0 THEN 'Tarragona_Centro'
        WHEN 1 THEN 'Tarragona_Oeste'
        WHEN 2 THEN 'Reus_Centro'
        WHEN 3 THEN 'Salou_Costa'
        WHEN 4 THEN 'Cambrils_Playa'
        ELSE 'Valls_Industrial'
    END,

    -- 5. Visitas ponderadas (randomizado pero con sesgo por zona)
    CASE (seq_id % 6)
        WHEN 0 THEN floor(random() * 25 + 5)::SMALLINT  -- Más visitas
        WHEN 3 THEN floor(random() * 25 + 5)::SMALLINT  -- Más visitas
        ELSE floor(random() * 15)::SMALLINT             -- Menos visitas
    END
-- Aquí defines la cantidad masiva. Cambia el 1000 por el número que necesites (ej. 50000)
FROM generate_series(1, 1000) AS seq_id;