import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { ViewMode, PlantDataPoint } from './types';
import DeviceMonitor from './components/DeviceMonitor';
import LandingPage from './components/LandingPage';
import StreamingDashboard from './components/StreamingDashboard';
import { Activity, Home } from 'lucide-react';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8">
          <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-slate-300 mb-4">{this.state.error?.message || 'An error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Reload Page
            </button>
            <details className="mt-4">
              <summary className="cursor-pointer text-slate-400">Error Details</summary>
              <pre className="mt-2 text-xs bg-slate-900 p-4 rounded overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);

  // Streaming State (shared with DeviceMonitor and StreamingDashboard)
  const [streamingState, setStreamingState] = useState({
    isStreaming: false,
    streamCount: 0,
    analysisResults: [] as any[]
  });

  // Optional: keep last recorded session (purely client-side, no blockchain)
  const [lastSession, setLastSession] = useState<PlantDataPoint[] | null>(null);

  // Ensure a Gemini key exists for local/dev usage
  useEffect(() => {
    const defaultKey = 'AIzaSyA99K-oR4Nx2ebAuqoNs-xcBs8Rhv0Dhq4';
    const existingKey = localStorage.getItem('GEMINI_API_KEY');
    if (!existingKey || existingKey !== defaultKey) {
      localStorage.setItem('GEMINI_API_KEY', defaultKey);
      console.log('API key updated in localStorage');
    }
  }, []);

  const handleSaveSession = (data: PlantDataPoint[]) => {
    // For the AI Partner Catalyst version, we just keep the last session locally.
    setLastSession(data);
    console.log('Session captured for analysis. Points:', data.length);
  };

  const renderView = () => {
    switch (view) {
      case ViewMode.HOME:
        return <LandingPage onStart={() => setView(ViewMode.DEVICE)} />;
      case ViewMode.DEVICE:
        return (
          <DeviceMonitor
            onSaveSession={handleSaveSession}
            onSessionDataChange={() => {}}
          />
        );
      case ViewMode.STREAMING:
        return (
          <StreamingDashboard
            isStreaming={streamingState.isStreaming}
            analysisResults={streamingState.analysisResults}
            streamCount={streamingState.streamCount}
            // In this simplified version, the streaming toggle lives in DeviceMonitor.
            // Here we just navigate the user back to the Device view to manage it.
            onToggleStreaming={() => setView(ViewMode.DEVICE)}
          />
        );
      default:
        return <LandingPage onStart={() => setView(ViewMode.DEVICE)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <button
              onClick={() => setView(ViewMode.HOME)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <span className="text-xl font-mono font-bold tracking-tight text-white hidden sm:block">
                Plant<span className="text-brand-pink">Buddy</span>
              </span>
            </button>

            {/* Toggle Buttons - Centered in Nav Bar */}
            <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setView(ViewMode.HOME)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  view === ViewMode.HOME
                    ? 'bg-brand-blue text-brand-pink shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Home"
              >
                <Home className="w-3 h-3" />
              </button>
              <button
                onClick={() => setView(ViewMode.DEVICE)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  view === ViewMode.DEVICE
                    ? 'bg-brand-blue text-brand-pink shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Device</span>
              </button>
              <button
                onClick={() => setView(ViewMode.STREAMING)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  view === ViewMode.STREAMING
                    ? 'bg-brand-blue text-brand-pink shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Streaming</span>
              </button>
            </div>

            {/* Right Side - Empty for now */}
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 px-4 max-w-7xl mx-auto min-h-screen">
        
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;


