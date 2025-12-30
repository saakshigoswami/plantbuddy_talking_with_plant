<img width="1878" height="858" alt="image" src="https://github.com/user-attachments/assets/e9187dfa-fa5c-4dc2-8d79-72fb6be92c4c" />




# 🌿 **PlantBuddy — Real-Time AI Plant Monitoring with Confluent Cloud**

*A next-generation AI application powered by Confluent Cloud and Google Cloud Vertex AI/Gemini that streams real-time plant sensor data and generates intelligent health predictions.*

## 🏆 **AI Partner Catalyst Hackathon - Confluent Challenge Submission**

This project demonstrates **real-time AI on data in motion** by:
- **Streaming plant sensor data** to Confluent Cloud Kafka topics in real-time
- **Applying Vertex AI/Gemini models** to analyze streaming data and generate predictions
- **Providing actionable insights** about plant health, anomalies, and recommendations
- **Creating dynamic experiences** that react instantly to sensor changes

*A living interface between humans, plants, real-time data streaming, and AI-powered insights.*

---

## 📸 Overview

PlantBuddy is an immersive bio-interaction system that lets you **touch your plant, talk to your plant, and even mint its emotions/data to Confluence Coud**.

Using:

* 🌱 **Capacitance sensing** (Arduino)
* 🎧 **Bio-synth sound generation**
* 🗣️ **AI-powered plant conversations**
* ⚡ **Confluent Cloud** - Real-time data streaming
* 🤖 **Google Cloud Vertex AI/Gemini** - Stream analysis and predictions
* ⚛️ **React + TypeScript**
* 🎨 **TailwindCSS UI**

You get a magical interface to interact with your plants — scientifically and emotionally, with **real-time AI insights powered by data in motion**.

---

# ✨ **Features**

### 🟢 **Real-Time Capacitance Sensor Dashboard**

* Live graph of plant touch response
* Adjustable sensitivity threshold
* Smooth, neon sci-fi UI styling

### 🎤 **Talk Mode — Talk Directly With Your Plant**

<img width="1886" height="866" alt="image" src="https://github.com/user-attachments/assets/9a5c14b0-8ba8-43dd-b555-a9698e25c51d" />



* Uses AI (Gemini) to create personality-based responses
* Converts plant touch patterns into conversation context
* Voices the plant back using Web Speech API

### 🎶 **Music Mode — Bio-Synth Audio**

* Generates ambient audio using Web Audio API
* Plant touch manipulates pitch, tempo, and resonance

### ⚡ **Real-Time Streaming with Confluent Cloud**

* Stream plant sensor data to Confluent Cloud Kafka topics in real-time
* Every sensor reading (capacitance, raw values, baseline) is sent as a Kafka event
* Configurable streaming rate (default: 1 event/second)
* Session-based event grouping for analysis
* Perfect for:
  * Real-time monitoring dashboards
  * Event-driven architectures
  * Data pipeline integration
  * Multi-device aggregation

### 🤖 **AI-Powered Stream Analysis with Vertex AI**

* **Real-time health scoring** - AI analyzes streaming data and generates health scores (0-100)
* **Anomaly detection** - Identifies unusual patterns in sensor readings
* **Predictive insights** - Forecasts plant state based on recent trends
* **Actionable recommendations** - Provides specific care suggestions
* **Continuous analysis** - Analyzes data windows every 5 seconds
* Powered by Google Cloud Vertex AI and Gemini models


# 🛠️ **Tech Stack**

### **Frontend**

* React 19
* TypeScript
* TailwindCSS
* Recharts

### **Hardware**

* Arduino / ESP32
* Capacitive touch sensor

### **APIs & Services**

* Web Serial API
* Web Speech API
* Web Audio API
* **Confluent Cloud REST API** - Kafka streaming
* **Google Cloud Vertex AI / Gemini API** - AI analysis

----

# 🚀 **How It Works**

## **Real-Time Streaming Architecture**

```
Your Touch → Arduino → Web Serial → React UI
                                    ↓
                    Confluent Cloud Kafka Topic (plant-sensor-data)
                                    ↓
                    Vertex AI/Gemini Stream Analysis
                                    ↓
                    Real-Time Dashboard (Health Scores, Predictions, Anomalies)
                                    ↓
                    AI Engine → Voice / Music  
                                    ↓
                    Confluent Cloud Storage
```

### **Streaming Flow:**

1. **Sensor Data Capture** - Plant capacitance sensor readings collected via Arduino/Web Serial
2. **Real-Time Streaming** - Data sent to Confluent Cloud Kafka topic every second
3. **AI Analysis Window** - Vertex AI analyzes last 20 events every 5 seconds
4. **Insight Generation** - AI generates health scores, predictions, and recommendations
5. **Dashboard Display** - Real-time visualization of streaming metrics and AI insights

