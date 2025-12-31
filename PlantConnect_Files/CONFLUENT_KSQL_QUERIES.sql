-- ============================================
-- Confluent Cloud ksqlDB Queries for PlantBuddy
-- ============================================
-- 
-- IMPORTANT: Topics vs Tables
-- ============================================
-- TOPICS (what you already have):
--   - These are Kafka topics where data streams
--   - You have 3 topics: plant_sensor_data, plant.health.insights, plant.health.alerts
--   - Topics are like "buckets" that hold streaming data
--
-- TABLES (what you'll create):
--   - Tables are created FROM topics using ksqlDB queries
--   - Tables aggregate/transform data from topics
--   - You can query tables in the Confluent console
--   - Tables update automatically as new data streams
--
-- Think of it like this:
--   Topic = Raw streaming data (like a log file)
--   Table = Organized, queryable view of that data (like a database table)
-- ============================================
--
-- Prerequisites:
-- 1. You already have these topics in Confluent Cloud:
--    - plant_sensor_data
--    - plant.health.insights
--    - plant.health.alerts
-- 2. Enable ksqlDB in your Confluent Cloud environment
-- 3. Run these queries in the ksqlDB Editor
-- ============================================

-- ============================================
-- IMPORTANT: Understanding Streams vs Tables
-- ============================================
-- 
-- STREAM (plant_sensor_stream):
--   - Reads data FROM your Kafka topic (plant_sensor_data)
--   - Shows ALL events as they come in (like a log)
--   - Data flows through it (temporary view)
--   - Used to process/transform data
--
-- TABLE (plant_sensor_latest):
--   - Created FROM the stream
--   - Stores the LATEST value for each device (aggregated)
--   - Can be queried like a database table
--   - Updates automatically when new data arrives
--   - This is what you'll query in the console!
--
-- Think of it like this:
--   Topic → Stream (reads all events) → Table (stores latest per device)
--
-- Why both?
--   - Stream: Processes incoming data
--   - Table: Stores the result you want to query
-- ============================================

-- ============================================
-- STEP 1: Create Stream from Sensor Data Topic
-- ============================================
-- This creates a stream that reads from your Kafka topic: plant_sensor_data

CREATE OR REPLACE STREAM plant_sensor_stream (
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

-- ============================================
-- STEP 2: Create Table - Latest Sensor Readings per Device
-- ============================================
-- This table stores the most recent sensor reading for each device
-- Perfect for dashboard queries and real-time monitoring

-- ============================================
-- STEP 2: Create MAIN TABLE - Latest Sensor Readings
-- ============================================
-- This is the MAIN TABLE you'll query in the console
-- It shows the latest sensor reading for each device

CREATE OR REPLACE TABLE plant_sensor_latest (
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

-- Populate the table from the stream
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
-- STEP 3: Create Stream from Health Insights Topic
-- ============================================
-- Reads from your topic: plant.health.insights

CREATE OR REPLACE STREAM plant_health_insights_stream (
    device_id VARCHAR,
    timestamp BIGINT,
    health_score DOUBLE,
    stress_category VARCHAR,
    anomaly_detected BOOLEAN,
    summary VARCHAR,
    recommendations ARRAY<VARCHAR>,
    inputs_window STRUCT<
        duration_sec INT,
        events_count INT,
        avg_moisture_pct DOUBLE,
        avg_temperature_c DOUBLE,
        avg_light_lux DOUBLE,
        avg_humidity_pct DOUBLE
    >,
    metrics STRUCT<
        moisture_status VARCHAR,
        temperature_status VARCHAR,
        light_status VARCHAR,
        humidity_status VARCHAR
    >
) WITH (
    KAFKA_TOPIC = 'plant.health.insights',
    VALUE_FORMAT = 'JSON',
    TIMESTAMP = 'timestamp'
);

-- ============================================
-- STEP 4: Create Table - Latest Health Score per Device
-- ============================================
-- This table stores the most recent health analysis for each device
-- Created FROM topic: plant.health.insights

CREATE OR REPLACE TABLE plant_health_latest (
    device_id VARCHAR PRIMARY KEY,
    timestamp BIGINT,
    health_score DOUBLE,
    stress_category VARCHAR,
    anomaly_detected BOOLEAN,
    summary VARCHAR,
    recommendations ARRAY<VARCHAR>,
    avg_moisture_pct DOUBLE,
    avg_temperature_c DOUBLE,
    avg_light_lux DOUBLE,
    avg_humidity_pct DOUBLE
) WITH (
    KAFKA_TOPIC = 'plant-health-latest-table',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 3
);

-- Populate the health table from the stream
INSERT INTO plant_health_latest
SELECT 
    device_id,
    LATEST_BY_OFFSET(timestamp) AS timestamp,
    LATEST_BY_OFFSET(health_score) AS health_score,
    LATEST_BY_OFFSET(stress_category) AS stress_category,
    LATEST_BY_OFFSET(anomaly_detected) AS anomaly_detected,
    LATEST_BY_OFFSET(summary) AS summary,
    LATEST_BY_OFFSET(recommendations) AS recommendations,
    LATEST_BY_OFFSET(inputs_window->avg_moisture_pct) AS avg_moisture_pct,
    LATEST_BY_OFFSET(inputs_window->avg_temperature_c) AS avg_temperature_c,
    LATEST_BY_OFFSET(inputs_window->avg_light_lux) AS avg_light_lux,
    LATEST_BY_OFFSET(inputs_window->avg_humidity_pct) AS avg_humidity_pct
FROM plant_health_insights_stream
GROUP BY device_id;

-- ============================================
-- STEP 5: Create Aggregated Statistics Table
-- ============================================
-- This table provides aggregated statistics for dashboard display

CREATE OR REPLACE TABLE plant_statistics (
    device_id VARCHAR PRIMARY KEY,
    total_readings BIGINT,
    avg_health_score DOUBLE,
    avg_temperature_c DOUBLE,
    avg_humidity_pct DOUBLE,
    avg_light_lux DOUBLE,
    avg_moisture_pct DOUBLE,
    last_update_timestamp BIGINT
) WITH (
    KAFKA_TOPIC = 'plant-statistics',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 3
);

-- Populate statistics table (run as a persistent query)
INSERT INTO plant_statistics
SELECT 
    device_id,
    COUNT(*) AS total_readings,
    AVG(health_score) AS avg_health_score,
    AVG(environment->temperature_c) AS avg_temperature_c,
    AVG(environment->humidity_pct) AS avg_humidity_pct,
    AVG(environment->light_lux) AS avg_light_lux,
    AVG(soil->moisture_pct) AS avg_moisture_pct,
    MAX(timestamp) AS last_update_timestamp
FROM plant_sensor_stream
WINDOW TUMBLING (SIZE 1 HOUR)
GROUP BY device_id;

-- ============================================
-- USEFUL QUERIES FOR CONSOLE
-- ============================================

-- Query 1: View latest sensor readings for all devices
SELECT * FROM plant_sensor_latest;

-- Query 2: View latest health scores for all devices
SELECT * FROM plant_health_latest;

-- Query 3: Find devices with health score below 60
SELECT device_id, health_score, stress_category, summary
FROM plant_health_latest
WHERE health_score < 60;

-- Query 4: Find devices with anomalies detected
SELECT device_id, health_score, summary, recommendations
FROM plant_health_latest
WHERE anomaly_detected = true;

-- Query 5: View aggregated statistics
SELECT * FROM plant_statistics;

-- Query 6: Join sensor data with health insights
SELECT 
    s.device_id,
    s.plant_type,
    s.temperature_c,
    s.humidity_pct,
    s.light_lux,
    s.moisture_pct,
    h.health_score,
    h.stress_category,
    h.anomaly_detected
FROM plant_sensor_latest s
INNER JOIN plant_health_latest h
ON s.device_id = h.device_id;

-- ============================================
-- NOTES FOR HACKATHON
-- ============================================
-- 
-- 1. Make sure your topic names match:
--    - If your topic is 'plant-sensor-data', use that
--    - If it's 'plant.sensor.raw', change KAFKA_TOPIC accordingly
--
-- 2. The table will automatically update as new data streams in
--
-- 3. You can query these tables in the Confluent Cloud Console
--    under the ksqlDB section
--
-- 4. For the hackathon demo, you can show:
--    - Real-time data streaming to topics
--    - Tables being populated automatically
--    - Queries showing latest sensor readings
--    - Health scores and anomaly detection
--
-- 5. If you get errors about topics not existing:
--    - Create the topics first in Confluent Cloud
--    - Or adjust the topic names in the queries
-- ============================================

