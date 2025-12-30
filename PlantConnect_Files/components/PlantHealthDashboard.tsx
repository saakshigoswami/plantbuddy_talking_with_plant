/**
 * Plant Health Dashboard Component
 * 
 * Displays comprehensive plant health metrics in real-time
 */

import React from 'react';
import { Activity, Droplet, Sun, Thermometer, Wind, Leaf, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { PlantHealthInsight, MetricStatus } from '../types/plantHealth';

interface PlantHealthDashboardProps {
  healthInsight: PlantHealthInsight | null;
  currentReading: {
    temperature: number;
    humidity: number;
    light: number;
    moisture: number;
  } | null;
}

const PlantHealthDashboard: React.FC<PlantHealthDashboardProps> = ({ healthInsight, currentReading }) => {
  if (!healthInsight && !currentReading) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md">
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-mono">Waiting for sensor data...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case 'OPTIMAL': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'LOW': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'CRITICAL_LOW': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'CRITICAL_HIGH': return 'text-red-500 bg-red-600/20 border-red-600/50';
      default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
    }
  };

  const getStatusIcon = (status: MetricStatus) => {
    if (status === 'OPTIMAL') return <CheckCircle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Header with Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" />
            Plant Health Monitor
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time sensor data & AI insights
          </p>
        </div>
        {healthInsight && (
          <div className={`px-4 py-2 rounded-xl border ${getHealthBg(healthInsight.health_score)}`}>
            <div className="text-xs font-mono text-slate-500 mb-1">HEALTH SCORE</div>
            <div className={`text-3xl font-mono font-bold ${getHealthColor(healthInsight.health_score)}`}>
              {healthInsight.health_score}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">/ 100</div>
          </div>
        )}
      </div>

      {/* Health Summary */}
      {healthInsight && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-mono text-slate-500 mb-1">AI ANALYSIS</div>
              <div className="text-sm text-white font-mono">{healthInsight.summary}</div>
              <div className="text-xs font-mono text-slate-400 mt-2">
                Status: <span className="text-blue-400">{healthInsight.stress_category.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Soil Moisture */}
        <div className={`p-4 rounded-xl border ${healthInsight ? getStatusColor(healthInsight.metrics.moisture_status) : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Droplet className="w-5 h-5 text-blue-400" />
            {healthInsight && getStatusIcon(healthInsight.metrics.moisture_status)}
          </div>
          <div className="text-xs font-mono text-slate-500 mb-1">SOIL MOISTURE</div>
          <div className="text-2xl font-mono font-bold text-white">
            {currentReading?.moisture.toFixed(1) || healthInsight?.inputs_window.avg_moisture_pct.toFixed(1) || '0.0'}%
          </div>
          {healthInsight && (
            <div className="text-xs font-mono text-slate-400 mt-1">
              {healthInsight.metrics.moisture_status}
            </div>
          )}
        </div>

        {/* Temperature */}
        <div className={`p-4 rounded-xl border ${healthInsight ? getStatusColor(healthInsight.metrics.temperature_status) : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Thermometer className="w-5 h-5 text-red-400" />
            {healthInsight && getStatusIcon(healthInsight.metrics.temperature_status)}
          </div>
          <div className="text-xs font-mono text-slate-500 mb-1">TEMPERATURE</div>
          <div className="text-2xl font-mono font-bold text-white">
            {currentReading?.temperature.toFixed(1) || healthInsight?.inputs_window.avg_temperature_c.toFixed(1) || '0.0'}°C
          </div>
          {healthInsight && (
            <div className="text-xs font-mono text-slate-400 mt-1">
              {healthInsight.metrics.temperature_status}
            </div>
          )}
        </div>

        {/* Light */}
        <div className={`p-4 rounded-xl border ${healthInsight ? getStatusColor(healthInsight.metrics.light_status) : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Sun className="w-5 h-5 text-yellow-400" />
            {healthInsight && getStatusIcon(healthInsight.metrics.light_status)}
          </div>
          <div className="text-xs font-mono text-slate-500 mb-1">LIGHT</div>
          <div className="text-2xl font-mono font-bold text-white">
            {currentReading?.light.toFixed(0) || healthInsight?.inputs_window.avg_light_lux.toFixed(0) || '0'} lux
          </div>
          {healthInsight && (
            <div className="text-xs font-mono text-slate-400 mt-1">
              {healthInsight.metrics.light_status}
            </div>
          )}
        </div>

        {/* Humidity */}
        <div className={`p-4 rounded-xl border ${healthInsight ? getStatusColor(healthInsight.metrics.humidity_status) : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            {healthInsight && getStatusIcon(healthInsight.metrics.humidity_status)}
          </div>
          <div className="text-xs font-mono text-slate-500 mb-1">HUMIDITY</div>
          <div className="text-2xl font-mono font-bold text-white">
            {currentReading?.humidity.toFixed(1) || healthInsight?.inputs_window.avg_humidity_pct.toFixed(1) || '0.0'}%
          </div>
          {healthInsight && (
            <div className="text-xs font-mono text-slate-400 mt-1">
              {healthInsight.metrics.humidity_status}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {healthInsight && healthInsight.recommendations.length > 0 && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <div className="text-xs font-mono font-bold text-white">RECOMMENDATIONS</div>
          </div>
          <div className="space-y-2">
            {healthInsight.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-green-400 font-bold mt-0.5">•</span>
                <span className="font-mono">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomaly Alert */}
      {healthInsight?.anomaly_detected && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-sm font-mono font-bold text-red-400">ANOMALY DETECTED</div>
              <div className="text-xs font-mono text-red-300 mt-1">
                Unusual patterns detected in sensor readings
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantHealthDashboard;