---

# 🔌 **Connecting Your Device**

1. Plug in Arduino (USB)
2. Open **Device Interface**
3. Click **CONNECT DEVICE**
4. Touch your plant 🌿
5. Watch the graph react in real-time ⚡

---

# 💬 **Talking to Your Plant**

1. Go to **Plant Interface**
2. Enable **Talk Mode**
3. Touch your plant to “wake” it
4. Let the conversation begin 🌱✨

---

# 🎧 **Music Mode**

* Select **Music Mode**
* Touch the plant
* It will generate natural ambient tones
* Great for meditation or displays

---

# ⚡ **Real-Time Streaming Workflow**

1. **Configure Confluent Cloud**
   - Set up your Confluent Cloud cluster
   - Add credentials to `.env` or localStorage
   - Create Kafka topic: `plant-sensor-data`

2. **Start Streaming**
   - Go to **Device** view
   - Click **START REAL-TIME STREAM** button
   - Sensor data will stream to Confluent Cloud every second

3. **View Real-Time Analytics**
   - Navigate to **Streaming** view
   - See live metrics:
     * Events streamed count
     * AI health scores
     * Anomaly detection status
     * Real-time predictions
     * Actionable recommendations

4. **AI Analysis**
   - Vertex AI analyzes data windows every 5 seconds
   - Health scores update in real-time
   - Anomalies trigger alerts
   - Recommendations appear automatically


# 🧪 **Development Setup**

## **Prerequisites**

1. **Confluent Cloud Account**
   - Sign up at [Confluent Cloud](https://www.confluent.io/confluent-cloud/)
   - Create a Kafka cluster (use trial code: `CONFLUENTDEV1` for 30-day trial)
   - Create API key and secret
   - Create topic: `plant-sensor-data`

2. **Google Cloud Account**
   - Sign up at [Google Cloud](https://cloud.google.com/free)
   - Enable Vertex AI API
   - Get Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## **Installation**

```bash
npm install
npm run dev
```

## **Environment Configuration**

Create a `.env` file in the root directory:

```env
# Google Cloud / Vertex AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GCP_PROJECT_ID=your_gcp_project_id_here
VITE_GCP_LOCATION=us-central1

# Confluent Cloud Configuration
VITE_CONFLUENT_BOOTSTRAP_SERVERS=pkc-xxxxx.region.provider.confluent.cloud:9092
VITE_CONFLUENT_API_KEY=your_confluent_api_key_here
VITE_CONFLUENT_API_SECRET=your_confluent_api_secret_here
VITE_CONFLUENT_TOPIC=plant-sensor-data
```

**Alternative:** Store credentials in browser localStorage:
- `CONFLUENT_BOOTSTRAP_SERVERS`
- `CONFLUENT_API_KEY`
- `CONFLUENT_API_SECRET`
- `GEMINI_API_KEY`

## **Enable Features**

Make sure to enable:

* ✔ Web Serial API (for Arduino connection)
* ✔ Microphone permissions (for voice input)
* ✔ Confluent Cloud credentials (for streaming)
* ✔ Google Cloud API key (for AI analysis)

---

# 📦 **File Structure**

```
PlantBuddy/
│── public/
│── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── context/
│   └── App.tsx
│── package.json
│── README.md
```

---

# 🏆 **Why PlantBuddy?**

Because plants communicate.
We just finally built a way to listen — **in real-time**.

PlantBuddy merges **nature + AI + real-time data streaming + decentralized tech** to create a new category:

### 🔮 *Bio-Reactive Real-Time AI Interfaces*

## **Confluent Challenge Highlights**

✅ **Real-Time Data Streaming** - Plant sensor data streams to Confluent Cloud Kafka topics  
✅ **AI on Data in Motion** - Vertex AI/Gemini analyzes streaming data continuously  
✅ **Dynamic Predictions** - Health scores and recommendations update in real-time  
✅ **Anomaly Detection** - AI identifies unusual patterns as they occur  
✅ **Actionable Insights** - Recommendations generated from live data streams  

## **Technical Innovation**

- **Event-Driven Architecture** - Every sensor reading is a Kafka event
- **Stream Processing** - AI analyzes sliding windows of data
- **Real-Time Dashboards** - Live visualization of streaming metrics
- **Scalable Design** - Can handle multiple plants/devices simultaneously
- **Cloud-Native** - Built on Confluent Cloud and Google Cloud Platform

## **Use Cases**

- **Smart Agriculture** - Real-time monitoring of plant health
- **Research** - Continuous data collection for scientific analysis
- **Home Automation** - Integration with smart home systems
- **Education** - Teaching real-time data processing and AI
- **IoT Applications** - Template for other sensor-based streaming projects

