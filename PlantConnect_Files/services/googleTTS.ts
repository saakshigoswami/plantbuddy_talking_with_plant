/**
 * Google Cloud Text-to-Speech Service
 * 
 * Provides natural, human-like voice synthesis with personality and emotion
 * Uses Google Cloud TTS API with SSML support for expressive speech
 */

export interface VoiceConfig {
  name: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
  volumeGainDb?: number; // -96.0 to 16.0
}

export interface PersonalityVoice {
  name: string;
  description: string;
  baseVoice: VoiceConfig;
  emotionModifiers: {
    happy: { pitch: number; speakingRate: number };
    sad: { pitch: number; speakingRate: number };
    excited: { pitch: number; speakingRate: number };
    calm: { pitch: number; speakingRate: number };
    concerned: { pitch: number; speakingRate: number };
  };
}

/**
 * PlantBuddy Personality Voices
 * Each voice has distinct characteristics that match the plant's personality
 */
export const PLANTBUDDY_VOICES: PersonalityVoice[] = [
  {
    name: 'Friendly Companion',
    description: 'Warm, caring, and approachable - like a good friend',
    baseVoice: {
      name: 'en-US-Neural2-F',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 2.0,
      volumeGainDb: 0
    },
    emotionModifiers: {
      happy: { pitch: 4.0, speakingRate: 1.1 },
      sad: { pitch: -2.0, speakingRate: 0.9 },
      excited: { pitch: 6.0, speakingRate: 1.2 },
      calm: { pitch: 1.0, speakingRate: 0.95 },
      concerned: { pitch: 0.0, speakingRate: 0.9 }
    }
  },
  {
    name: 'Cheerful Optimist',
    description: 'Bright, energetic, and always positive',
    baseVoice: {
      name: 'en-US-Neural2-D',
      languageCode: 'en-US',
      ssmlGender: 'MALE',
      speakingRate: 1.05,
      pitch: 3.0,
      volumeGainDb: 2.0
    },
    emotionModifiers: {
      happy: { pitch: 5.0, speakingRate: 1.15 },
      sad: { pitch: 1.0, speakingRate: 0.95 },
      excited: { pitch: 7.0, speakingRate: 1.25 },
      calm: { pitch: 2.0, speakingRate: 1.0 },
      concerned: { pitch: 1.5, speakingRate: 1.0 }
    }
  },
  {
    name: 'Wise Mentor',
    description: 'Thoughtful, calm, and nurturing',
    baseVoice: {
      name: 'en-US-Neural2-J',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE',
      speakingRate: 0.95,
      pitch: 0.0,
      volumeGainDb: 0
    },
    emotionModifiers: {
      happy: { pitch: 2.0, speakingRate: 1.0 },
      sad: { pitch: -3.0, speakingRate: 0.85 },
      excited: { pitch: 3.0, speakingRate: 1.05 },
      calm: { pitch: -1.0, speakingRate: 0.9 },
      concerned: { pitch: -2.0, speakingRate: 0.9 }
    }
  }
];

export type Emotion = 'happy' | 'sad' | 'excited' | 'calm' | 'concerned' | 'neutral';

class GoogleTTSService {
  private apiKey: string = '';
  private currentVoice: PersonalityVoice = PLANTBUDDY_VOICES[0]; // Default: Friendly Companion
  private audioContext: AudioContext | null = null;

  /**
   * Initialize Google Cloud TTS
   */
  initialize(apiKey: string, voiceName?: string): void {
    this.apiKey = apiKey;
    
    if (voiceName) {
      const voice = PLANTBUDDY_VOICES.find(v => v.name === voiceName);
      if (voice) {
        this.currentVoice = voice;
      }
    }
    
    // Initialize Web Audio API context
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
    }
    
    console.log('✅ Google Cloud TTS initialized with voice:', this.currentVoice.name);
  }

  /**
   * Determine emotion based on plant health and context
   */
  private determineEmotion(healthScore: number, stressCategory: string, userMessage?: string): Emotion {
    // Analyze user message sentiment
    const message = (userMessage || '').toLowerCase();
    if (message.includes('sad') || message.includes('bad') || message.includes('tired') || message.includes('stressed')) {
      return 'concerned';
    }
    if (message.includes('happy') || message.includes('great') || message.includes('awesome') || message.includes('excited')) {
      return 'excited';
    }
    
    // Determine emotion from plant health
    if (healthScore >= 85) return 'happy';
    if (healthScore >= 70) return 'calm';
    if (healthScore >= 50) return 'concerned';
    if (healthScore < 50) return 'sad';
    
    return 'neutral';
  }

  /**
   * Generate SSML with emotion and personality
   */
  private generateSSML(text: string, emotion: Emotion): string {
    const modifiers = this.currentVoice.emotionModifiers[emotion];
    const voice = this.currentVoice.baseVoice;
    
    // Add pauses for natural speech
    const processedText = text
      .replace(/\./g, '.<break time="300ms"/>')
      .replace(/,/g, ',<break time="200ms"/>')
      .replace(/\?/g, '?<break time="400ms"/>')
      .replace(/!/g, '!<break time="350ms"/>');
    
    return `
      <speak>
        <voice name="${voice.name}">
          <prosody rate="${modifiers.speakingRate}" pitch="${modifiers.pitch}st">
            ${processedText}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  /**
   * Synthesize speech with personality and emotion
   */
  async speak(
    text: string,
    healthScore?: number,
    stressCategory?: string,
    userMessage?: string
  ): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️ Google Cloud TTS API key not set, falling back to Web Speech API');
      this.fallbackToWebSpeech(text);
      return;
    }

    try {
      const emotion = this.determineEmotion(
        healthScore || 75,
        stressCategory || 'HEALTHY',
        userMessage
      );
      
      const ssml = this.generateSSML(text, emotion);
      const modifiers = this.currentVoice.emotionModifiers[emotion];
      const voice = this.currentVoice.baseVoice;
      
      // Call Google Cloud Text-to-Speech API
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              ssml: ssml
            },
            voice: {
              languageCode: voice.languageCode,
              name: voice.name,
              ssmlGender: voice.ssmlGender
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: modifiers.speakingRate,
              pitch: modifiers.pitch,
              volumeGainDb: voice.volumeGainDb || 0,
              effectsProfileId: ['headphone-class-device'] // Better quality
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent; // Base64 encoded MP3
      
      // Decode and play audio
      await this.playAudio(audioContent);
      
    } catch (error) {
      console.error('❌ Google TTS error:', error);
      // Fallback to Web Speech API
      this.fallbackToWebSpeech(text);
    }
  }

  /**
   * Play decoded audio
   */
  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode audio
    const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
    
    // Create source and play
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  /**
   * Fallback to Web Speech API if Google TTS fails
   */
  private fallbackToWebSpeech(text: string): void {
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Speech synthesis not available');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Set personality voice
   */
  setVoice(voiceName: string): void {
    const voice = PLANTBUDDY_VOICES.find(v => v.name === voiceName);
    if (voice) {
      this.currentVoice = voice;
      console.log('🎤 Voice changed to:', voice.name);
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): PersonalityVoice[] {
    return PLANTBUDDY_VOICES;
  }

  /**
   * Get current voice
   */
  getCurrentVoice(): PersonalityVoice {
    return this.currentVoice;
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.audioContext) {
      // Stop any playing audio
      this.audioContext.suspend();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

// Singleton instance
export const googleTTSService = new GoogleTTSService();

