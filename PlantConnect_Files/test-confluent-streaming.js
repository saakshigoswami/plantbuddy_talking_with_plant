/**
 * Test Script: Send Dummy Data to Confluent Cloud
 * 
 * Usage:
 * 1. Open your app in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: sendDummyDataToConfluent()
 * 
 * Or import in your app and call the functions
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
  // Number of dummy events to send
  numEvents: 10,
  
  // Delay between events (milliseconds)
  delayMs: 1000,
  
  // Device ID
  deviceId: 'plantbuddy-test-001',
  
  // Plant type
  plantType: 'Monstera'
};

// ============================================
// Helper Functions
// ============================================

function generateRandomSensorData() {
  const now = Date.now();
  const randomOffset = Math.floor(Math.random() * 10000); // Random offset for variation
  
  return {
    device_id: CONFIG.deviceId,
    plant_type: CONFIG.plantType,
    timestamp: now + randomOffset,
    environment: {
      temperature_c: 20 + Math.random() * 10, // 20-30°C
      humidity_pct: 40 + Math.random() * 40,    // 40-80%
      light_lux: 5000 + Math.random() * 45000   // 5000-50000 lux
    },
    soil: {
      moisture_pct: 30 + Math.random() * 50,   // 30-80%
      soil_temp_c: 18 + Math.random() * 8,     // 18-26°C
      water_tank_level_pct: 20 + Math.random() * 80 // 20-100%
    },
    vitality: {
      capacitance: 30 + Math.random() * 50,      // 30-80
      touch_events_last_min: Math.floor(Math.random() * 5),
      leaf_color_index: 0.7 + Math.random() * 0.3, // 0.7-1.0
      growth_index: 0.5 + Math.random() * 0.5   // 0.5-1.0
    },
    meta: {
      device_id: CONFIG.deviceId,
      plant_type: CONFIG.plantType,
      firmware_version: '1.0.0',
      location: 'Test Lab'
    }
  };
}

function generateRandomHealthInsight() {
  const now = Date.now();
  const healthScore = 60 + Math.random() * 40; // 60-100
  
  return {
    device_id: CONFIG.deviceId,
    timestamp: now,
    health_score: Math.round(healthScore * 10) / 10,
    stress_category: healthScore > 80 ? 'HEALTHY' : 
                     healthScore > 60 ? 'MILD_STRESS' : 'WATER_STRESS',
    anomaly_detected: healthScore < 70,
    summary: healthScore > 80 
      ? 'Plant is healthy and thriving'
      : healthScore > 60
      ? 'Plant shows mild stress signs'
      : 'Plant needs attention - water stress detected',
    recommendations: healthScore > 80
      ? ['Continue current care routine', 'Monitor soil moisture']
      : healthScore > 60
      ? ['Increase watering frequency', 'Check light exposure']
      : ['Water immediately', 'Move to better light', 'Check soil drainage'],
    inputs_window: {
      duration_sec: 20,
      events_count: 20,
      avg_moisture_pct: 40 + Math.random() * 30,
      avg_temperature_c: 22 + Math.random() * 6,
      avg_light_lux: 15000 + Math.random() * 20000,
      avg_humidity_pct: 50 + Math.random() * 30
    },
    metrics: {
      moisture_status: 'OPTIMAL',
      temperature_status: 'OPTIMAL',
      light_status: 'OPTIMAL',
      humidity_status: 'OPTIMAL'
    }
  };
}

function generateRandomAlert() {
  const now = Date.now();
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const types = ['WATER_STRESS', 'TEMPERATURE_EXTREME', 'LOW_LIGHT', 'HIGH_HUMIDITY'];
  
  return {
    device_id: CONFIG.deviceId,
    timestamp: now,
    severity: severities[Math.floor(Math.random() * severities.length)],
    type: types[Math.floor(Math.random() * types.length)],
    message: 'Test alert: Plant requires immediate attention',
    health_score: 40 + Math.random() * 30 // 40-70 (low health)
  };
}

// ============================================
// Main Functions
// ============================================

/**
 * Send dummy sensor data to Confluent Cloud
 * Topic: plant_sensor_data
 */
