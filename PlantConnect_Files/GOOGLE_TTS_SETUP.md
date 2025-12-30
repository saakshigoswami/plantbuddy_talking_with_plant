# Google Cloud Text-to-Speech Setup

## Overview

PlantBuddy uses **Google Cloud Text-to-Speech API** to give your plant a natural, human-like voice with personality and emotion. This is perfect for the Confluent challenge as it demonstrates Google Cloud AI capabilities on real-time data streams.

## Features

✅ **Natural Human Voices** - Neural2 voices that sound like real people  
✅ **Emotion-Based Speech** - Voice changes based on plant health and user mood  
✅ **Personality Profiles** - Three distinct personality voices to choose from  
✅ **SSML Support** - Natural pauses, intonation, and speech patterns  
✅ **Real-Time Adaptation** - Voice adjusts based on streaming health data  

## Setup Instructions

### 1. Enable Google Cloud Text-to-Speech API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Cloud Text-to-Speech API"
5. Click **Enable**

### 2. Get API Key

**Option A: Use Existing Gemini API Key**
- If you already have a Gemini API key, you can use the same one!
- Google Cloud TTS uses the same authentication

**Option B: Create New API Key**
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional) Restrict the key to "Cloud Text-to-Speech API" for security

### 3. Configure in Your App

Add to your `.env` file:

```env
# Google Cloud Text-to-Speech (can use same key as Gemini)
VITE_GOOGLE_TTS_API_KEY=your_api_key_here
```

Or set in browser localStorage:
```javascript
localStorage.setItem('GOOGLE_TTS_API_KEY', 'your_api_key_here');
```

## Personality Voices

PlantBuddy comes with three distinct personality voices:

### 1. **Friendly Companion** (Default)
- Warm, caring, and approachable
- Female voice (en-US-Neural2-F)
- Perfect for: General conversations, supportive interactions

### 2. **Cheerful Optimist**
- Bright, energetic, always positive
- Male voice (en-US-Neural2-D)
- Perfect for: Uplifting conversations, motivational support

### 3. **Wise Mentor**
- Thoughtful, calm, nurturing
- Female voice (en-US-Neural2-J)
- Perfect for: Deep conversations, emotional support

## How It Works

### Emotion Detection
The voice automatically adjusts based on:
- **Plant Health Score** - Healthy plants sound happier
- **User's Mood** - Detected from their messages
- **Context** - Conversation history and current situation

### Voice Modifications
- **Happy**: Higher pitch, faster speech
- **Sad**: Lower pitch, slower speech
- **Excited**: Much higher pitch, faster speech
- **Calm**: Moderate pitch, steady pace
- **Concerned**: Lower pitch, careful pace

### Real-Time Streaming Integration
- Health data streams to Confluent Cloud
- Vertex AI analyzes the stream
- Google TTS generates voice with appropriate emotion
- All happens in real-time!

## Usage

1. **Select Voice**: In Talk Mode, choose a personality voice from the dropdown
2. **Start Conversation**: Talk to your plant - it will respond with natural voice
3. **Watch Emotion**: Voice changes based on plant health and your mood
4. **Stream Data**: All interactions stream to Confluent for analysis

## Fallback

If Google Cloud TTS is not configured, the app automatically falls back to:
- Web Speech API (browser's built-in TTS)
- Still works, but less natural

## Pricing

Google Cloud Text-to-Speech pricing:
- **Free Tier**: 0-4 million characters/month (FREE)
- **Paid**: $4 per 1 million characters after free tier
- For hackathon demo: Free tier is more than enough!

## Confluent Challenge Integration

This demonstrates:
✅ **Google Cloud AI** - Text-to-Speech API  
✅ **Real-Time Processing** - Voice adapts to streaming health data  
✅ **Dynamic Experiences** - Personality changes based on data  
✅ **Innovation** - Human-like plant companion powered by AI  

Perfect for showcasing how Google Cloud AI + Confluent streaming creates compelling real-time experiences!

