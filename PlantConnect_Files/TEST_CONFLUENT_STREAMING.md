# Test Script: Send Dummy Data to Confluent Cloud

## 🚀 Quick Start

### **Method 1: Browser Console (Easiest)**

1. **Open your app** in the browser
2. **Open browser console** (Press F12)
3. **Copy and paste** the entire content of `test-confluent-streaming.js`
4. **Press Enter** to load the functions
5. **Run one of these commands:**

```javascript
// Send 10 sensor data events
sendDummySensorData(10)

// Send 1 health insight
sendDummyHealthInsight()

// Send 1 alert
sendDummyAlert()

// Send all types of data
sendAllDummyData()
```

---

## 📋 Prerequisites

Before running the test script, make sure:

1. ✅ **Confluent Cloud is configured** in your app
   - Either via environment variables (Vercel)
   - Or via localStorage (see below)

2. ✅ **Topics exist** in Confluent Cloud:
   - `plant_sensor_data`
   - `plant.health.insights`
   - `plant.health.alerts`

3. ✅ **API Key has write permissions** to these topics

---

## ⚙️ Setup (if not already configured)

### **Option A: localStorage (For Testing)**

Open browser console and run:

```javascript
localStorage.setItem('CONFLUENT_BOOTSTRAP_SERVERS', 'pkc-xxxxx.region.provider.confluent.cloud:9092');
localStorage.setItem('CONFLUENT_API_KEY', 'your_api_key');
localStorage.setItem('CONFLUENT_API_SECRET', 'your_api_secret');
```

Then refresh the page.

### **Option B: Environment Variables (For Production)**

Add to Vercel environment variables:
- `VITE_CONFLUENT_BOOTSTRAP_SERVERS`
- `VITE_CONFLUENT_API_KEY`
- `VITE_CONFLUENT_API_SECRET`

---

## 📊 What Data Gets Sent?

### **1. Sensor Data** (to `plant_sensor_data` topic)

```json
{
  "device_id": "plantbuddy-test-001",
  "plant_type": "Monstera",
  "timestamp": 1704067200000,
  "environment": {
    "temperature_c": 25.3,
    "humidity_pct": 65.0,
    "light_lux": 15000
  },
  "soil": {
    "moisture_pct": 45.0,
    "soil_temp_c": 22.0,
    "water_tank_level_pct": 75.0
  },
  "vitality": {
    "capacitance": 47,
    "touch_events_last_min": 2,
    "leaf_color_index": 0.85,
    "growth_index": 0.72
  },
  "meta": {
    "device_id": "plantbuddy-test-001",
    "plant_type": "Monstera",
    "firmware_version": "1.0.0",
    "location": "Test Lab"
  }
}
```

### **2. Health Insight** (to `plant.health.insights` topic)

```json
{
  "device_id": "plantbuddy-test-001",
  "timestamp": 1704067200000,
  "health_score": 85.5,
  "stress_category": "HEALTHY",
  "anomaly_detected": false,
  "summary": "Plant is healthy and thriving",
  "recommendations": [
    "Continue current care routine",
    "Monitor soil moisture"
  ],
  "inputs_window": {
    "duration_sec": 20,
    "events_count": 20,
    "avg_moisture_pct": 45.0,
    "avg_temperature_c": 22.5,
    "avg_light_lux": 15000,
    "avg_humidity_pct": 65.0
  },
  "metrics": {
    "moisture_status": "OPTIMAL",
    "temperature_status": "OPTIMAL",
    "light_status": "OPTIMAL",
    "humidity_status": "OPTIMAL"
  }
}
```

### **3. Alert** (to `plant.health.alerts` topic)

```json
{
  "device_id": "plantbuddy-test-001",
  "timestamp": 1704067200000,
  "severity": "HIGH",
  "type": "WATER_STRESS",
  "message": "Test alert: Plant requires immediate attention",
  "health_score": 55.0
}
```

---

## 🔍 Verify Data in Confluent Cloud

1. **Go to Confluent Cloud Console**
2. **Navigate to Topics**
3. **Click on the topic** (e.g., `plant_sensor_data`)
4. **Click "Messages" tab**
5. **You should see messages appearing!**

---

## 🛠️ Customization

You can customize the test data by modifying the `CONFIG` object in the script:

```javascript
const CONFIG = {
  numEvents: 10,           // Number of events to send
  delayMs: 1000,          // Delay between events (ms)
  deviceId: 'plantbuddy-test-001',
  plantType: 'Monstera'
};
```

---

## ❌ Troubleshooting

### **Error: "confluentService not found"**

- Make sure you're running the script **in the browser console** with the app loaded
- The app must be running (not just a blank page)

### **Error: "Confluent not initialized"**

- Check that credentials are set (localStorage or environment variables)
- Refresh the page after setting credentials
- Check browser console for initialization errors

### **Error: "Failed to stream"**

- Verify API key has write permissions
- Check that topics exist in Confluent Cloud
- Verify bootstrap servers format is correct
- Check browser console for detailed error messages

### **No data in Confluent Console**

- Wait a few seconds (messages may take time to appear)
- Refresh the Confluent console
- Check that you're looking at the correct topic
- Verify the API key has proper permissions

---

## 📝 Example Usage

```javascript
// Send 5 sensor events with 2 second delay
sendDummySensorData(5)

// Send multiple health insights
for (let i = 0; i < 3; i++) {
  await sendDummyHealthInsight();
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Send all types of data
sendAllDummyData()
```

---

## ✅ Success Indicators

When data is successfully sent, you'll see:

- ✅ Console messages: `📤 Streamed plant health data to Confluent`
- ✅ Messages appear in Confluent Cloud console
- ✅ No error messages in browser console

---

## 🎯 Next Steps

After sending dummy data:

1. **Verify in Confluent Console** - Check that messages arrived
2. **Run Flink SQL queries** - Create tables from the topics
3. **Query the data** - Use Flink SQL to analyze the stream
4. **Test real streaming** - Enable streaming in the app UI

---

That's it! You can now test Confluent streaming with dummy data! 🚀

