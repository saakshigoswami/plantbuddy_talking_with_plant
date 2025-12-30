/**
 * Plant Health Sensor Data Types
 * 
 * Defines the schema for plant health monitoring data that streams to Confluent Cloud
 */

export interface EnvironmentData {
  temperature_c: number;      // Air temperature in Celsius
  humidity_pct: number;        // Relative humidity percentage
  light_lux: number;           // Light intensity in lux
}

export interface SoilData {
  moisture_pct: number;        // Soil moisture percentage (0-100)
  soil_temp_c: number;         // Soil temperature in Celsius
  water_tank_level_pct?: number; // Optional: Water tank level if auto-watering system
}

export interface VitalityData {
  capacitance: number;         // Touch/capacitance sensor reading
  touch_events_last_min: number; // Number of touch interactions in last minute
  leaf_color_index?: number;   // Optional: Leaf color health index (0-1, 1 = healthy green)
  growth_index?: number;       // Optional: Growth trend index
}

export interface PlantMetadata {
  device_id: string;
  plant_type: string;          // e.g., "Monstera", "Snake Plant", "Pothos"
  firmware_version?: string;
  location?: string;            // e.g., "living_room", "bedroom"
}

/**
 * Raw sensor event - sent to Confluent Cloud topic: plant.sensor.raw
 */
export interface PlantSensorEvent {
  device_id: string;
  plant_type: string;
  timestamp: number;            // Unix timestamp in milliseconds
  
  environment: EnvironmentData;
  soil: SoilData;
  vitality: VitalityData;
  
  meta?: PlantMetadata;
}

/**
 * AI-enriched health insights - output from Vertex AI analysis
 * Topic: plant.health.insights
 */
export interface PlantHealthInsight {
  device_id: string;
  timestamp: number;
  
  health_score: number;         // 0-100 overall health score
  stress_category: StressCategory;
  anomaly_detected: boolean;
  
  summary: string;              // Brief health summary
  recommendations: string[];    // Actionable recommendations
  
  // Inputs used for analysis
  inputs_window: {
    duration_sec: number;
    events_count: number;
    avg_moisture_pct: number;
    avg_temperature_c: number;
    avg_light_lux: number;
    avg_humidity_pct: number;
  };
  
  // Detailed metrics
  metrics: {
    moisture_status: MetricStatus;
    temperature_status: MetricStatus;
    light_status: MetricStatus;
    humidity_status: MetricStatus;
  };
}

/**
 * Alert event - for critical issues
 * Topic: plant.health.alerts
 */
export interface PlantHealthAlert {
  device_id: string;
  timestamp: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: AlertType;
  message: string;
  health_score: number;
}

export type StressCategory = 
  | 'HEALTHY'
  | 'WATER_STRESS'
  | 'HEAT_STRESS'
  | 'COLD_STRESS'
  | 'LIGHT_STRESS'
  | 'HUMIDITY_STRESS'
  | 'DISEASE_RISK'
  | 'MULTIPLE_STRESS';

export type MetricStatus = 
  | 'OPTIMAL'
  | 'LOW'
  | 'HIGH'
  | 'CRITICAL_LOW'
  | 'CRITICAL_HIGH';

export type AlertType =
  | 'CRITICAL_WATER_LOW'
  | 'CRITICAL_WATER_HIGH'
  | 'CRITICAL_TEMP_HIGH'
  | 'CRITICAL_TEMP_LOW'
  | 'CRITICAL_LIGHT_LOW'
  | 'CRITICAL_LIGHT_HIGH'
  | 'HEALTH_DECLINING'
  | 'ANOMALY_DETECTED';

/**
 * Plant companion conversation context
 */
export interface CompanionContext {
  plant_health: PlantHealthInsight;
  last_user_mood?: string;      // User's last reported mood
  conversation_history: Array<{
    role: 'user' | 'plant';
    text: string;
    timestamp: number;
  }>;
}

