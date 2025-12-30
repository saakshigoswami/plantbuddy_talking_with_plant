
export enum ViewMode {
  HOME = 'HOME',
  DEVICE = 'DEVICE',
  STREAMING = 'STREAMING'
}

export interface PlantDataPoint {
  timestamp: number;
  capacitance: number; // 0-100 simulating touch intensity
  sentiment: string; // 'Neutral', 'Joy', 'Melancholy', etc.
  userMessage?: string; // What the user said to the plant
  plantResponse?: string; // What the plant said back
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