async function sendDummySensorData(count = CONFIG.numEvents) {
  console.log(`🚀 Starting to send ${count} dummy sensor events to Confluent...`);
  
  // Check if confluentService is available
  if (typeof window === 'undefined' || !window.confluentService) {
    console.error('❌ confluentService not found. Make sure you are running this in the browser console with the app loaded.');
    return;
  }
  
  if (!window.confluentService.isReady()) {
    console.error('❌ Confluent not initialized. Please configure credentials first.');
    console.log('💡 Set credentials using:');
    console.log('   localStorage.setItem("CONFLUENT_BOOTSTRAP_SERVERS", "your-servers");');
    console.log('   localStorage.setItem("CONFLUENT_API_KEY", "your-key");');
    console.log('   localStorage.setItem("CONFLUENT_API_SECRET", "your-secret");');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < count; i++) {
    try {
      const sensorData = generateRandomSensorData();
      await window.confluentService.streamPlantHealthData(sensorData);
      successCount++;
      console.log(`✅ [${i + 1}/${count}] Sent sensor data:`, sensorData.timestamp);
      
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ [${i + 1}/${count}] Failed to send:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📤 Total sent: ${successCount + errorCount}`);
}

/**
 * Send dummy health insight to Confluent Cloud
 * Topic: plant.health.insights
 */
async function sendDummyHealthInsight() {
  console.log('🚀 Sending dummy health insight to Confluent...');
  
  if (typeof window === 'undefined' || !window.confluentService) {
    console.error('❌ confluentService not found.');
    return;
  }
  
  if (!window.confluentService.isReady()) {
    console.error('❌ Confluent not initialized.');
    return;
  }
  
  try {
    const insight = generateRandomHealthInsight();
    await window.confluentService.streamHealthInsight(insight);
    console.log('✅ Sent health insight:', insight);
  } catch (error) {
    console.error('❌ Failed to send health insight:', error);
  }
}

/**
 * Send dummy alert to Confluent Cloud
 * Topic: plant.health.alerts
 */
async function sendDummyAlert() {
  console.log('🚀 Sending dummy alert to Confluent...');
  
  if (typeof window === 'undefined' || !window.confluentService) {
    console.error('❌ confluentService not found.');
    return;
  }
  
  if (!window.confluentService.isReady()) {
    console.error('❌ Confluent not initialized.');
    return;
  }
  
  try {
    const alert = generateRandomAlert();
    await window.confluentService.streamHealthAlert(alert);
    console.log('✅ Sent alert:', alert);
  } catch (error) {
    console.error('❌ Failed to send alert:', error);
  }
}

/**
 * Send all types of dummy data (sensor + insight + alert)
 */
async function sendAllDummyData() {
  console.log('🚀 Sending all types of dummy data to Confluent...\n');
  
  // Send sensor data
  await sendDummySensorData(5);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send health insight
  await sendDummyHealthInsight();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Send alert
  await sendDummyAlert();
  
  console.log('\n✅ All dummy data sent!');
}

// ============================================
// Export for use in browser console
// ============================================

// Make functions available globally when run in browser console
if (typeof window !== 'undefined') {
  window.sendDummySensorData = sendDummySensorData;
  window.sendDummyHealthInsight = sendDummyHealthInsight;
  window.sendDummyAlert = sendDummyAlert;
  window.sendAllDummyData = sendAllDummyData;
  
  console.log('✅ Test functions loaded!');
  console.log('📝 Available functions:');
  console.log('   - sendDummySensorData(count) - Send sensor data to plant_sensor_data topic');
  console.log('   - sendDummyHealthInsight() - Send health insight to plant.health.insights topic');
  console.log('   - sendDummyAlert() - Send alert to plant.health.alerts topic');
  console.log('   - sendAllDummyData() - Send all types of data');
  console.log('\n💡 Example: sendDummySensorData(10)');
}

// ============================================
// Direct execution (if imported as module)
// ============================================

// Uncomment to auto-run when imported:
// sendAllDummyData();

