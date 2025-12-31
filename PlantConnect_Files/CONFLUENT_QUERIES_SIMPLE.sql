-- ============================================
-- SIMPLE ksqlDB Queries for plant_sensor_data Topic
-- ============================================
-- Use these if you get syntax errors with CREATE OR REPLACE
-- ============================================

-- ============================================
-- OPTION 1: Try without "OR REPLACE" (if error occurs)
-- ============================================

-- Step 1: Create Stream (try this first)
CREATE STREAM plant_sensor_stream (
    device_id VARCHAR,
    plant_type VARCHAR,
    timestamp BIGINT,
    environment STRUCT<
        temperature_c DOUBLE,
        humidity_pct DOUBLE,
        light_lux DOUBLE
    >,
    soil STRUCT<
        moisture_pct DOUBLE,
        soil_temp_c DOUBLE,
        water_tank_level_pct DOUBLE
    >,
    vitality STRUCT<
        capacitance DOUBLE,
        touch_events_last_min INT,
        leaf_color_index DOUBLE,
        growth_index DOUBLE
    >,
    meta STRUCT<
        device_id VARCHAR,
        plant_type VARCHAR,
        firmware_version VARCHAR,
        location VARCHAR
    >
) WITH (
    KAFKA_TOPIC = 'plant_sensor_data',
    VALUE_FORMAT = 'JSON',
    TIMESTAMP = 'timestamp'
);

-- Step 2: Create Table
CREATE TABLE plant_sensor_latest (
    device_id VARCHAR PRIMARY KEY,
    plant_type VARCHAR,
    timestamp BIGINT,
    temperature_c DOUBLE,
    humidity_pct DOUBLE,
    light_lux DOUBLE,
    moisture_pct DOUBLE,
    soil_temp_c DOUBLE,
    capacitance DOUBLE,
    touch_events_last_min INT,
    location VARCHAR
) WITH (
    KAFKA_TOPIC = 'plant-sensor-latest-table',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 3
);

-- Step 3: Populate Table
INSERT INTO plant_sensor_latest
SELECT 
    device_id,
    plant_type,
    LATEST_BY_OFFSET(timestamp) AS timestamp,
    LATEST_BY_OFFSET(environment->temperature_c) AS temperature_c,
    LATEST_BY_OFFSET(environment->humidity_pct) AS humidity_pct,
    LATEST_BY_OFFSET(environment->light_lux) AS light_lux,
    LATEST_BY_OFFSET(soil->moisture_pct) AS moisture_pct,
    LATEST_BY_OFFSET(soil->soil_temp_c) AS soil_temp_c,
    LATEST_BY_OFFSET(vitality->capacitance) AS capacitance,
    LATEST_BY_OFFSET(vitality->touch_events_last_min) AS touch_events_last_min,
    LATEST_BY_OFFSET(meta->location) AS location
FROM plant_sensor_stream
GROUP BY device_id;

-- ============================================
-- OPTION 2: If you're using Confluent Cloud for Apache Flink
-- ============================================
-- The syntax is different. Try this instead:

-- For Flink, you might need to use:
-- CREATE TABLE plant_sensor_latest (
--     device_id STRING,
--     plant_type STRING,
--     timestamp BIGINT,
--     temperature_c DOUBLE,
--     humidity_pct DOUBLE,
--     light_lux DOUBLE,
--     moisture_pct DOUBLE,
--     soil_temp_c DOUBLE,
--     capacitance DOUBLE,
--     touch_events_last_min INT,
--     location STRING,
--     PRIMARY KEY (device_id) NOT ENFORCED
-- ) WITH (
--     'connector' = 'kafka',
--     'topic' = 'plant_sensor_data',
--     'properties.bootstrap.servers' = 'your-bootstrap-servers',
--     'format' = 'json'
-- );

-- ============================================
-- OPTION 3: Simplest Table Creation (if above don't work)
-- ============================================
-- Just create a table directly from the topic:

CREATE TABLE plant_sensor_latest (
    device_id VARCHAR PRIMARY KEY,
    plant_type VARCHAR,
    timestamp BIGINT,
    temperature_c DOUBLE,
    humidity_pct DOUBLE,
    light_lux DOUBLE,
    moisture_pct DOUBLE,
    soil_temp_c DOUBLE,
    capacitance DOUBLE,
    touch_events_last_min INT,
    location VARCHAR
) WITH (
    KAFKA_TOPIC = 'plant_sensor_data',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 3,
    KEY_FORMAT = 'JSON'
);

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If you get "STREAM" error:
-- 1. Try removing "OR REPLACE" from CREATE statements
-- 2. Make sure you're in ksqlDB Editor, not SQL Editor
-- 3. Check if you're using Confluent Cloud for Apache Flink (different syntax)
-- 4. Try the simplest table creation (Option 3 above)
-- ============================================

