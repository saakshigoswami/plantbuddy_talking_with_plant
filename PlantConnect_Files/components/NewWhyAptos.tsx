import React from 'react';
import { Cloud, Lock, Users, Coins } from 'lucide-react';

const NewWhyGoogleConfluent: React.FC = () => {
  const traditional = [
    { label: "Static data analysis", negative: true },
    { label: "Delayed insights", negative: true },
    { label: "Limited AI capabilities", negative: true },
    { label: "No real-time processing", negative: true },
  ];

  const modern = [
    { label: "Real-time streaming", positive: true },
    { label: "AI-powered insights", positive: true },
    { label: "Continuous monitoring", positive: true },
    { label: "Instant recommendations", positive: true },
  ];

  const features = [
    { icon: Lock, label: "Secure", color: "text-brand-green" },
    { icon: Users, label: "Real-Time", color: "text-[#ff6b9d]" },
    { icon: Coins, label: "AI-Powered", color: "text-brand-green" },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">Powered by Google Cloud & Confluent</h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Real-time AI insights on streaming data
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Traditional Approach */}
          <div className="p-8 bg-slate-900/50 border border-slate-700/50 rounded-xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-6">
              <Cloud className="w-8 h-8 text-red-400/70 hover:animate-gentle-bounce transition-all duration-300" />
              <h3 className="text-2xl font-bold text-white">Traditional Approach</h3>
            </div>
            <ul className="space-y-3">
              {traditional.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-red-400/50"></div>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Google Cloud + Confluent + PlantBuddy */}
          <div className="p-8 bg-gradient-to-br from-brand-green/10 to-brand-pink/10 border border-brand-green/30 rounded-xl shadow-lg animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-brand-green hover:animate-gentle-bounce transition-all duration-300" />
              <h3 className="text-2xl font-bold text-white">Google Cloud + Confluent</h3>
            </div>
            <ul className="space-y-3">
              {modern.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-white font-medium">
                  <div className="w-2 h-2 rounded-full bg-brand-green"></div>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Real-Time AI Platform */}
        <div className="p-8 bg-slate-900/50 border border-slate-700/50 rounded-xl animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <h3 className="text-2xl font-bold mb-4 text-white">Real-Time AI Platform</h3>
          <p className="text-slate-300 mb-6 leading-relaxed">
            Stream plant sensor data to Confluent Cloud in real-time. Google Cloud Vertex AI analyzes the stream to provide instant health insights, predictions, and recommendations. Experience the power of AI on data in motion.
          </p>
          <div className="flex flex-wrap gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-full border border-slate-700/50 hover:scale-110 hover:shadow-lg transition-all duration-300"
                >
                  <Icon className={`w-5 h-5 ${feature.color} hover:animate-gentle-bounce`} />
                  <span className="font-medium text-white">{feature.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mt-12 text-center p-8 bg-brand-green/5 rounded-2xl border border-brand-green/20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-wide">
            Powered by Industry-Leading Technologies
          </h3>
          <p className="text-lg text-slate-300 mb-4">
            Confluent Cloud for real-time data streaming • Google Cloud Vertex AI for intelligent analysis
          </p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Real-time sensor data streams to Confluent Kafka topics. Google Cloud AI processes the stream to generate health insights, detect anomalies, and provide actionable recommendations instantly.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewWhyGoogleConfluent;

