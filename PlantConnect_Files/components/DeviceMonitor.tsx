
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, ReferenceLine } from 'recharts';
import { Mic, Play, Pause, Save, Activity, Wifi, WifiOff, Leaf, Volume2, MicOff, Send, Terminal, Cpu, Settings, Usb, ToggleLeft, ToggleRight, AlertCircle, VolumeX, Music, MessageCircle, Sliders, Info } from 'lucide-react';
import { generatePlantResponse } from '../services/geminiService';
import { PlantDataPoint, ChatMessage } from '../types';
import { confluentService, PlantSensorEvent } from '../services/confluentService';
import { vertexAIService, StreamAnalysisResult } from '../services/vertexAIService';
import { PlantHealthSimulator } from '../services/plantHealthSimulator';
import { PlantSensorEvent as PlantHealthEvent, PlantHealthInsight } from '../types/plantHealth';
import PlantHealthDashboard from './PlantHealthDashboard';
import { googleTTSService, PLANTBUDDY_VOICES } from '../services/googleTTS';

// Extend Window interface for Web Speech API & Serial API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface Navigator {
    serial: any;
  }
}

interface DeviceMonitorProps {
  onSaveSession: (data: PlantDataPoint[]) => void;
  onSessionDataChange?: (data: PlantDataPoint[]) => void;
  onStreamingStateChange?: (state: { isStreaming: boolean; streamCount: number; analysisResults: any[] }) => void;
}

// Initial dummy data for the chart
const INITIAL_DATA = Array(50).fill(0).map((_, i) => ({ time: i, val: 0 }));

// --- BIO SYNTH ENGINE (Violin Emulation) ---
class BioSynth {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Violin Components
  osc1: OscillatorNode | null = null; // Main String
  osc2: OscillatorNode | null = null; // Octave Harmonic/Body
  
  // Vibrato (Essential for Violin sound)
  lfo: OscillatorNode | null = null;
  lfoGain: GainNode | null = null;

  // Filter (To simulate wood body resonance)
  filter: BiquadFilterNode | null = null;

  // Params
  params = {
    fmin: 196, // G3 (Violin lowest string)
    fmax: 1000,
    ampMax: 1.5, // Increased from 0.8 for stronger sound
    glide: 0.2, // Bowing friction (slower attack)
    vibratoSpeed: 6.0, // Hz
    vibratoDepth: 4.0, // Pitch wobble amount
    brightness: 2000 // Filter cutoff
  };
  
  // Master volume multiplier (can be adjusted via UI)
  masterVolume: number = 1.0;

  constructor() {}

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContext();
    
    // Master Output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; 
    
    // Filter (Resonance)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 1.0; // Slight resonance peak
    this.filter.frequency.value = this.params.brightness;

    // Connect Chain: Filter -> Master -> Out
    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Vibrato LFO
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = this.params.vibratoSpeed;
    
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = this.params.vibratoDepth;
    this.lfo.connect(this.lfoGain);

    // Oscillators (Sawtooth is best for bowed strings)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sawtooth';
    
    // Detune osc2 slightly for chorus/thickness
    this.osc2.detune.value = 10; 

    // Apply Vibrato to both oscillators
    this.lfoGain.connect(this.osc1.frequency);
    this.lfoGain.connect(this.osc2.frequency);

    // Connect Oscillators to Filter
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);

    // Start everything
    const now = this.ctx.currentTime;
    this.osc1.start(now);
    this.osc2.start(now);
    this.lfo.start(now);
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
    }
  }

  suspend() {
    if (this.ctx?.state === 'running') this.ctx.suspend();
  }

  update(raw: number, threshold: number) {
    if (!this.ctx || !this.masterGain || !this.osc1 || !this.osc2) return;

    const now = this.ctx.currentTime;
    const p = this.params;

    // GATE LOGIC: BOW LIFT
    // If raw value is less than or equal to threshold, stop bowing (silence).
    if (raw <= threshold) {
      // Fast release but not instant click
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0, now, 0.1); 
      return;
    }

    // AMPLITUDE MAPPING (Bow Pressure)
    const maxExpected = 120; 
    const inputRange = Math.max(1, maxExpected - threshold); 
    
    let normalizedInput = (raw - threshold) / inputRange;
    normalizedInput = Math.min(1.0, Math.max(0, normalizedInput));

    // Violin Volume: Needs minimum presence
    const minVol = 0.2; 
    const maxVol = p.ampMax;
    const targetAmp = minVol + (normalizedInput * (maxVol - minVol));

    // FREQUENCY MAPPING (Finger Position)
    // Non-linear mapping usually feels more musical
    const targetFreq = p.fmin + (normalizedInput * (p.fmax - p.fmin));

    // FILTER MAPPING (Tone brightness increases with intensity)
    const targetBrightness = 800 + (normalizedInput * 3000);

    // UPDATE AUDIO PARAMS
    // Apply master volume multiplier for stronger sound
    const finalAmp = targetAmp * this.masterVolume;
    this.masterGain.gain.setTargetAtTime(finalAmp, now, p.glide); // Bowing physics
    
    // Smooth frequency slide (Portamento)
    this.osc1.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.osc2.frequency.setTargetAtTime(targetFreq, now, 0.1);

    this.filter?.frequency.setTargetAtTime(targetBrightness, now, 0.2);
    
    // Vibrato increases slightly with intensity
    this.lfoGain?.gain.setTargetAtTime(p.vibratoDepth + (normalizedInput * 2), now, 0.5);
  }
  
  destroy() {
     this.ctx?.close();
  }
}


