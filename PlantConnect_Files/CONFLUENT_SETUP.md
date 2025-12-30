# Confluent Challenge Setup Guide

## Overview

PlantBuddy has been enhanced for the **AI Partner Catalyst Hackathon - Confluent Challenge** to demonstrate real-time AI on data in motion.

## What's New

### ✅ Real-Time Data Streaming
- Plant sensor data streams to Confluent Cloud Kafka topics
- Every sensor reading is sent as a Kafka event
- Configurable streaming rate (default: 1 event/second)

### ✅ AI-Powered Stream Analysis
- Vertex AI/Gemini analyzes streaming data in real-time
- Generates health scores, predictions, and recommendations
- Detects anomalies as they occur
- Updates every 5 seconds

### ✅ Real-Time Dashboard
- Live visualization of streaming metrics
- Health score trends
- Anomaly detection alerts
- AI-generated recommendations

## Setup Instructions

### 1. Confluent Cloud Setup

1. **Sign up for Confluent Cloud**
   - Visit: https://www.confluent.io/confluent-cloud/
   - Use trial code: `CONFLUENTDEV1` (30-day free trial)

2. **Create Kafka Cluster**
   - Choose a cloud provider and region
   - Select "Basic" cluster type (sufficient for hackathon)

3. **Create API Key**
   - Go to "API Keys" in Confluent Cloud console
   - Create new API key
   - Save the API Key and API Secret

4. **Create Topic**
   - Go to "Topics" in Confluent Cloud console
   - Create topic: `plant-sensor-data`
   - Use default settings

5. **Get Bootstrap Servers**
   - In cluster settings, find "Bootstrap servers"
   - Copy the server address (format: `pkc-xxxxx.region.provider.confluent.cloud:9092`)

### 2. Google Cloud Setup

1. **Get Gemini API Key**
   - Visit: https://aistudio.google.com/apikey
   - Create new API key
   - Copy the key

2. **Optional: Vertex AI Setup**
   - Visit: https://cloud.google.com/vertex-ai
   - Enable Vertex AI API (if using Vertex AI instead of Gemini)

### 3. Configure Application

#### Option A: Environment Variables (Recommended)

Create `.env` file in project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GCP_PROJECT_ID=your_project_id_here
VITE_GCP_LOCATION=us-central1

VITE_CONFLUENT_BOOTSTRAP_SERVERS=pkc-xxxxx.region.provider.confluent.cloud:9092
VITE_CONFLUENT_API_KEY=your_confluent_api_key_here
VITE_CONFLUENT_API_SECRET=your_confluent_api_secret_here
VITE_CONFLUENT_TOPIC=plant-sensor-data
```

#### Option B: Browser localStorage

Open browser console and run:

```javascript
localStorage.setItem('CONFLUENT_BOOTSTRAP_SERVERS', 'pkc-xxxxx.region.provider.confluent.cloud:9092');
localStorage.setItem('CONFLUENT_API_KEY', 'your_api_key');
localStorage.setItem('CONFLUENT_API_SECRET', 'your_api_secret');
localStorage.setItem('GEMINI_API_KEY', 'your_gemini_key');
```

### 4. Run Application

```bash
npm install
npm run dev
```

## Usage

### Starting Real-Time Streaming

1. Navigate to **Device** view
2. Click **START REAL-TIME STREAM** button
3. Sensor data will stream to Confluent Cloud every second
4. AI analysis runs automatically every 5 seconds

### Viewing Real-Time Analytics

1. Navigate to **Streaming** view (new tab in navigation)
2. See live metrics:
   - Events streamed count
   - Average health score
   - Analysis count
   - Anomaly detection status
   - Health score trend chart
   - Latest AI predictions
   - Recommendations

### Features

- **Real-Time Streaming**: Data flows to Confluent Cloud continuously
- **AI Analysis**: Vertex AI analyzes data windows and generates insights
- **Health Scoring**: 0-100 health score based on sensor patterns
- **Anomaly Detection**: Identifies unusual patterns automatically
- **Predictions**: Forecasts plant state based on trends
- **Recommendations**: Actionable care suggestions

## Architecture

```
Plant Sensor → React App → Confluent Cloud Kafka → Vertex AI Analysis → Dashboard
```

### Data Flow

1. **Sensor Reading** - Capacitance sensor data collected
2. **Event Creation** - Data packaged as Kafka event
3. **Streaming** - Event sent to Confluent Cloud topic
4. **Window Collection** - Last 20 events collected for analysis
5. **AI Analysis** - Vertex AI/Gemini analyzes window
6. **Insight Generation** - Health score, predictions, recommendations
7. **Dashboard Update** - Real-time visualization updated

## Troubleshooting

### Streaming Not Working

- Check Confluent Cloud credentials are set correctly
- Verify topic exists: `plant-sensor-data`
- Check browser console for errors
- Ensure API key has proper permissions

### AI Analysis Not Running

- Verify Gemini API key is set
- Check browser console for API errors
- Ensure streaming is enabled (needs data to analyze)

### No Data in Dashboard

- Make sure streaming is started
- Check that sensor data is being generated
- Verify Confluent connection status

## Demo Mode

If Confluent Cloud is not configured, the app will still work in demo mode:
- Sensor simulation works
- AI analysis works (if Gemini API key is set)
- Streaming will log to console instead of Confluent

## Resources

- [Confluent Cloud Documentation](https://docs.confluent.io/cloud/current/)
- [Confluent Trial Code](https://ai-partner-catalyst.devpost.com/resources) - Use `CONFLUENTDEV1`
- [Google Cloud Vertex AI](https://cloud.google.com/vertex-ai)
- [Gemini API](https://ai.google.dev/)

## Hackathon Submission

This project demonstrates:
- ✅ Real-time data streaming with Confluent Cloud
- ✅ AI/ML models applied to streaming data (Vertex AI/Gemini)
- ✅ Dynamic experiences powered by real-time data
- ✅ Real-world problem solving (plant health monitoring)

