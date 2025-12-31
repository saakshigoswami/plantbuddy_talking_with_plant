# How to Stream Data to Confluent Cloud

## 📋 Overview

Your PlantBuddy application **already has Confluent streaming built-in**! Here's how it works and how to configure it.

---

## 🔧 How It Works

### 1. **Data Flow Architecture**

```
Plant Sensor → React App → Confluent Cloud REST API → Kafka Topics
```

### 2. **What Gets Streamed**

Your app streams **3 types of data** to **3 different topics**:

| Data Type | Topic Name | When It Streams |
|-----------|------------|----------------|
| **Sensor Data** | `plant_sensor_data` | Every 1 second when streaming is enabled |
| **Health Insights** | `plant.health.insights` | Every 5 seconds (AI analysis results) |
| **Health Alerts** | `plant.health.alerts` | When anomalies are detected |

### 3. **How Streaming Works in Code**

The streaming happens automatically in `DeviceMonitor.tsx`:

```typescript
// Streams sensor data every 1 second
useEffect(() => {
  if (!isStreaming || !confluentService.isReady()) return;

  const streamHealthData = async () => {
    const healthEvent = healthSimulator.generateReading(arduinoState.raw);
    
    // Stream to Confluent Cloud
    await confluentService.streamPlantHealthData(healthEvent);
  };

  const streamInterval = setInterval(streamHealthData, 1000);
  return () => clearInterval(streamInterval);
}, [isStreaming, arduinoState]);
```

---

## ⚙️ Configuration Steps

### **Step 1: Get Confluent Cloud Credentials**

1. **Sign up for Confluent Cloud**
   - Visit: https://www.confluent.io/confluent-cloud/
   - Use trial code: `CONFLUENTDEV1` (30-day free trial)

2. **Create Kafka Cluster**
   - Choose a cloud provider and region
   - Select "Basic" cluster type

3. **Create API Key**
   - Go to "API Keys" in Confluent Cloud console
   - Click "Create API Key"
   - Save both:
     - **API Key** (looks like: `ABC123XYZ`)
     - **API Secret** (looks like: `abc123xyz...`)

4. **Create Topics**
   - Go to "Topics" in Confluent Cloud console
   - Create these 3 topics:
     - `plant_sensor_data`
     - `plant.health.insights`
     - `plant.health.alerts`
   - Use default settings for all

5. **Get Bootstrap Servers**
   - In cluster settings, find "Bootstrap servers"
   - Copy the address (format: `pkc-xxxxx.region.provider.confluent.cloud:9092`)

---

### **Step 2: Configure Your App**

You have **2 options** to configure:

#### **Option A: Environment Variables (Recommended for Production)**

Add these to your `.env` file in `PlantConnect_Files/`:

```env
VITE_CONFLUENT_BOOTSTRAP_SERVERS=pkc-xxxxx.region.provider.confluent.cloud:9092
VITE_CONFLUENT_API_KEY=your_api_key_here
VITE_CONFLUENT_API_SECRET=your_api_secret_here
VITE_CONFLUENT_TOPIC=plant_sensor_data
```

**For Vercel deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `VITE_CONFLUENT_BOOTSTRAP_SERVERS`
   - `VITE_CONFLUENT_API_KEY`
   - `VITE_CONFLUENT_API_SECRET`
   - `VITE_CONFLUENT_TOPIC` (optional, defaults to `plant_sensor_data`)

#### **Option B: Browser localStorage (For Testing)**

Open browser console (F12) and run:

```javascript
localStorage.setItem('CONFLUENT_BOOTSTRAP_SERVERS', 'pkc-xxxxx.region.provider.confluent.cloud:9092');
localStorage.setItem('CONFLUENT_API_KEY', 'your_api_key');
localStorage.setItem('CONFLUENT_API_SECRET', 'your_api_secret');
```

Then refresh the page.

---

### **Step 3: Start Streaming**

1. **Open the app** and navigate to **Device** view
2. **Click "START REAL-TIME STREAM"** button (or toggle streaming on)
3. **Data will automatically stream** to Confluent Cloud every second!

---

## 📊 What Data Gets Sent?

### **Sensor Data Format** (to `plant_sensor_data` topic):

```json
{
  "device_id": "plantbuddy-001",
  "plant_type": "Monstera",
  "timestamp": 1704067200000,
  "environment": {
    "temperature_c": 22.5,
    "humidity_pct": 65.0,
    "light_lux": 15000
  },
  "soil": {
    "moisture_pct": 45.0,
    "soil_temp_c": 20.0,
    "water_tank_level_pct": 75.0
  },
  "vitality": {
    "capacitance": 47,
    "touch_events_last_min": 3,
    "leaf_color_index": 0.85,
    "growth_index": 0.72
  },
  "meta": {
    "device_id": "plantbuddy-001",
    "plant_type": "Monstera",
    "firmware_version": "1.0.0",
    "location": "Living Room"
  }
}
```

