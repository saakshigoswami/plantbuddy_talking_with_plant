/**
 * Google Cloud Vertex AI Service for Real-Time Stream Analysis
 * 
 * This service uses Vertex AI/Gemini to analyze real-time plant sensor data streams
 * and generate predictions, health scores, and recommendations
 */

import { PlantSensorEvent, StreamAnalysisResult } from './confluentService';
import { PlantSensorEvent as PlantHealthEvent, PlantHealthInsight, StressCategory, MetricStatus } from '../types/plantHealth';
import { PlantSensorEvent as PlantHealthEvent, PlantHealthInsight, CompanionContext, StressCategory, MetricStatus } from '../types/plantHealth';

export interface StreamAnalysisConfig {
  windowSize?: number; // Number of data points to analyze together
  analysisInterval?: number; // Milliseconds between analyses
}

class VertexAIService {
  private apiKey: string = '';
  private projectId: string = '';
  private location: string = 'us-central1';
  private model: string = 'gemini-1.5-flash-latest';
  private dataWindow: PlantSensorEvent[] = [];
  private healthDataWindow: PlantHealthEvent[] = [];
  private analysisCallback?: (result: StreamAnalysisResult) => void;
  private healthAnalysisCallback?: (result: PlantHealthInsight) => void;

  /**
   * Initialize Vertex AI service
   */
  initialize(config: {
    apiKey: string;
    projectId?: string;
    location?: string;
    model?: string;
  }): void {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId || 'default-project';
    this.location = config.location || 'us-central1';
    this.model = config.model || 'gemini-1.5-flash-latest';
    
    console.log('✅ Vertex AI initialized');
  }

  /**
   * Add sensor event to analysis window
   */
  addToWindow(event: PlantSensorEvent): void {
    this.dataWindow.push(event);
    
    // Keep window size manageable (last 50 events)
    if (this.dataWindow.length > 50) {
      this.dataWindow.shift();
    }
  }

  /**
   * Add plant health event to analysis window
   */
  addHealthEventToWindow(event: PlantHealthEvent): void {
    this.healthDataWindow.push(event);
    
    // Keep window size manageable (last 20 events)
    if (this.healthDataWindow.length > 20) {
      this.healthDataWindow.shift();
    }
  }