const DeviceMonitor: React.FC<DeviceMonitorProps> = ({ onSaveSession, onSessionDataChange, onStreamingStateChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [chartData, setChartData] = useState(INITIAL_DATA);
  
  // Hardware Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Simulation State
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(true); // Enable by default for demo
  const [isSimulatedTouching, setIsSimulatedTouching] = useState(false);
  const simulatedTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (simulatedTouchTimeoutRef.current) {
        clearTimeout(simulatedTouchTimeoutRef.current);
      }
    };
  }, []);

  // Settings
  const [soundThreshold, setSoundThreshold] = useState(50); // Default threshold
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [masterVolume, setMasterVolume] = useState(1.5); // Volume multiplier (1.0 = normal, higher = louder)

  // MODES: TALK (AI Voice) vs MUSIC (BioSynth)
  const [interactionMode, setInteractionMode] = useState<'TALK' | 'MUSIC'>('MUSIC');
  const synthRef = useRef<BioSynth | null>(null);

  // Arduino specific variables based on user code
  const [arduinoState, setArduinoState] = useState({
    topPoint: 0,
    interpolated: 0,
    baseline: 0, 
    value: 0,
    raw: 0
  });
  
  // High-performance Ref for buffering incoming serial data without re-renders
  const hardwareBufferRef = useRef({
    topPoint: 0,
    interpolated: 0,
    baseline: 0, 
    value: 0,     
    raw: 0        
  });

  const [sessionData, setSessionData] = useState<PlantDataPoint[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Confluent Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamCount, setStreamCount] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<StreamAnalysisResult[]>([]);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const cleanupAnalysisRef = useRef<(() => void) | null>(null);

  // Plant Health State
  const [healthSimulator] = useState(() => new PlantHealthSimulator('plant01', 'Monstera', 'living_room'));
  const [currentHealthInsight, setCurrentHealthInsight] = useState<PlantHealthInsight | null>(null);
  const [currentHealthReading, setCurrentHealthReading] = useState<{
    temperature: number;
    humidity: number;
    light: number;
    moisture: number;
  } | null>(null);
  const cleanupHealthAnalysisRef = useRef<(() => void) | null>(null);
  
  // Notify parent when session data changes
  useEffect(() => {
    onSessionDataChange?.(sessionData);
  }, [sessionData, onSessionDataChange]);

  // Voice selection state
  const [selectedVoice, setSelectedVoice] = useState<string>(PLANTBUDDY_VOICES[0].name);

  // Initialize Confluent, Vertex AI, and Google TTS on mount
  useEffect(() => {
    const initStreaming = async () => {
      try {
        // Get credentials from environment or localStorage
        const bootstrapServers = import.meta.env.VITE_CONFLUENT_BOOTSTRAP_SERVERS || localStorage.getItem('CONFLUENT_BOOTSTRAP_SERVERS');
        const apiKey = import.meta.env.VITE_CONFLUENT_API_KEY || localStorage.getItem('CONFLUENT_API_KEY');
        const apiSecret = import.meta.env.VITE_CONFLUENT_API_SECRET || localStorage.getItem('CONFLUENT_API_SECRET');
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
        const ttsApiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY || localStorage.getItem('GOOGLE_TTS_API_KEY') || geminiKey; // Can use same key

        if (bootstrapServers && apiKey && apiSecret) {
          await confluentService.initialize({
            bootstrapServers,
            apiKey,
            apiSecret,
            topic: import.meta.env.VITE_CONFLUENT_TOPIC || 'plant-sensor-data'
          });
        }

        if (geminiKey) {
          vertexAIService.initialize({
            apiKey: geminiKey,
            projectId: import.meta.env.VITE_GCP_PROJECT_ID,
            location: import.meta.env.VITE_GCP_LOCATION || 'us-central1'
          });
        }

        // Initialize Google Cloud Text-to-Speech
        if (ttsApiKey) {
          googleTTSService.initialize(ttsApiKey, selectedVoice);
        }
      } catch (error) {
        console.warn('⚠️ Streaming services not configured:', error);
      }
    };

    initStreaming();
  }, [selectedVoice]);

  // Stream plant health data to Confluent when streaming is enabled
  useEffect(() => {
    if (!isStreaming || !confluentService.isReady()) return;

    const streamHealthData = async () => {
      // Generate plant health reading (includes capacitance from touch)
      const healthEvent = healthSimulator.generateReading(arduinoState.raw);
      
      // Update current reading for display
      setCurrentHealthReading({
        temperature: healthEvent.environment.temperature_c,
        humidity: healthEvent.environment.humidity_pct,
        light: healthEvent.environment.light_lux,
        moisture: healthEvent.soil.moisture_pct
      });

      try {
        // Stream to Confluent Cloud
        await confluentService.streamPlantHealthData(healthEvent);
        setStreamCount(prev => {
          const updated = prev + 1;
          onStreamingStateChange?.({
            isStreaming: true,
            streamCount: updated,
            analysisResults
          });
          return updated;
        });
        
        // Add to Vertex AI health analysis window
        vertexAIService.addHealthEventToWindow(healthEvent);
      } catch (error) {
        console.error('Failed to stream health data:', error);
      }
    };

    // Stream every 1 second when enabled
    const streamInterval = setInterval(streamHealthData, 1000);
    return () => clearInterval(streamInterval);
  }, [isStreaming, arduinoState, isConnected, healthSimulator, analysisResults, onStreamingStateChange]);

  // Start continuous health analysis when streaming
  useEffect(() => {
    if (!isStreaming) {
      if (cleanupHealthAnalysisRef.current) {
        cleanupHealthAnalysisRef.current();
        cleanupHealthAnalysisRef.current = null;
      }
      return;
    }

    // Start continuous health analysis (every 10 seconds)
    cleanupHealthAnalysisRef.current = vertexAIService.startContinuousHealthAnalysis(
      10000, // 10 seconds
      (insight) => {
        setCurrentHealthInsight(insight);
        // Also stream the insight to Confluent
        confluentService.streamHealthInsight(insight).catch(err => 
          console.error('Failed to stream health insight:', err)
        );
      }
    );

    return () => {
      if (cleanupHealthAnalysisRef.current) {
        cleanupHealthAnalysisRef.current();
        cleanupHealthAnalysisRef.current = null;
      }
    };
  }, [isStreaming]);

  // Serial Monitor State
  const [rawSerialBuffer, setRawSerialBuffer] = useState<string[]>([]);
  const [rxActive, setRxActive] = useState(false);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Refs
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  
  // Logic simulation refs
  const simulatedPeakRef = useRef(55); 
  const isTouchingRef = useRef(false);
  const isRecordingRef = useRef(isRecording);
  const valueRef = useRef(0);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Initialize Synth
  useEffect(() => {
    if (!synthRef.current) {
        synthRef.current = new BioSynth();
    }
    return () => {
      synthRef.current?.destroy();
      synthRef.current = null;
    }
  }, []);

  // Sync Hardware Buffer to UI State (Throttled)
  useEffect(() => {
    if (!isConnected && !isSimulationEnabled) return;
    
    const syncInterval = setInterval(() => {
      // Auto-Calibration Logic
      const currentRaw = hardwareBufferRef.current.raw;
      const currentBaseline = hardwareBufferRef.current.baseline;
      
      if (currentBaseline === 0 && currentRaw > 0) {
         hardwareBufferRef.current.baseline = currentRaw;
      } else if (currentRaw > 0) {
         const diff = Math.abs(currentRaw - currentBaseline);
         if (diff < 10) {
             hardwareBufferRef.current.baseline = currentBaseline * 0.99 + currentRaw * 0.01;
         }
      }

      // Calculate Deviation
      const deviation = Math.abs(currentRaw - hardwareBufferRef.current.baseline);
      hardwareBufferRef.current.value = Math.floor(deviation);

      // Update Synth ONLY if in MUSIC Mode
      // Crucial: We use currentRaw and check against soundThreshold inside update()
      if (interactionMode === 'MUSIC' && synthRef.current) {
        // Update master volume if changed
        synthRef.current.masterVolume = masterVolume;
        synthRef.current?.update(hardwareBufferRef.current.raw, soundThreshold);
      }

      setArduinoState({ 
          topPoint: hardwareBufferRef.current.topPoint,
          interpolated: hardwareBufferRef.current.interpolated,
          baseline: Math.floor(hardwareBufferRef.current.baseline),
          value: hardwareBufferRef.current.value,
          raw: hardwareBufferRef.current.raw
      });
      valueRef.current = hardwareBufferRef.current.value;
      
      setChartData(prev => {
         const newData = prev.length > 50 ? prev.slice(1) : prev;
         return [...newData, { time: timeRef.current++, val: hardwareBufferRef.current.raw }];
      });
    }, 33);

    return () => {
        clearInterval(syncInterval);
        // Don't mute here on interval clear, only on unmount or mode switch
    };
  }, [isConnected, isSimulationEnabled, interactionMode, soundThreshold, masterVolume]);

  // Trigger interactions
  useEffect(() => {
    const touchThreshold = 15; 
    const isTouch = valueRef.current > touchThreshold;
    
    if (isTouch && !isTouchingRef.current) {
        handleTouchStart();
    } else if (!isTouch && isTouchingRef.current) {
        handleTouchEnd();
    }
  }, [arduinoState.value]);

  // Cleanup speech listeners on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      
      // Auto-select a "good" voice if none selected
      if (!selectedVoiceURI && available.length > 0) {
          const preferred = available.find(v => v.name.includes("Google UK English Female")) || 
                           available.find(v => v.name.includes("Google US English")) ||
                           available[0];
          if (preferred) setSelectedVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);

  // TTS Logic with Google Cloud TTS (human-like personality voice)
  const speak = useCallback(async (text: string, allowInMusicMode = false) => {
    // Allow speaking in MUSIC mode only if explicitly allowed (for alerts)
    if (interactionMode !== 'TALK' && !allowInMusicMode) return;

    // Stop any current speech
    googleTTSService.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(true);

    try {
      // Use Google Cloud TTS with personality and emotion
      await googleTTSService.speak(
        text,
        currentHealthInsight?.health_score,
        currentHealthInsight?.stress_category,
        messages[messages.length - 1]?.text // Last user message for context
      );
    } catch (error) {
      console.warn('Google TTS failed, using fallback:', error);
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        
        if (selectedVoiceURI) {
          const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
          if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      // Note: Google TTS will set speaking to false when audio finishes
      // For now, we'll use a timeout as fallback
      setTimeout(() => setIsSpeaking(false), 5000);
    }
  }, [interactionMode, currentHealthInsight, messages, voices, selectedVoiceURI]);

  // Interaction Logic with Health Awareness
  const processInteraction = async (text: string, type: 'USER' | 'SYSTEM' | 'TOUCH', overrideValue?: number) => {
    if (isProcessing && type !== 'SYSTEM') return;
    setIsProcessing(true);

    const currentValue = overrideValue ?? valueRef.current;
    const normalizedIntensity = Math.min(100, Math.max(0, (currentValue / 50) * 100));

    if (type === 'USER') {
      const newUserMsg: ChatMessage = { role: 'user', text };
      setMessages(prev => [...prev, newUserMsg]);
      if (isRecordingRef.current) {
        setSessionData(prev => [...prev, {
          timestamp: Date.now(),
          capacitance: currentValue,
          sentiment: 'User Input',
          userMessage: text
        }]);
      }
    }

    try {
      // Include current user message in history for context
      const currentMessage = type === 'USER' ? { role: 'user', text } : null;
      const historyForService = [
        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : m.role === 'model' ? 'assistant' : 'user', text: m.text })),
        ...(currentMessage ? [currentMessage] : [])
      ];
      
      let prompt = text;
      if (type === 'SYSTEM') prompt = `[SYSTEM EVENT: ${text}]`;
      if (type === 'TOUCH') prompt = `[SENSORY INPUT: User touched the plant. Sensor Deviation: ${currentValue}]`;

      // Always use Vertex AI for talk mode (with personality)
      // Vertex AI provides the plant's personality and conversational abilities
      let responseText: string;
      
      // Create default health insight if we don't have one (for Vertex AI context)
      // Add variation to prevent repetition - change summary based on time and conversation length
      const conversationCount = messages.filter(m => m.role === 'user').length;
      const timeOfDay = new Date().getHours();
      const timeContext = timeOfDay < 12 ? 'morning' : timeOfDay < 18 ? 'afternoon' : 'evening';
      const defaultSummaries = [
        `I'm doing well this ${timeContext}! How are you?`,
        `Feeling good today! What's on your mind?`,
        `I'm here and ready to chat! How's your day?`,
        `Doing great! I'd love to hear from you.`,
        `I'm feeling healthy and happy! How about you?`
      ];
      const defaultSummary = defaultSummaries[conversationCount % defaultSummaries.length];
      
      const healthInsightForAI = currentHealthInsight || {
        device_id: 'plantbuddy-001',
        timestamp: Date.now(),
        health_score: 75 + Math.floor(Math.random() * 10), // Add slight variation
        stress_category: 'HEALTHY' as const,
        anomaly_detected: false,
        summary: defaultSummary,
        recommendations: ['Continue current care routine'],
        inputs_window: {
          duration_sec: 0,
          events_count: 0,
          avg_moisture_pct: 50,
          avg_temperature_c: 22,
          avg_light_lux: 10000,
          avg_humidity_pct: 60
        },
        metrics: {
          moisture_status: 'OPTIMAL' as const,
          temperature_status: 'OPTIMAL' as const,
          light_status: 'OPTIMAL' as const,
          humidity_status: 'OPTIMAL' as const
        }
      };
      
      // Use Vertex AI companion mode for all talk mode interactions
      if (interactionMode === 'TALK') {
        responseText = await vertexAIService.generateCompanionResponse(
          prompt,
          healthInsightForAI,
          historyForService
        );
      } else {
        // Fallback for other modes (shouldn't happen in TALK mode, but just in case)
        responseText = await generatePlantResponse(prompt, normalizedIntensity, historyForService);
      }
      
      const newModelMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, newModelMsg]);
      
      if (interactionMode === 'TALK') {
        // Use Google Cloud TTS with personality and emotion
        await speak(
          responseText,
          currentHealthInsight?.health_score,
          currentHealthInsight?.stress_category,
          type === 'USER' ? text : undefined
        );
      }

      if (isRecordingRef.current) {
        setSessionData(prev => [...prev, {
          timestamp: Date.now(),
          capacitance: currentValue,
          sentiment: 'Plant Response',
          plantResponse: responseText
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSession = () => {
    if (!isRecording) {
      setIsRecording(true);
      setMessages(prev => [...prev, { role: 'user', text: "Session Activated" }]);
      setTimeout(() => {
        processInteraction("The user has just activated the session. Wake up gently.", 'SYSTEM');
      }, 500);
      
      // Explicitly resume context on user action to prevent blocking
      if (interactionMode === 'MUSIC' && synthRef.current) {
         if (!synthRef.current.ctx) synthRef.current.init();
         synthRef.current.resume();
      }

    } else {
      setIsRecording(false);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (isListening) toggleListening();
      
      if (interactionMode === 'MUSIC') {
         synthRef.current?.suspend();
      }
    }
  };
  
  const handleModeSwitch = (mode: 'TALK' | 'MUSIC') => {
      setInteractionMode(mode);
      // Clear messages when switching to MUSIC mode
      if (mode === 'MUSIC') {
          setMessages([]);
          // Resume Audio Context on click
          if (!synthRef.current?.ctx) synthRef.current?.init();
          synthRef.current?.resume();
          window.speechSynthesis.cancel();
      } else {
          synthRef.current?.suspend();
      }
  };

  // --- WEB SERIAL & PARSING LOGIC (ASCII) ---
  const connectSerial = async () => {
    if (!navigator.serial) {
      setConnectionError("Web Serial API not supported. Use Chrome.");
      return;
    }
    try {
      setConnectionError(null);
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setIsSimulationEnabled(false); 
      readSerialLoop(port);
    } catch (err: any) {
      if (err.name === 'NotFoundError') setConnectionError("No device selected.");
      else setConnectionError("Connection failed (Port busy?).");
    }
  };

  const readSerialLoop = async (port: any) => {
    const reader = port.readable.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();
    let bufferString = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const text = decoder.decode(value, { stream: true });
          bufferString += text;
          let lines = bufferString.split('\n');
          bufferString = lines.pop() || "";
          for (const line of lines) if(line.trim()) parseSerialLine(line.trim());
        }
      }
    } catch (error) {
      console.error("Read error", error);
    } finally {
      reader.releaseLock();
      setIsConnected(false);
    }
  };

  const parseSerialLine = (line: string) => {
     setRxActive(true);
     setTimeout(() => setRxActive(false), 100);
     setRawSerialBuffer(prev => {
         const n = [...prev, line];
         return n.length > 8 ? n.slice(n.length - 8) : n;
     });
     const match = line.match(/TOP:([\-0-9.]+),VAL:([\-0-9.]+),INT:([\-0-9.]+)/);
     if (match) {
        // Enforce Integer parsing
        const rawInt = Math.round(parseFloat(match[3]));
        hardwareBufferRef.current.topPoint = parseFloat(match[1]);
        hardwareBufferRef.current.interpolated = rawInt;
        hardwareBufferRef.current.raw = rawInt; 
     }
  };

  // --- SIMULATION ENGINE (Fallback) ---
  useEffect(() => {
    if (isConnected || !isSimulationEnabled) return;
    const update = () => {
      // Use the actual value from valueRef if it's been set by simulated touch
      const currentValue = valueRef.current > 0 ? valueRef.current : (isTouchingRef.current ? 85 : 45);
      const targetPeak = isTouchingRef.current ? currentValue : 45; 
      simulatedPeakRef.current = simulatedPeakRef.current + (targetPeak - simulatedPeakRef.current) * 0.1;
      const noise = (Math.random() - 0.5) * 2; 
      const currentPeak = simulatedPeakRef.current + noise;
      const interpolated = Math.round(currentPeak * 10); 
      hardwareBufferRef.current.topPoint = Math.round(currentPeak);
      hardwareBufferRef.current.interpolated = interpolated;
      hardwareBufferRef.current.raw = Math.round(currentPeak); // Ensure Raw follows peak
      hardwareBufferRef.current.baseline = 45;
      
      // Update arduinoState for chart display
      setArduinoState(prev => ({
        ...prev,
        raw: Math.round(currentPeak),
        interpolated: interpolated,
        topPoint: Math.round(currentPeak)
      }));
      
      if (Math.random() > 0.8) {
         const simLine = `TOP:${Math.floor(currentPeak)},VAL:${Math.floor(Math.max(0, currentPeak-45))},INT:${interpolated/10}`;
         setRawSerialBuffer(prev => {
             const n = [...prev, simLine];
             return n.length > 8 ? n.slice(n.length - 8) : n;
         });
      }
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isConnected, isSimulationEnabled]);

  // Interaction Handlers
  const handleTouchStart = () => {
    isTouchingRef.current = true;
    if (isRecordingRef.current && !isProcessing) {
       setTimeout(() => {
         if (isTouchingRef.current) processInteraction("Touch", 'TOUCH', valueRef.current);
       }, 500);
    }
  };

  const handleTouchEnd = () => isTouchingRef.current = false;

  // Simulated touch handler for demo (when no device connected)
  const handleSimulatedTouch = (event: React.MouseEvent | React.TouchEvent) => {
    if (isConnected) return; // Don't simulate if real device is connected
    
    event.preventDefault();
    event.stopPropagation();
    
    // Generate a realistic touch value (between 30-90)
    const touchIntensity = Math.floor(Math.random() * 60) + 30; // 30-90 range
    const touchDuration = Math.random() * 1000 + 500; // 500-1500ms
    
    // Set touching state
    isTouchingRef.current = true;
    setIsSimulatedTouching(true);
    
    // Update the value immediately for visual feedback
    valueRef.current = touchIntensity;
    hardwareBufferRef.current.raw = touchIntensity;
    hardwareBufferRef.current.interpolated = touchIntensity * 10;
    hardwareBufferRef.current.topPoint = touchIntensity;
    
    // Trigger touch start
    handleTouchStart();
    
    // Process the touch interaction
    if (isRecordingRef.current) {
      setTimeout(() => {
        if (isTouchingRef.current) {
          processInteraction("Touch", 'TOUCH', touchIntensity);
        }
      }, 300);
    }
    
    // Add data point to session if recording
    if (isRecordingRef.current) {
      setSessionData(prev => [...prev, {
        timestamp: Date.now(),
        capacitance: touchIntensity,
        sentiment: 'Touch',
        userMessage: 'Simulated touch'
      }]);
    }
    
    // End touch after duration
    if (simulatedTouchTimeoutRef.current) {
      clearTimeout(simulatedTouchTimeoutRef.current);
    }
    
    simulatedTouchTimeoutRef.current = setTimeout(() => {
      isTouchingRef.current = false;
      setIsSimulatedTouching(false);
      handleTouchEnd();
      
      // Gradually decrease value
      const decreaseInterval = setInterval(() => {
        if (valueRef.current > 0) {
          valueRef.current = Math.max(0, valueRef.current - 2);
          hardwareBufferRef.current.raw = valueRef.current;
          hardwareBufferRef.current.interpolated = valueRef.current * 10;
        } else {
          clearInterval(decreaseInterval);
        }
      }, 50);
      
      setTimeout(() => clearInterval(decreaseInterval), 2000);
    }, touchDuration);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    processInteraction(text, 'USER');
  };

  const toggleListening = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert("Voice input not supported. Please use Chrome or Edge browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Changed to true to keep listening
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = true; // Show interim results
        recognitionRef.current.maxAlternatives = 1;
    }
    
    // Set up event handlers
    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
    };
    
    recognitionRef.current.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      // Auto-restart if still in listening mode (continuous mode)
      if (isListening) {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.log('Could not restart recognition:', e);
        }
      }
    };
    
    recognitionRef.current.onresult = (event: any) => {
      console.log('🎤 Speech recognition result:', event);
      // Get the final transcript
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update input field with interim results
      if (interimTranscript) {
        setInputText(interimTranscript);
      }
      
      // Process final transcript
      if (finalTranscript.trim()) {
        console.log('🎤 Final transcript:', finalTranscript);
        setInputText(finalTranscript.trim());
        // Process the interaction
        processInteraction(finalTranscript.trim(), 'USER');
        // Clear input after processing
        setTimeout(() => setInputText(''), 100);
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Microphone error: ';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          alert(errorMessage);
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User stopped, no need to show error
          return;
        default:
          errorMessage += event.error;
      }
      
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error(errorMessage);
      }
    };
    
    recognitionRef.current.onnomatch = () => {
      console.log('🎤 No speech match found');
    };
    
    try { 
      recognitionRef.current.start();
      console.log('🎤 Starting speech recognition...');
    } catch (e: any) {
      console.error('🎤 Failed to start recognition:', e);
      if (e.message?.includes('already started')) {
        // Recognition already running, stop and restart
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e2) {
            console.error('Failed to restart:', e2);
          }
        }, 100);
      } else {
        alert('Failed to start microphone. Please check your browser permissions and try again.');
        setIsListening(false);
      }
    }
  };

  const toggleStreaming = () => {
    if (!isStreaming) {
      // Check if Confluent is configured
      if (!confluentService.isReady()) {
        alert('⚠️ Confluent Cloud not configured. Please set up your credentials in environment variables or localStorage:\n\n- CONFLUENT_BOOTSTRAP_SERVERS\n- CONFLUENT_API_KEY\n- CONFLUENT_API_SECRET');
        return;
      }
      // Start new session
      sessionIdRef.current = `session-${Date.now()}`;
      setAnalysisResults([]);
      vertexAIService.clearWindow();
    }
    setIsStreaming(!isStreaming);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Streaming Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={toggleStreaming}
          className={`px-4 py-2 rounded-lg text-sm font-mono font-bold border transition-all flex items-center gap-2 ${
            isStreaming
              ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
          }`}
        >
          {isStreaming ? (
            <>
              <Wifi className="w-4 h-4" />
              STREAMING TO CONFLUENT
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              START REAL-TIME STREAM
            </>
          )}
        </button>
      </div>

      {/* Plant Health Dashboard */}
      <PlantHealthDashboard 
        healthInsight={currentHealthInsight}
        currentReading={currentHealthReading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      
      {/* LEFT: Hardware Visualizer */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 relative backdrop-blur-md shadow-xl min-h-[450px]">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-mono text-sky-400 tracking-wider">CAPACITANCE SENSOR</h2>
            </div>
            <div className="flex items-center gap-3">
               {connectionError && (
                 <div className="flex items-center gap-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                   <AlertCircle className="w-3 h-3" />
                   {connectionError}
                 </div>
               )}
               <button 
                 onClick={connectSerial}
                 disabled={isConnected}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all cursor-pointer shadow-lg ${
                   isConnected 
                     ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500 shadow-emerald-500/20' 
                     : 'bg-sky-400/20 text-sky-300 border-sky-400/50 hover:bg-sky-400/30 hover:border-sky-400 hover:text-white hover:shadow-sky-400/30'
                 }`}
               >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <Usb className="w-3 h-3" />}
                  {isConnected ? "CONNECTED" : "CONNECT DEVICE"}
               </button>
            </div>
          </div>
          
          {/* Device Not Connected Message - Welcome Note */}
          {!isConnected && (
            <div className="mb-4 p-4 bg-gradient-to-r from-sky-500/10 via-pink-500/10 to-sky-500/10 border-l-4 border-sky-400 rounded-lg shadow-lg backdrop-blur-sm relative pr-24">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Info className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-sky-300 mb-2 font-mono uppercase tracking-wide">
                    Welcome to PlantBuddy Demo
                  </h3>
                  <p className="text-xs font-mono text-slate-200 leading-relaxed">
                    PlantBuddy IOT device not connected to your system currently. Please select music mode to listen demo sound and tap on plant or select talk mode to have a demo conversation with plant, keep the threshold at 47 for better experience
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Graph */}
          <div className="w-full relative z-0 mb-4" style={{ height: '256px', minHeight: '256px', minWidth: '100%' }}>
             <div className="absolute top-0 left-0 z-10 text-[10px] font-mono text-slate-500 space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800 pointer-events-none">
                <div>RAW_INT: <span className="text-sky-400">{arduinoState.interpolated.toFixed(0)}</span></div>
                <div>THRESHOLD: <span className="text-pink-400">{soundThreshold}</span></div>
                <div>MODE: <span className={interactionMode === 'MUSIC' ? 'text-pink-400' : 'text-sky-400'}>{interactionMode}</span></div>
             </div>
            <ResponsiveContainer width="100%" height={256} minHeight={256} minWidth={0}>
              <LineChart data={chartData}>
                <YAxis domain={['auto', 'auto']} hide />
                <XAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} 
                  labelStyle={{display: 'none'}}
                  formatter={(value: number) => [`${value}`, 'Raw Value']}
                />
                <ReferenceLine y={soundThreshold} stroke="#FFC0CB" strokeDasharray="3 3" opacity={0.5} />
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke={arduinoState.raw > soundThreshold ? '#FFC0CB' : '#38BDF8'} 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Audio Controls */}
          <div className="relative z-10 space-y-3">
            {/* Threshold Slider Control */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
               <Sliders className="w-4 h-4 text-pink-400" />
               <div className="flex-1">
                 <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                   <span>TRIGGER THRESHOLD</span>
                   <span>{soundThreshold}</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={soundThreshold} 
                   onChange={(e) => setSoundThreshold(parseInt(e.target.value))}
                   className="w-full h-2 rounded-lg cursor-pointer accent-pink-400"
                 />
               </div>
            </div>
            
            {/* Volume Control */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
               <Volume2 className="w-4 h-4 text-green-400" />
               <div className="flex-1">
                 <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                   <span>SOUND VOLUME</span>
                   <span className="text-green-400 font-bold">{Math.round(masterVolume * 100)}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0.5" 
                   max="3.0" 
                   step="0.1"
                   value={masterVolume} 
                   onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                   className="w-full h-2 rounded-lg cursor-pointer accent-green-400"
                 />
                 <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                   <span>50%</span>
                   <span>100%</span>
                   <span>200%</span>
                   <span>300%</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Live Value Display (Background) */}
          <div className="absolute top-32 right-6 text-right pointer-events-none z-0">
             <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                RAW VALUE
             </div>
             <div className={`text-4xl font-mono font-bold transition-colors ${arduinoState.raw > soundThreshold ? 'text-pink-400 drop-shadow-[0_0_10px_rgba(255,192,203,0.5)]' : 'text-white'}`}>
               {arduinoState.raw}
             </div>
          </div>
        </div>

        {/* Serial & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                   <Cpu className="w-4 h-4 text-emerald-400" />
                   <span className="font-mono text-xs font-bold text-white">DEVICE STATE</span>
                </div>
                {!isConnected && (
                   <button 
                     onClick={() => setIsSimulationEnabled(!isSimulationEnabled)}
                     className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white"
                   >
                     {isSimulationEnabled ? <ToggleRight className="w-4 h-4 text-pink-400" /> : <ToggleLeft className="w-4 h-4" />}
                     TEST MODE
                   </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                 <div className="text-slate-400">Connection:</div> 
                 <div className={`text-right ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>{isConnected ? 'USB SERIAL' : 'OFFLINE'}</div>
                 <div className="text-slate-400">Audio Gate:</div> 
                 <div className={`text-right ${arduinoState.raw > soundThreshold ? 'text-pink-400 animate-pulse' : 'text-slate-600'}`}>
                    {arduinoState.raw > soundThreshold ? 'OPEN' : 'CLOSED'}
                 </div>
              </div>
           </div>

           <div className="bg-black p-4 rounded-xl border border-slate-800 font-mono text-[10px] relative overflow-hidden h-32 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2 z-10 bg-black/80 w-full justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  <span>SERIAL MONITOR</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${rxActive ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
              </div>
              <div className="flex-1 overflow-hidden text-emerald-400/70 leading-none opacity-70">
                 {rawSerialBuffer.map((line, i) => (
                   <span key={i} className="block border-b border-white/5 py-0.5">{line}</span>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT: Chat / Interaction Interface */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-visible shadow-2xl h-[600px] lg:h-auto relative">
        
        {/* Mode Switch Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 z-10">
           <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono font-bold text-white flex items-center gap-2">
                PLANT INTERFACE
              </h3>
              
              <button 
                  onClick={toggleSession}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                  isRecording 
                  ? 'bg-red-500/10 text-red-400 border-red-500/50' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50'
                  }`}
                >
                  {isRecording ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isRecording ? 'END SESSION' : 'START SESSION'}
                </button>
              </div>
           </div>
           
           {/* Toggle Switch */}
           <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                 onClick={() => handleModeSwitch('TALK')}
                 className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${interactionMode === 'TALK' ? 'bg-pink-400 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 <MessageCircle className="w-3 h-3" />
                 TALK MODE
              </button>
              <button
                 onClick={() => handleModeSwitch('MUSIC')}
                 className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${interactionMode === 'MUSIC' ? 'bg-pink-400 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 <Music className="w-3 h-3" />
                 MUSIC MODE
              </button>
           </div>
           
           {/* Personality Voice Selector (Only in Talk Mode) */}
           {interactionMode === 'TALK' && (
              <div className="mt-3 px-4 space-y-2">
                <label className="text-[10px] font-mono text-slate-500 block mb-1">PERSONALITY VOICE</label>
                <select 
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    googleTTSService.setVoice(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded p-1.5 focus:outline-none focus:border-pink-400"
                >
                  {PLANTBUDDY_VOICES.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
                <div className="text-[9px] font-mono text-slate-600 mt-1">
                  Powered by Google Cloud Text-to-Speech
                </div>
              </div>
           )}

           {/* Plant Image - Inside Plant Interface Box, Top Middle */}
           <div 
             className="flex flex-col items-center justify-center py-4 px-4 flex-shrink-0 border-t border-slate-800 mt-3"
             onClick={handleSimulatedTouch}
             onTouchStart={handleSimulatedTouch}
             style={{ cursor: 'pointer' }}
           >
             {/* Speech Bubble */}
             <div className="relative mb-2">
               <div className="bg-slate-800 border border-pink-400/30 rounded-2xl px-4 py-2 shadow-lg">
                 <p className="text-sm text-slate-200 font-mono">I'm happy you're here.</p>
               </div>
               <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                 <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800"></div>
               </div>
             </div>
             
             {/* Plant Image */}
             <div className={`relative transition-transform ${isSimulatedTouching ? 'scale-110' : 'scale-100'}`} style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img 
                 key={`plant-${interactionMode}`}
                 src="/assets/touch-plant.png" 
                 alt="Touch Plant" 
                 className={`object-contain ${isSimulatedTouching ? 'drop-shadow-[0_0_20px_rgba(255,192,203,0.6)]' : ''}`}
                 onError={(e) => {
                   const target = e.target as HTMLImageElement;
                   if (target.src.includes('.png')) {
                     target.src = '/assets/touch-plant.jpg';
                   } else if (target.src.includes('.jpg')) {
                     target.src = '/assets/hero-plant.jpg';
                   }
                 }}
                 style={{ 
                   width: '150px',
                   height: '150px',
                   objectFit: 'contain'
                 }}
               />
               {/* Music Note Icon */}
               {interactionMode === 'MUSIC' && (
                 <Music className="w-5 h-5 text-pink-400 absolute top-0 right-0" />
               )}
             </div>
             
             {/* Demo Button */}
             <button className="mt-3 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700/50 shadow-lg hover:bg-slate-700/90 transition-colors w-full">
               <p className="text-xs font-mono text-center text-white font-semibold">
                 {interactionMode === 'MUSIC' ? 'Tap on me to play demo plant piano' : 'Tap on me to talk with your plant'}
               </p>
             </button>
             
             {/* Simulated Touch Button */}
             <button 
               onClick={handleSimulatedTouch}
               className="mt-2 bg-pink-500/10 text-pink-400 border border-pink-500/30 px-3 py-1.5 rounded-lg text-xs font-mono hover:bg-pink-500/20 transition-colors"
             >
               Simulated touch for demo
             </button>
           </div>

           {/* Messages Area - Inside Plant Interface Box, Only in TALK Mode */}
           {interactionMode === 'TALK' && (
             <div 
               className="mt-3 px-4 overflow-y-auto space-y-4 scroll-smooth border-t border-slate-800 flex-1"
               style={{ maxHeight: '200px', minHeight: '100px' }}
             >
               {messages.length === 0 && isConnected && (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-4">
                   <Leaf className="w-8 h-8 mb-2" />
                   <p className="text-xs font-mono text-center">
                     Touch plant to chat.
                   </p>
                 </div>
               )}
               {messages.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}>
                   <div className={`max-w-[85%] p-2 rounded-2xl text-xs leading-relaxed ${
                     msg.role === 'user' 
                       ? 'bg-slate-700 border border-slate-600 text-white rounded-tr-none' 
                       : 'bg-slate-800 border border-pink-400/20 text-slate-200 rounded-tl-none'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
             </div>
           )}

           {/* Input Area - At Bottom of Plant Interface Box, Only in TALK Mode */}
           {interactionMode === 'TALK' && (
             <div className="px-4 pb-4 border-t border-slate-800 mt-auto">
               <div className="flex gap-2 pt-3">
                 <input
                   type="text"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                   placeholder={isListening ? "Listening..." : "Type message..."}
                   disabled={!isRecording || isListening}
                   className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none text-xs"
                 />
                 <button 
                   onClick={toggleListening}
                   disabled={!isRecording}
                   className={`p-2 rounded-lg transition-all border disabled:opacity-50 ${
                     isListening 
                     ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                     : 'bg-slate-800 text-pink-400 border-slate-700'
                   }`}
                 >
                   {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                 </button>
                 {!isListening && (
                   <button onClick={handleSendMessage} disabled={!isRecording || !inputText.trim()} className="p-2 bg-pink-400 text-slate-900 rounded-lg">
                     <Send className="w-4 h-4" />
                   </button>
                 )}
               </div>
             </div>
           )}
        </div>


        {/* Bio-Sonification Status - Bottom of Right Panel */}
        {interactionMode === 'MUSIC' && (
          <div className="mt-auto p-4 bg-slate-950/50 border-t border-slate-800">
            <div className="flex flex-col items-center justify-center text-pink-400 font-mono text-xs gap-1 py-1">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                <span>Bio-Sonification Active (Violin Mode)</span>
              </div>
              <div className="text-slate-500">
                (Signal: {arduinoState.raw} / Threshold: {soundThreshold})
              </div>
            </div>
          </div>
        )}
      </div>
      {/* End grid wrapper */}

    </div>
  );
};

export default DeviceMonitor;
