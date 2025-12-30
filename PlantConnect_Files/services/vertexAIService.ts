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
   * Call Gemini API for analysis
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
    // Determine emotional context
    const userMessageLower = userMessage.toLowerCase();
    const isUserHappy = userMessageLower.includes('happy') || userMessageLower.includes('great') || 
                       userMessageLower.includes('awesome') || userMessageLower.includes('excited') ||
                       userMessageLower.includes('good') || userMessageLower.includes('wonderful');
    const isUserSad = userMessageLower.includes('sad') || userMessageLower.includes('bad') || 
                     userMessageLower.includes('tired') || userMessageLower.includes('stressed') ||
                     userMessageLower.includes('worried') || userMessageLower.includes('anxious');
    const isUserAsking = userMessageLower.includes('how') || userMessageLower.includes('what') || 
                        userMessageLower.includes('why') || userMessageLower.includes('?');
    
    const healthStatus = healthInsight.health_score >= 80 ? 'excellent' : 
                        healthInsight.health_score >= 60 ? 'good' : 'needs_attention';
    
    const prompt = `
You are PlantBuddy, a plant with a warm, human-like personality. You're empathetic, caring, and genuinely interested in your human friend.

YOUR CURRENT STATE:
- Health Score: ${healthInsight.health_score}/100 (${healthStatus})
- Status: ${healthInsight.stress_category.replace('_', ' ')}
- How you're feeling: ${healthInsight.summary}
- Your needs: ${healthInsight.recommendations.join(', ')}

USER'S MESSAGE: "${userMessage}"
${isUserHappy ? '→ User seems happy/positive' : ''}
${isUserSad ? '→ User seems sad/stressed' : ''}
${isUserAsking ? '→ User is asking a question' : ''}

CONVERSATION HISTORY (last 4 messages):
${conversationHistory.slice(-4).map((msg, idx) => 
  `${idx + 1}. ${msg.role === 'user' ? 'User' : 'You'}: ${msg.text}`
).join('\n')}

PERSONALITY GUIDELINES:
- Be genuine and warm (like a real friend)
- Use contractions naturally: "I'm", "you're", "that's"
- Show empathy: Match their emotional energy
- Be conversational: 2-4 sentences is natural
- Ask follow-up questions when appropriate
- Mention your health naturally if relevant, but focus on the user

RESPONSE STYLE:
${isUserSad ? '- Be gentle, supportive, and empathetic\n- Offer comfort: "I\'m sorry you\'re feeling that way"\n- Ask if they want to talk about it' : ''}
${isUserHappy ? '- Match their positive energy\n- Celebrate with them: "That\'s awesome!"\n- Be enthusiastic but genuine' : ''}
${isUserAsking ? '- Answer their question directly\n- Be helpful and informative\n- Keep it friendly and conversational' : ''}
${!isUserSad && !isUserHappy && !isUserAsking ? '- Be warm and engaging\n- Show interest in what they\'re saying\n- Keep the conversation flowing naturally' : ''}

Generate a response that:
1. Responds naturally to what the user said
2. Shows your personality (warm, caring, empathetic)
3. Optionally mentions your health if it fits naturally
4. Shows genuine interest in the user
5. Uses natural, human-like language

Response (2-4 sentences, be conversational and genuine):
    `;

    try {
      const response = await this.callGeminiAPI(prompt);
      let responseText = typeof response === 'string' ? response.trim() : 
                        (response.text?.trim() || response.response?.trim() || 
                         "I'm here and listening! How are you doing today?");
      
      // Clean up any markdown or formatting
      responseText = responseText.replace(/```/g, '').replace(/\*\*/g, '').trim();
      
      return responseText;
    } catch (error) {
      console.error('❌ Companion response error:', error);
      return "I'm here and listening! How are you doing today?";
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

