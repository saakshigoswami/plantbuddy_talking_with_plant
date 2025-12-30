/**
 * Plant Health Sensor Simulator
 * 
 * Generates realistic plant health sensor data for demo purposes
 * In production, this would read from actual hardware sensors
 */

import { PlantSensorEvent, EnvironmentData, SoilData, VitalityData } from '../types/plantHealth';

export class PlantHealthSimulator {
  private deviceId: string;
  private plantType: string;
  private location: string;
  
  // Current state (simulated)
  private state = {
    // Environment
    temperature: 22.0,      // Start at optimal
    humidity: 60.0,
    light: 8000,
    
    // Soil
    moisture: 45.0,         // Start at moderate
    soilTemp: 21.0,
    waterTank: 80.0,
    
    // Vitality
    capacitance: 0,
    touchEvents: 0,
    leafColor: 0.9,
    growthIndex: 1.0,
    
    // Trends (for realistic variation)
    moistureTrend: 0,       // -1 = drying, 0 = stable, 1 = increasing
    tempTrend: 0,
  };

  constructor(deviceId: string = 'plant01', plantType: string = 'Monstera', location: string = 'living_room') {
    this.deviceId = deviceId;
    this.plantType = plantType;
    this.location = location;
    
    // Initialize with some variation
    this.state.temperature = 20 + Math.random() * 6; // 20-26°C
    this.state.humidity = 45 + Math.random() * 20;   // 45-65%
    this.state.light = 5000 + Math.random() * 10000; // 5000-15000 lux
    this.state.moisture = 30 + Math.random() * 30;  // 30-60%
    this.state.soilTemp = this.state.temperature - 1 + Math.random() * 2;
  }

  /**
   * Generate next sensor reading with realistic variation
   */
  generateReading(capacitanceValue?: number): PlantSensorEvent {
    const now = Date.now();
    
    // Simulate gradual changes
    this.updateState();
    
    // Use provided capacitance or simulate
    if (capacitanceValue !== undefined) {
      this.state.capacitance = capacitanceValue;
      if (capacitanceValue > 20) {
        this.state.touchEvents = Math.min(this.state.touchEvents + 1, 10);
      }
    } else {
      // Simulate occasional touch
      if (Math.random() > 0.95) {
        this.state.capacitance = 30 + Math.random() * 50;
        this.state.touchEvents = Math.min(this.state.touchEvents + 1, 10);
      } else {
        this.state.capacitance = Math.max(0, this.state.capacitance - 2);
      }
    }
    
    // Decay touch events over time
    if (Math.random() > 0.7) {
      this.state.touchEvents = Math.max(0, this.state.touchEvents - 1);
    }

    const environment: EnvironmentData = {
      temperature_c: Math.round(this.state.temperature * 10) / 10,
      humidity_pct: Math.round(this.state.humidity * 10) / 10,
      light_lux: Math.round(this.state.light)
    };

    const soil: SoilData = {
      moisture_pct: Math.round(this.state.moisture * 10) / 10,
      soil_temp_c: Math.round(this.state.soilTemp * 10) / 10,
      water_tank_level_pct: Math.round(this.state.waterTank * 10) / 10
    };

    const vitality: VitalityData = {
      capacitance: Math.round(this.state.capacitance),
      touch_events_last_min: this.state.touchEvents,
      leaf_color_index: Math.round(this.state.leafColor * 100) / 100,
      growth_index: Math.round(this.state.growthIndex * 100) / 100
    };

    return {
      device_id: this.deviceId,
      plant_type: this.plantType,
      timestamp: now,
      environment,
      soil,
      vitality,
      meta: {
        device_id: this.deviceId,
        plant_type: this.plantType,
        location: this.location,
        firmware_version: '1.0.0'
      }
    };
  }

  /**
   * Update internal state with realistic trends
   */
  private updateState(): void {
    // Moisture gradually decreases (plant uses water)
    if (this.state.moistureTrend <= 0) {
      this.state.moisture = Math.max(0, this.state.moisture - (0.1 + Math.random() * 0.2));
    } else {
      this.state.moisture = Math.min(100, this.state.moisture + (0.1 + Math.random() * 0.2));
    }
    
    // Occasionally change moisture trend (simulating watering or natural variation)
    if (Math.random() > 0.98) {
      this.state.moistureTrend = Math.random() > 0.5 ? 1 : -1;
    }
    if (Math.random() > 0.95) {
      this.state.moistureTrend = 0; // Stabilize
    }
    
    // Temperature varies slightly (day/night cycle simulation)
    const tempVariation = (Math.sin(Date.now() / 3600000) * 2) + (Math.random() - 0.5) * 0.5;
    this.state.temperature = Math.max(18, Math.min(30, 22 + tempVariation));
    this.state.soilTemp = this.state.temperature - 1 + (Math.random() - 0.5) * 1;
    
    // Humidity varies with temperature (inverse relationship)
    this.state.humidity = Math.max(30, Math.min(80, 65 - (this.state.temperature - 22) * 2 + (Math.random() - 0.5) * 5));
    
    // Light varies (simulating day/night or moving shadows)
    const lightVariation = Math.max(0, Math.sin(Date.now() / 1800000) * 5000) + (Math.random() - 0.5) * 1000;
    this.state.light = Math.max(100, Math.min(20000, 10000 + lightVariation));
    
    // Water tank slowly depletes if auto-watering is active
    if (this.state.moisture < 30 && this.state.waterTank > 0) {
      this.state.waterTank = Math.max(0, this.state.waterTank - 0.05);
      // Auto-watering kicks in
      if (this.state.moisture < 25) {
        this.state.moisture = Math.min(100, this.state.moisture + 0.5);
        this.state.moistureTrend = 1;
      }
    }
    
    // Leaf color degrades if conditions are poor
    if (this.state.moisture < 20 || this.state.temperature > 28 || this.state.light < 2000) {
      this.state.leafColor = Math.max(0.5, this.state.leafColor - 0.001);
    } else if (this.state.moisture > 30 && this.state.temperature < 26 && this.state.light > 5000) {
      this.state.leafColor = Math.min(1.0, this.state.leafColor + 0.0005);
    }
    
    // Growth index slowly increases when healthy
    if (this.state.moisture > 30 && this.state.moisture < 70 && 
        this.state.temperature > 20 && this.state.temperature < 26 &&
        this.state.light > 5000) {
      this.state.growthIndex = Math.min(1.2, this.state.growthIndex + 0.0001);
    }
  }

  /**
   * Simulate watering (user action)
   */
  water(amount: number = 20): void {
    this.state.moisture = Math.min(100, this.state.moisture + amount);
    this.state.moistureTrend = 1;
    this.state.waterTank = Math.max(0, this.state.waterTank - amount * 0.1);
  }

  /**
   * Get current state (for debugging)
   */
  getState() {
    return { ...this.state };
  }
}