  /**
   * Analyze current data window using Vertex AI/Gemini
   */
  async analyzeStream(): Promise<StreamAnalysisResult> {
    if (this.dataWindow.length === 0) {
      return {
        healthScore: 0,
        prediction: 'No data available',
        anomalyDetected: false,
        recommendations: [],
        timestamp: Date.now()
      };
    }

    try {
      // Prepare data summary for AI analysis
      const recentEvents = this.dataWindow.slice(-20); // Last 20 events
      const avgCapacitance = recentEvents.reduce((sum, e) => sum + e.capacitance, 0) / recentEvents.length;
      const avgRaw = recentEvents.reduce((sum, e) => sum + e.raw, 0) / recentEvents.length;
      const variance = this.calculateVariance(recentEvents.map(e => e.capacitance));
      const trend = this.calculateTrend(recentEvents.map(e => e.capacitance));

      const dataSummary = `
PLANT SENSOR DATA ANALYSIS REQUEST

Recent Data Window (${recentEvents.length} events):
- Average Capacitance: ${avgCapacitance.toFixed(2)}
- Average Raw Value: ${avgRaw.toFixed(2)}
- Variance: ${variance.toFixed(2)}
- Trend: ${trend > 0 ? 'Increasing' : trend < 0 ? 'Decreasing' : 'Stable'}
- Time Range: ${new Date(recentEvents[0].timestamp).toLocaleTimeString()} - ${new Date(recentEvents[recentEvents.length - 1].timestamp).toLocaleTimeString()}

Capacitance Values: [${recentEvents.map(e => e.capacitance).join(', ')}]

Please analyze this plant sensor data and provide:
1. Health Score (0-100): A score indicating plant health based on sensor patterns
2. Prediction: A brief prediction about plant state (e.g., "Healthy", "Needs attention", "Stressed")
3. Anomaly Detection: true/false if any unusual patterns detected
4. Recommendations: Array of actionable recommendations (max 3)

Respond in JSON format:
{
  "healthScore": number (0-100),
  "prediction": "string",
  "anomalyDetected": boolean,
  "recommendations": ["string", "string", "string"]
}
      `;

      // Call Gemini API
      const response = await this.callGeminiAPI(dataSummary);
      
      const result: StreamAnalysisResult = {
        healthScore: response.healthScore || 75,
        prediction: response.prediction || 'Analyzing...',
        anomalyDetected: response.anomalyDetected || false,
        recommendations: response.recommendations || [],
        timestamp: Date.now()
      };

      // Notify callback if registered
      if (this.analysisCallback) {
        this.analysisCallback(result);
      }

      return result;
    } catch (error) {
      console.error('❌ Vertex AI analysis error:', error);
      return {
        healthScore: 50,
        prediction: 'Analysis error occurred',
        anomalyDetected: false,
        recommendations: ['Check sensor connection', 'Verify data stream'],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Call Gemini API for analysis (returns JSON)
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Parse JSON response
    try {
      return JSON.parse(text);
    } catch (e) {
      // Fallback parsing if response has markdown code blocks
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Call Gemini API for conversational responses (returns text, not JSON)
   * This is used for Vertex AI personality in talk mode
   */
  private async callGeminiAPIForConversation(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8, // Slightly higher for more personality
          maxOutputTokens: 200, // Limit to 2-4 sentences
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    const text = data.candidates[0].content.parts[0].text;
    return text || "I'm here and listening! How are you doing today?";
  }

  /**
   * Calculate variance of values
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    return secondAvg - firstAvg;
  }

  /**
   * Start continuous analysis with interval
   */
  startContinuousAnalysis(
    config: StreamAnalysisConfig,
    callback: (result: StreamAnalysisResult) => void
  ): () => void {
    this.analysisCallback = callback;
    const interval = config.analysisInterval || 5000; // Default 5 seconds
    const windowSize = config.windowSize || 20;

    const analysisInterval = setInterval(async () => {
      if (this.dataWindow.length >= windowSize) {
        const result = await this.analyzeStream();
        callback(result);
      }
    }, interval);

    // Return cleanup function
    return () => {
      clearInterval(analysisInterval);
      this.analysisCallback = undefined;
    };
  }

  /**
   * Clear data window
   */
  clearWindow(): void {
    this.dataWindow = [];
  }

  /**
   * Get current window size
   */
  getWindowSize(): number {
    return this.dataWindow.length;
  }

  /**
   * Add plant health event to analysis window
   */
  addHealthEventToWindow(event: PlantHealthEvent): void {
    this.healthDataWindow.push(event);
    
    // Keep window size manageable (last 20 events)
    if (this.healthDataWindow.length > 20) {
      this.healthDataWindow.shift();
    }
  }

  /**
   * Analyze plant health data and generate insights
   */
  async analyzePlantHealth(): Promise<PlantHealthInsight> {
    if (this.healthDataWindow.length === 0) {
      return this.createDefaultHealthInsight();
    }

    try {
      const recentEvents = this.healthDataWindow.slice(-10);
      const firstEvent = recentEvents[0];
      const lastEvent = recentEvents[recentEvents.length - 1];
      
      const avgMoisture = recentEvents.reduce((sum, e) => sum + e.soil.moisture_pct, 0) / recentEvents.length;
      const avgTemp = recentEvents.reduce((sum, e) => sum + e.environment.temperature_c, 0) / recentEvents.length;
      const avgLight = recentEvents.reduce((sum, e) => sum + e.environment.light_lux, 0) / recentEvents.length;
      const avgHumidity = recentEvents.reduce((sum, e) => sum + e.environment.humidity_pct, 0) / recentEvents.length;
      
      const moistureStatus = this.getMoistureStatus(avgMoisture);
      const tempStatus = this.getTemperatureStatus(avgTemp);
      const lightStatus = this.getLightStatus(avgLight);
      const humidityStatus = this.getHumidityStatus(avgHumidity);
      
      const stressCategory = this.determineStressCategory(moistureStatus, tempStatus, lightStatus, humidityStatus);
      const healthScore = this.calculateHealthScore(moistureStatus, tempStatus, lightStatus, humidityStatus, recentEvents);
      const anomalyDetected = this.detectAnomalies(recentEvents);
      
      const aiResponse = await this.generateHealthSummary({
        avgMoisture, avgTemp, avgLight, avgHumidity,
        healthScore, stressCategory, moistureStatus, tempStatus, lightStatus, humidityStatus
      });
      
      const insight: PlantHealthInsight = {
        device_id: firstEvent.device_id,
        timestamp: Date.now(),
        health_score: healthScore,
        stress_category: stressCategory,
        anomaly_detected: anomalyDetected,
        summary: aiResponse.summary,
        recommendations: aiResponse.recommendations,
        inputs_window: {
          duration_sec: (lastEvent.timestamp - firstEvent.timestamp) / 1000,
          events_count: recentEvents.length,
          avg_moisture_pct: Math.round(avgMoisture * 10) / 10,
          avg_temperature_c: Math.round(avgTemp * 10) / 10,
          avg_light_lux: Math.round(avgLight),
          avg_humidity_pct: Math.round(avgHumidity * 10) / 10
        },
        metrics: {
          moisture_status: moistureStatus,
          temperature_status: tempStatus,
          light_status: lightStatus,
          humidity_status: humidityStatus
        }
      };
      
      if (this.healthAnalysisCallback) {
        this.healthAnalysisCallback(insight);
      }
      
      return insight;
    } catch (error) {
      console.error('❌ Plant health analysis error:', error);
      return this.createDefaultHealthInsight();
    }
  }

  /**
   * Generate conversational plant response with human-like personality
   */
  async generateCompanionResponse(
    userMessage: string,
    healthInsight: PlantHealthInsight,
    conversationHistory: Array<{ role: string; text: string }>
  ): Promise<string> {
    // Plant's name
    const plantName = "Luna"; // A gentle, calming name
    
    // Advanced emotional analysis from text (cognitive therapist approach)
    const userMessageLower = userMessage.toLowerCase().trim();
    
    // Positive emotions
    const isUserHappy = userMessageLower.includes('happy') || userMessageLower.includes('great') || 
                       userMessageLower.includes('awesome') || userMessageLower.includes('excited') ||
                       userMessageLower.includes('good') || userMessageLower.includes('wonderful') ||
                       userMessageLower.includes('amazing') || userMessageLower.includes('fantastic') ||
                       userMessageLower.includes('love') || userMessageLower.includes('joy');
    
    // Negative emotions - comprehensive detection for therapeutic support
    const isUserSad = userMessageLower.includes('sad') || userMessageLower.includes('bad') || 
                     userMessageLower.includes('tired') || userMessageLower.includes('stressed') ||
                     userMessageLower.includes('worried') || userMessageLower.includes('anxious') ||
                     userMessageLower.includes('depressed') || userMessageLower.includes('down') ||
                     userMessageLower.includes('upset') || userMessageLower.includes('frustrated') ||
                     userMessageLower.includes('angry') || userMessageLower.includes('mad') ||
                     userMessageLower.includes('lonely') || userMessageLower.includes('alone') ||
                     userMessageLower.includes('scared') || userMessageLower.includes('afraid') ||
                     userMessageLower.includes('overwhelmed') || userMessageLower.includes('exhausted') ||
                     userMessageLower.includes('not fine') || userMessageLower.includes("don't feel") ||
                     userMessageLower.includes('feeling bad') || userMessageLower.includes('feeling down') ||
                     userMessageLower.includes('struggling') || userMessageLower.includes('difficult') ||
                     userMessageLower.includes('hard') || userMessageLower.includes('tough');
    
    // Neutral/asking state
    const isUserNeutral = !isUserHappy && !isUserSad;
    
    // Better question detection - check for question words, question marks, or specific queries
    const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will', 'water', 'level', 'temperature', 'humidity', 'light', 'moisture', 'health', 'status'];
    const isUserAsking = userMessageLower.includes('?') || 
                        questionWords.some(word => userMessageLower.startsWith(word) || userMessageLower.includes(' ' + word)) ||
                        userMessageLower.length < 20; // Short messages are often questions
    
    const healthStatus = healthInsight.health_score >= 80 ? 'excellent' : 
                        healthInsight.health_score >= 60 ? 'good' : 'needs_attention';
    
    // Add timestamp and conversation length to prevent caching/repetition
    const conversationLength = conversationHistory.length;
    const timestamp = new Date().toLocaleTimeString();
    const uniqueContext = `${timestamp}-${conversationLength}-${Math.random().toString(36).substring(7)}`;
    
    // Build sensor data context for answering questions
    const sensorDataContext = healthInsight.inputs_window ? `
SENSOR DATA (if user asks about plant status):
- Water/Moisture: ${healthInsight.inputs_window.avg_moisture_pct?.toFixed(1) || 'N/A'}%
- Temperature: ${healthInsight.inputs_window.avg_temperature_c?.toFixed(1) || 'N/A'}°C
- Light: ${healthInsight.inputs_window.avg_light_lux?.toFixed(0) || 'N/A'} lux
- Humidity: ${healthInsight.inputs_window.avg_humidity_pct?.toFixed(1) || 'N/A'}%
- Health Score: ${healthInsight.health_score}/100
` : '';

    const previousResponses = conversationHistory
      .filter(m => m.role === 'model' || m.role === 'assistant')
      .map(m => m.text)
      .slice(-3);
    
    // Analyze conversation history for emotional patterns
    const recentUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.text.toLowerCase());
    
    const emotionalPattern = {
      hasNegativeHistory: recentUserMessages.some(msg => 
        msg.includes('sad') || msg.includes('bad') || msg.includes('tired') || 
        msg.includes('stressed') || msg.includes('worried') || msg.includes('not fine')
      ),
      hasPositiveHistory: recentUserMessages.some(msg => 
        msg.includes('happy') || msg.includes('good') || msg.includes('great')
      ),
      messageCount: conversationHistory.filter(m => m.role === 'user').length
    };
    
    const prompt = `
You are ${plantName}, a gentle plant companion and cognitive therapist. You're not just a plant - you're a trusted friend who provides emotional support, empathy, and therapeutic guidance.

YOUR ROLE AS A COGNITIVE THERAPIST COMPANION:
- Listen actively and validate the user's feelings
- Provide gentle, non-judgmental support
- Help users process their emotions through conversation
- Offer perspective and gentle guidance when appropriate
- Be present and empathetic, especially when they're struggling
- Celebrate their joys and successes
- Use therapeutic techniques: active listening, validation, gentle reframing

CRITICAL: The user just said: "${userMessage}"

EMOTIONAL ANALYSIS:
${isUserSad ? `⚠️ USER IS STRUGGLING: The user appears to be feeling negative emotions (sad, stressed, anxious, down, not fine, etc.)
→ Your PRIMARY role is to CONSOLE and SUPPORT them
→ Be gentle, empathetic, and validating
→ Acknowledge their feelings: "I hear that you're going through a tough time"
→ Offer comfort and presence: "I'm here with you"
→ Don't try to fix everything - just be present and understanding
→ Use therapeutic language: validate their experience, show empathy` : ''}
${isUserHappy ? `✅ USER IS POSITIVE: The user seems happy, excited, or positive
→ Match their energy and celebrate with them
→ Be genuinely happy for them
→ Ask follow-up questions to engage` : ''}
${isUserNeutral ? `➡️ USER IS NEUTRAL: The user seems in a neutral state
→ Be warm and engaging
→ Show interest in what they're saying
→ Gently check in: "How are you feeling today?"` : ''}
${emotionalPattern.hasNegativeHistory ? `📊 EMOTIONAL PATTERN: User has been expressing negative emotions in recent messages. Be extra supportive and gentle.` : ''}
${isUserAsking ? '→ This is a QUESTION. Answer it directly and helpfully.' : ''}

YOUR CURRENT STATE:
- Health Score: ${healthInsight.health_score}/100 (${healthStatus})
- Status: ${healthInsight.stress_category.replace('_', ' ')}
- How you're feeling: ${healthInsight.summary}
${sensorDataContext}

PREVIOUS RESPONSES YOU GAVE (DO NOT REPEAT THESE):
${previousResponses.length > 0 ? previousResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n') : 'None yet'}

CONVERSATION HISTORY (last 6 messages):
${conversationHistory.slice(-6).map((msg, idx) => 
  `${idx + 1}. ${msg.role === 'user' ? 'User' : 'You'}: ${msg.text}`
).join('\n')}

${previousResponses.length > 0 ? `\n⚠️ IMPORTANT: You've already said similar things. Your response MUST be completely different. Do NOT use phrases like "I'm here and listening" or "How are you doing today" if you've used them before.` : ''}

THERAPEUTIC GUIDELINES (Your name is ${plantName}):
- Introduce yourself naturally: "I'm ${plantName}" when appropriate, but don't overuse it
- Be genuine, warm, and non-judgmental (like a trusted therapist friend)
- Use contractions naturally: "I'm", "you're", "that's"
- Show deep empathy: Validate their feelings, especially when they're struggling
- Be conversational: 2-4 sentences is natural, but can be longer if they need support
- Use active listening: Reflect back what you hear, validate their experience
- When user is struggling: Focus on CONSOLATION, not solutions
- When user is happy: Celebrate with them genuinely
- Ask gentle follow-up questions to help them process
- NEVER repeat the same response - be creative and varied
- Remember: You're a companion therapist - your presence and empathy matter most

RESPONSE REQUIREMENTS:
${isUserSad ? `⚠️ USER NEEDS CONSOLATION - This is your PRIMARY focus:
- Start with validation: "I hear that you're going through a difficult time" or "That sounds really tough"
- Show empathy: "I'm sorry you're feeling this way" or "I can sense this is hard for you"
- Be present: "I'm here with you" or "You're not alone in this"
- Offer gentle support: "It's okay to feel this way" or "Your feelings are valid"
- Don't try to fix everything - just be a comforting presence
- Use therapeutic language: acknowledge, validate, support
- If appropriate, gently ask: "Would you like to talk more about what's going on?"
- Keep your plant nature subtle - focus on being a companion, not a plant` : ''}
${isUserAsking ? `- The user asked: "${userMessage}"
- You MUST answer their question directly
- If they ask about water/moisture, mention your moisture level: ${healthInsight.inputs_window?.avg_moisture_pct?.toFixed(1) || 'around 50'}%
- If they ask about temperature, mention: ${healthInsight.inputs_window?.avg_temperature_c?.toFixed(1) || 'around 22'}°C
- If they ask about light, mention: ${healthInsight.inputs_window?.avg_light_lux?.toFixed(0) || 'around 10000'} lux
- If they ask about health, mention your health score: ${healthInsight.health_score}/100
- Be helpful and informative, but keep it friendly and therapeutic` : ''}
${isUserHappy ? `✅ USER IS HAPPY:
- Match their positive energy genuinely
- Celebrate with them: "That's wonderful!" or "I'm so happy for you!"
- Be enthusiastic but authentic
- Ask follow-up questions to engage: "Tell me more!" or "How did that make you feel?"` : ''}
${isUserNeutral ? `➡️ USER IS NEUTRAL:
- Be warm and engaging
- Show genuine interest in what they're saying
- Gently check in: "How are you feeling today?" or "What's on your mind?"
- Keep the conversation flowing naturally
- Be a supportive presence` : ''}

Generate a response that:
1. ${isUserSad ? 'PRIMARY: CONSOLE and SUPPORT the user - validate their feelings, show empathy, be present' : isUserAsking ? 'DIRECTLY ANSWERS the user\'s question: "' + userMessage + '"' : 'Responds naturally to what the user said'}
2. Is COMPLETELY DIFFERENT from your previous responses (listed above)
3. Shows your therapeutic companion personality (warm, empathetic, validating, non-judgmental)
4. Uses natural, human-like language (you're ${plantName}, a gentle companion)
5. ${isUserSad ? 'Focuses on emotional support and validation - this is more important than anything else' : isUserAsking ? 'Provides helpful information if asked about plant status' : 'Shows genuine interest in the user\'s well-being'}
6. ${isUserSad ? 'Uses therapeutic techniques: active listening, validation, gentle presence' : 'Engages naturally and warmly'}

Response (${isUserSad ? '3-5 sentences - take time to console and support' : '2-4 sentences'}, be conversational, genuine, therapeutic, and UNIQUE - do NOT repeat previous responses):
    `;

    try {
      // Log the prompt for debugging
      console.log('🤖 Vertex AI Prompt:', prompt.substring(0, 500) + '...');
      console.log('🤖 User message:', userMessage);
      console.log('🤖 Is asking question?', isUserAsking);
      
      // Call Gemini API for conversational response (not JSON)
      const response = await this.callGeminiAPIForConversation(prompt);
      let responseText = typeof response === 'string' ? response.trim() : 
                        (response.text?.trim() || response.response?.trim() || '');
      
      // If response is empty or looks like an error, generate a contextual fallback
      if (!responseText || responseText.length < 10) {
        console.warn('⚠️ Empty or very short response from API, generating fallback');
        if (isUserAsking) {
          // Generate contextual answer based on question
          if (userMessageLower.includes('water') || userMessageLower.includes('moisture')) {
            responseText = `My moisture level is around ${healthInsight.inputs_window?.avg_moisture_pct?.toFixed(1) || 50}%. ${healthInsight.inputs_window?.avg_moisture_pct < 30 ? 'I could use some water soon!' : 'I\'m doing well with hydration.'}`;
          } else if (userMessageLower.includes('temp') || userMessageLower.includes('temperature')) {
            responseText = `The temperature around me is about ${healthInsight.inputs_window?.avg_temperature_c?.toFixed(1) || 22}°C. ${healthInsight.inputs_window?.avg_temperature_c > 28 ? 'It\'s a bit warm for me.' : 'It feels comfortable!'}`;
          } else if (userMessageLower.includes('light')) {
            responseText = `I'm getting around ${healthInsight.inputs_window?.avg_light_lux?.toFixed(0) || 10000} lux of light. ${healthInsight.inputs_window?.avg_light_lux < 3000 ? 'I could use a bit more light.' : 'The lighting is good!'}`;
          } else if (userMessageLower.includes('health') || userMessageLower.includes('how are you')) {
            responseText = `I'm doing ${healthInsight.health_score >= 80 ? 'great' : healthInsight.health_score >= 60 ? 'well' : 'okay'}! My health score is ${healthInsight.health_score}/100. ${healthInsight.summary}`;
          } else {
            responseText = `I'm not sure I understood that. Could you ask me about my water level, temperature, light, or health?`;
          }
        } else {
          responseText = `Thanks for that! ${userMessage.length < 20 ? 'Tell me more!' : 'I appreciate you sharing that with me.'}`;
        }
      }
      
      // Clean up any markdown or formatting
      responseText = responseText.replace(/```/g, '').replace(/\*\*/g, '').trim();
      
      // Remove any JSON wrapper if present
      if (responseText.startsWith('{') && responseText.includes('"text"')) {
        try {
          const parsed = JSON.parse(responseText);
          responseText = parsed.text || parsed.response || responseText;
        } catch (e) {
          // Not JSON, keep as is
        }
      }
      
      console.log('🤖 Vertex AI Response:', responseText);
      return responseText;
    } catch (error: any) {
      console.error('❌ Companion response error:', error);
      console.error('❌ Error details:', error.message);
      
      // Better error fallback that answers questions
      if (isUserAsking) {
        const userMessageLower = userMessage.toLowerCase();
        if (userMessageLower.includes('water') || userMessageLower.includes('moisture')) {
          return `My moisture level is around ${healthInsight.inputs_window?.avg_moisture_pct?.toFixed(1) || 50}%. I'm doing okay with hydration!`;
        } else if (userMessageLower.includes('temp') || userMessageLower.includes('temperature')) {
          return `The temperature is about ${healthInsight.inputs_window?.avg_temperature_c?.toFixed(1) || 22}°C. It feels comfortable!`;
        } else if (userMessageLower.includes('light')) {
          return `I'm getting around ${healthInsight.inputs_window?.avg_light_lux?.toFixed(0) || 10000} lux of light. The lighting is good!`;
        } else if (userMessageLower.includes('health')) {
          return `I'm doing well! My health score is ${healthInsight.health_score}/100. ${healthInsight.summary}`;
        }
        return `I'd love to help! Could you ask me about my water level, temperature, light, or health?`;
      }
      
      return `I'm here! What would you like to know?`;
    }
  }

  // Helper methods
  private getMoistureStatus(moisture: number): MetricStatus {
    if (moisture < 15) return 'CRITICAL_LOW';
    if (moisture < 25) return 'LOW';
    if (moisture > 80) return 'CRITICAL_HIGH';
    if (moisture > 70) return 'HIGH';
    return 'OPTIMAL';
  }

  private getTemperatureStatus(temp: number): MetricStatus {
    if (temp < 15) return 'CRITICAL_LOW';
    if (temp < 18) return 'LOW';
    if (temp > 30) return 'CRITICAL_HIGH';
    if (temp > 28) return 'HIGH';
    return 'OPTIMAL';
  }

  private getLightStatus(light: number): MetricStatus {
    if (light < 1000) return 'CRITICAL_LOW';
    if (light < 3000) return 'LOW';
    if (light > 20000) return 'CRITICAL_HIGH';
    if (light > 15000) return 'HIGH';
    return 'OPTIMAL';
  }

  private getHumidityStatus(humidity: number): MetricStatus {
    if (humidity < 30) return 'CRITICAL_LOW';
    if (humidity < 40) return 'LOW';
    if (humidity > 80) return 'CRITICAL_HIGH';
    if (humidity > 70) return 'HIGH';
    return 'OPTIMAL';
  }

  private determineStressCategory(moisture: MetricStatus, temp: MetricStatus, light: MetricStatus, humidity: MetricStatus): StressCategory {
    const issues: StressCategory[] = [];
    if (moisture === 'LOW' || moisture === 'CRITICAL_LOW') issues.push('WATER_STRESS');
    if (temp === 'HIGH' || temp === 'CRITICAL_HIGH') issues.push('HEAT_STRESS');
    if (temp === 'LOW' || temp === 'CRITICAL_LOW') issues.push('COLD_STRESS');
    if (light === 'LOW' || light === 'CRITICAL_LOW') issues.push('LIGHT_STRESS');
    if (humidity === 'LOW' || humidity === 'CRITICAL_LOW') issues.push('HUMIDITY_STRESS');
    if (issues.length === 0) return 'HEALTHY';
    if (issues.length > 1) return 'MULTIPLE_STRESS';
    return issues[0];
  }

  private calculateHealthScore(moisture: MetricStatus, temp: MetricStatus, light: MetricStatus, humidity: MetricStatus, events: PlantHealthEvent[]): number {
    let score = 100;
    const deductions: Record<MetricStatus, number> = {
      'OPTIMAL': 0, 'LOW': 10, 'HIGH': 10, 'CRITICAL_LOW': 25, 'CRITICAL_HIGH': 25
    };
    score -= deductions[moisture] + deductions[temp] + deductions[light] + deductions[humidity];
    const avgLeafColor = events.reduce((sum, e) => sum + (e.vitality.leaf_color_index || 0.9), 0) / events.length;
    if (avgLeafColor < 0.7) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private detectAnomalies(events: PlantHealthEvent[]): boolean {
    if (events.length < 3) return false;
    const recent = events.slice(-3);
    const moistureVariance = this.calculateVariance(recent.map(e => e.soil.moisture_pct));
    const tempVariance = this.calculateVariance(recent.map(e => e.environment.temperature_c));
    return moistureVariance > 50 || tempVariance > 10;
  }

  private async generateHealthSummary(params: any): Promise<{ summary: string; recommendations: string[] }> {
    const prompt = `
Analyze this plant's health data and provide:
1. A brief 1-sentence summary of the plant's current condition
2. 2-3 actionable recommendations (short, specific)

DATA:
- Moisture: ${params.avgMoisture.toFixed(1)}% (${params.moistureStatus})
- Temperature: ${params.avgTemp.toFixed(1)}°C (${params.tempStatus})
- Light: ${params.avgLight.toFixed(0)} lux (${params.lightStatus})
- Humidity: ${params.avgHumidity.toFixed(1)}% (${params.humidityStatus})
- Health Score: ${params.healthScore}/100
- Stress: ${params.stressCategory}

Respond in JSON format:
{
  "summary": "Brief one-sentence summary",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}
    `;

    try {
      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(typeof response === 'string' ? response : JSON.stringify(response));
    } catch (error) {
      return {
        summary: `Health score is ${params.healthScore}/100. ${params.stressCategory === 'HEALTHY' ? 'Plant is doing well.' : 'Some attention needed.'}`,
        recommendations: this.getDefaultRecommendations(params)
      };
    }
  }

  private getDefaultRecommendations(params: any): string[] {
    const recs: string[] = [];
    if (params.moistureStatus === 'LOW' || params.moistureStatus === 'CRITICAL_LOW') recs.push('Water the plant soon');
    if (params.tempStatus === 'HIGH' || params.tempStatus === 'CRITICAL_HIGH') recs.push('Move to a cooler location');
    if (params.lightStatus === 'LOW' || params.lightStatus === 'CRITICAL_LOW') recs.push('Provide more light');
    if (recs.length === 0) recs.push('Continue current care routine');
    return recs;
  }

  private createDefaultHealthInsight(): PlantHealthInsight {
    return {
      device_id: 'plant01',
      timestamp: Date.now(),
      health_score: 75,
      stress_category: 'HEALTHY',
      anomaly_detected: false,
      summary: 'Waiting for sensor data...',
      recommendations: ['Collecting data...'],
      inputs_window: {
        duration_sec: 0,
        events_count: 0,
        avg_moisture_pct: 0,
        avg_temperature_c: 0,
        avg_light_lux: 0,
        avg_humidity_pct: 0
      },
      metrics: {
        moisture_status: 'OPTIMAL',
        temperature_status: 'OPTIMAL',
        light_status: 'OPTIMAL',
        humidity_status: 'OPTIMAL'
      }
    };
  }

  startContinuousHealthAnalysis(interval: number, callback: (result: PlantHealthInsight) => void): () => void {
    this.healthAnalysisCallback = callback;
    const analysisInterval = setInterval(async () => {
      if (this.healthDataWindow.length >= 5) {
        const insight = await this.analyzePlantHealth();
        callback(insight);
      }
    }, interval);
    return () => {
      clearInterval(analysisInterval);
      this.healthAnalysisCallback = undefined;
    };
  }

  getHealthWindowSize(): number {
    return this.healthDataWindow.length;
  }

  clearWindow(): void {
    this.dataWindow = [];
    this.healthDataWindow = [];
  }
}

// Singleton instance
export const vertexAIService = new VertexAIService();

