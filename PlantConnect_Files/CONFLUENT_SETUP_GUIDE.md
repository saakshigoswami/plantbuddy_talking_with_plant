# Confluent Cloud ksqlDB Setup Guide for PlantBuddy

## 📋 Your Topics in Confluent Cloud

You have **3 topics**:
1. `plant_sensor_data` - Main sensor data
2. `plant.health.insights` - AI analysis results  
3. `plant.health.alerts` - Critical alerts

---

## 🔄 Understanding Streams vs Tables

**Why are there two things: `plant_sensor_stream` and `plant_sensor_latest`?**

### **STREAM** (`plant_sensor_stream`):
- **Purpose**: Reads ALL data from your Kafka topic
- **Behavior**: Shows every event as it streams in (like a log file)
- **Use**: Processing and transforming data
- **Example**: If 100 events come in, the stream shows all 100

### **TABLE** (`plant_sensor_latest`):
- **Purpose**: Stores the LATEST value for each device
- **Behavior**: Aggregates data - keeps only the most recent reading per device
- **Use**: Querying current state (what you'll use in console!)
- **Example**: If 100 events come in for device "plant01", the table shows only the latest one

### **The Flow**:
```
Kafka Topic (plant_sensor_data)
    ↓
Stream (plant_sensor_stream) - reads all events
    ↓
Table (plant_sensor_latest) - stores latest per device
    ↓
You query the TABLE in console!
```

**In simple terms:**
- **Stream** = All the data flowing through (temporary)
- **Table** = The organized result you want to query (permanent)

---

## 🎯 Step-by-Step: Which Query for Which Topic

### **TOPIC 1: `plant_sensor_data`**

#### Step 1: Create Stream from `plant_sensor_data` topic
**Copy this query:**
```sql
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
```

#### Step 2: Create MAIN TABLE from `plant_sensor_data` stream
**Copy this query:**
```sql
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
```

#### Step 3: Populate the table (INSERT query)
**Copy this query:**
```sql
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
```

---

### **TOPIC 2: `plant.health.insights`**

#### Step 1: Create Stream from `plant.health.insights` topic
**Copy this query:**
```sql
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
```

#### Step 2: Create Table from `plant.health.insights` stream
**Copy this query:**
```sql
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
```

#### Step 3: Populate the health table (INSERT query)
**Copy this query:**
```sql
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
```

---

### **TOPIC 3: `plant.health.alerts`** (Optional)

#### Create Stream from `plant.health.alerts` topic
**Copy this query:**
```sql
CREATE OR REPLACE STREAM plant_health_alerts_stream (
    device_id VARCHAR,
    timestamp BIGINT,
    severity VARCHAR,
    type VARCHAR,
    message VARCHAR,
    health_score DOUBLE
) WITH (
    KAFKA_TOPIC = 'plant.health.alerts',
    VALUE_FORMAT = 'JSON',
    TIMESTAMP = 'timestamp'
);
```

---

## 📝 How to Run in Confluent Console

1. **Go to Confluent Cloud Console**
2. **Navigate to:** ksqlDB → Editor
3. **Run queries in this order:**

### For Topic 1 (`plant_sensor_data`):
1. Run the stream creation query (Step 1)
2. Run the table creation query (Step 2)
3. Run the INSERT query (Step 3)

### For Topic 2 (`plant.health.insights`):
1. Run the stream creation query (Step 1)
2. Run the table creation query (Step 2)
3. Run the INSERT query (Step 3)

### For Topic 3 (`plant.health.alerts`):
1. Run the stream creation query (optional)

---

## 🔍 How to Query Your Tables

After creating the tables, you can query them:

### Query the sensor data table:
```sql
SELECT * FROM plant_sensor_latest;
```

### Query the health insights table:
```sql
SELECT * FROM plant_health_latest;
```

### Find devices with low health scores:
```sql
SELECT device_id, health_score, summary
FROM plant_health_latest
WHERE health_score < 60;
```

---

## ✅ Checklist for Hackathon

- [ ] Topic 1: Created stream from `plant_sensor_data`
- [ ] Topic 1: Created table `plant_sensor_latest`
- [ ] Topic 1: Populated table with INSERT query
- [ ] Topic 2: Created stream from `plant.health.insights`
- [ ] Topic 2: Created table `plant_health_latest`
- [ ] Topic 2: Populated table with INSERT query
- [ ] Tested queries: `SELECT * FROM plant_sensor_latest`
- [ ] Tested queries: `SELECT * FROM plant_health_latest`

---

## 🎯 Quick Reference: Topic → Query Mapping

| Your Topic | What to Create | Query Type |
|------------|----------------|------------|
| `plant_sensor_data` | Stream → Table | CREATE STREAM → CREATE TABLE → INSERT |
| `plant.health.insights` | Stream → Table | CREATE STREAM → CREATE TABLE → INSERT |
| `plant.health.alerts` | Stream (optional) | CREATE STREAM |

---

## 💡 Tips

1. **Always check the topic name** in the `KAFKA_TOPIC = '...'` part of the query
2. **Run queries in order**: Stream first, then Table, then INSERT
3. **If you get errors**: Make sure your topic names match exactly (case-sensitive!)
4. **For hackathon demo**: Show the tables being created and querying them with real data