### **Health Insights Format** (to `plant.health.insights` topic):

```json
{
  "device_id": "plantbuddy-001",
  "timestamp": 1704067200000,
  "health_score": 85.5,
  "stress_category": "OPTIMAL",
  "anomaly_detected": false,
  "summary": "Plant is healthy and thriving",
  "recommendations": [
    "Continue current care routine",
    "Monitor soil moisture levels"
  ],
  "inputs_window": {
    "duration_sec": 20,
    "events_count": 20,
    "avg_moisture_pct": 45.0,
    "avg_temperature_c": 22.5,
    "avg_light_lux": 15000,
    "avg_humidity_pct": 65.0
  }
}
```

---

## 🔍 How to Verify Streaming is Working

### **Method 1: Check Browser Console**

Open browser console (F12) and look for:
- ✅ `✅ Confluent Cloud initialized`
- ✅ `📤 Streamed plant health data to Confluent: plantbuddy-001 1704067200000`
- ✅ `📊 Streamed health insight to Confluent: plantbuddy-001`

### **Method 2: Check Confluent Cloud Console**

1. Go to Confluent Cloud → Topics
2. Click on `plant_sensor_data`
3. Click "Messages" tab
4. You should see messages streaming in real-time!

### **Method 3: Check Streaming Dashboard**

1. Navigate to **Streaming** tab in the app
2. You should see:
   - **Events Streamed** count increasing
   - **Real-time analytics** updating
   - **Health score trends** chart

---

## 🛠️ Technical Details

### **How the REST API Works**

The app uses Confluent Cloud's REST API (not Kafka client libraries) because:
- ✅ Works in browsers (no CORS issues)
- ✅ No need for backend proxy
- ✅ Simple authentication

**Implementation** (`confluentService.ts`):
```typescript
// Extracts cluster ID from bootstrap servers
// Format: pkc-xxxxx.region.provider.confluent.cloud:9092
const clusterId = clusterMatch[1];
const url = `https://${region}.api.confluent.cloud/kafka/v3/clusters/${clusterId}/topics/${topic}/records`;

// Uses Basic Auth with API Key/Secret
const auth = btoa(`${apiKey}:${apiSecret}`);
```

### **Streaming Rate**

- **Sensor Data**: 1 event per second
- **Health Insights**: 1 event every 5 seconds (after AI analysis)
- **Alerts**: Only when anomalies detected

---

## ❌ Troubleshooting

### **Streaming Not Working?**

1. **Check credentials are set:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('CONFLUENT_BOOTSTRAP_SERVERS'));
   console.log(localStorage.getItem('CONFLUENT_API_KEY'));
   ```

2. **Check browser console for errors:**
   - Look for `❌ Failed to stream` messages
   - Check for CORS errors
   - Verify API key permissions

3. **Verify topics exist:**
   - Go to Confluent Cloud → Topics
   - Make sure all 3 topics are created:
     - `plant_sensor_data`
     - `plant.health.insights`
     - `plant.health.alerts`

4. **Check API key permissions:**
   - API key needs "Topic Write" permissions
   - Go to Confluent Cloud → API Keys → Your Key → Permissions

### **No Data in Confluent Console?**

- Make sure streaming is **enabled** in the app
- Check that sensor data is being generated (even in simulation mode)
- Wait a few seconds for data to appear
- Try refreshing the Confluent console

### **CORS Errors?**

The Confluent REST API should work from browsers, but if you see CORS errors:
- Make sure you're using the correct API endpoint format
- Check that your API key has proper permissions
- Consider using a backend proxy (for production)

---

## 🎯 Next Steps

Once streaming is working:

1. **Create Flink SQL tables** (using the queries we discussed earlier)
2. **Query the data** in Confluent console
3. **Set up real-time analytics** dashboards
4. **Monitor plant health** in real-time!

---

## 📝 Summary

✅ **Streaming is already built into your app!**

✅ **Just configure credentials** (environment variables or localStorage)

✅ **Click "START STREAMING"** and data flows automatically

✅ **Check Confluent Cloud console** to see data arriving

✅ **Use Flink SQL queries** to create tables and analyze the stream

That's it! Your app is streaming to Confluent Cloud! 🚀

