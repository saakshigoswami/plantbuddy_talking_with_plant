/**
 * Real-Time Streaming Dashboard Component
 * 
 * Displays real-time plant sensor data streaming to Confluent Cloud
 * and AI-powered analysis from Vertex AI/Gemini
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, Area, AreaChart } from 'recharts';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Zap, Database, Brain, Wifi, WifiOff } from 'lucide-react';
import { StreamAnalysisResult } from '../services/confluentService';

interface StreamingDashboardProps {
  isStreaming: boolean;
  analysisResults: StreamAnalysisResult[];
  streamCount: number;
  onToggleStreaming: () => void;
}

const StreamingDashboard: React.FC<StreamingDashboardProps> = ({
  isStreaming,
  analysisResults,
  streamCount,
  onToggleStreaming
}) => {
  const [healthHistory, setHealthHistory] = useState<Array<{ time: number; health: number }>>([]);

  // Update health history when new analysis arrives
  useEffect(() => {
    if (analysisResults.length > 0) {
      const latest = analysisResults[analysisResults.length - 1];
      setHealthHistory(prev => {
        const newHistory = [...prev, { time: latest.timestamp, health: latest.healthScore }];
        return newHistory.slice(-30); // Keep last 30 data points
      });
    }
  }, [analysisResults]);

  const latestAnalysis = analysisResults.length > 0 ? analysisResults[analysisResults.length - 1] : null;
  const avgHealth = healthHistory.length > 0
    ? healthHistory.reduce((sum, h) => sum + h.health, 0) / healthHistory.length
    : 0;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-mono font-bold text-white">Real-Time Stream Analytics</h2>
            <p className="text-xs text-slate-400 font-mono">Confluent Cloud + Vertex AI</p>
          </div>
        </div>
        <button
          onClick={onToggleStreaming}
          className={`px-4 py-2 rounded-lg text-sm font-mono font-bold border transition-all flex items-center gap-2 ${
            isStreaming
              ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
          }`}
        >
          {isStreaming ? (
            <>
              <Wifi className="w-4 h-4" />
              STREAMING
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              START STREAM
            </>
          )}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Stream Count */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-slate-500">Confluent</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">{streamCount}</div>
          <div className="text-xs text-slate-400 font-mono mt-1">Events Streamed</div>
        </div>

        {/* Health Score */}
        <div className={`p-4 rounded-xl border ${getHealthBgColor(avgHealth)}`}>
          <div className="flex items-center justify-between mb-2">
            <Activity className={`w-4 h-4 ${getHealthColor(avgHealth)}`} />
            <span className="text-xs font-mono text-slate-500">Vertex AI</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${getHealthColor(avgHealth)}`}>
            {avgHealth.toFixed(0)}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">Avg Health Score</div>
        </div>

        {/* Analysis Count */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono text-slate-500">AI Analysis</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">{analysisResults.length}</div>
          <div className="text-xs text-slate-400 font-mono mt-1">Analyses Complete</div>
        </div>

        {/* Anomaly Status */}
        <div className={`p-4 rounded-xl border ${
          latestAnalysis?.anomalyDetected
            ? 'bg-red-500/20 border-red-500/50'
            : 'bg-green-500/20 border-green-500/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            {latestAnalysis?.anomalyDetected ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
            <span className="text-xs font-mono text-slate-500">Status</span>
          </div>
          <div className={`text-lg font-mono font-bold ${
            latestAnalysis?.anomalyDetected ? 'text-red-400' : 'text-green-400'
          }`}>
            {latestAnalysis?.anomalyDetected ? 'ANOMALY' : 'NORMAL'}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">Detection</div>
        </div>
      </div>

      {/* Health Score Chart */}
      {healthHistory.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-mono font-bold text-white">Health Score Trend</h3>
          </div>
          <div className="h-48 bg-slate-950/50 rounded-lg p-4 border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthHistory}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  hide 
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value: number) => [`${value.toFixed(0)}`, 'Health Score']}
                />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="#4ade80"
                  strokeWidth={2}
                  fill="url(#healthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest Analysis */}
      {latestAnalysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-mono font-bold text-white">Latest AI Analysis</h3>
            <span className="text-xs text-slate-500 font-mono ml-auto">
              {new Date(latestAnalysis.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Prediction */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <div className="text-xs font-mono text-slate-500 mb-2">PREDICTION</div>
            <div className="text-base font-mono text-white">{latestAnalysis.prediction}</div>
          </div>

          {/* Recommendations */}
          {latestAnalysis.recommendations.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-xs font-mono text-slate-500 mb-3">RECOMMENDATIONS</div>
              <div className="space-y-2">
                {latestAnalysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-blue-400 font-bold">•</span>
                    <span className="font-mono">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Score Detail */}
          <div className={`p-4 rounded-xl border ${getHealthBgColor(latestAnalysis.healthScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">CURRENT HEALTH SCORE</div>
                <div className={`text-3xl font-mono font-bold ${getHealthColor(latestAnalysis.healthScore)}`}>
                  {latestAnalysis.healthScore.toFixed(0)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-500 mb-1">STATUS</div>
                <div className={`text-lg font-mono font-bold ${getHealthColor(latestAnalysis.healthScore)}`}>
                  {latestAnalysis.healthScore >= 80 ? 'EXCELLENT' : 
                   latestAnalysis.healthScore >= 60 ? 'GOOD' : 'NEEDS ATTENTION'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!latestAnalysis && (
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-mono">No analysis data yet</p>
          <p className="text-xs font-mono mt-2">Start streaming to see real-time AI insights</p>
        </div>
      )}
    </div>
  );
};

export default StreamingDashboard;

