/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Weight, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Bell,
  ChevronRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { ThingSpeakResponse, HiveData, AIInsight } from './types';
import { analyzeHiveData } from './services/geminiService';

const THINGSPEAK_CHANNEL_ID = "3310992";
const THINGSPEAK_READ_KEY = "QJUXSW2UUYHCU886";

export default function App() {
  const [data, setData] = useState<ThingSpeakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_KEY}&results=20`
      );
      if (!response.ok) throw new Error('Failed to fetch hive data');
      const json: ThingSpeakResponse = await response.json();
      setData(json);
      setLastUpdated(new Date());
      
      // Trigger AI analysis if we have data
      if (json.feeds.length > 0) {
        runAIAnalysis(json.feeds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async (feeds: HiveData[]) => {
    setAnalyzing(true);
    try {
      const result = await analyzeHiveData(feeds);
      setInsight(result);
      
      // Simulate SMS Alert if harvest is ready
      if (result.harvestReady) {
        console.log("ALERT: Hive is ready for harvest! Sending notification...");
        // In a real app, this would call a backend endpoint to trigger Twilio
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const latest = useMemo(() => data?.feeds[data.feeds.length - 1], [data]);
  
  const chartData = useMemo(() => {
    return data?.feeds.map(f => ({
      time: format(new Date(f.created_at), 'HH:mm'),
      temp: parseFloat(f.field1),
      humidity: parseFloat(f.field2),
      weight: parseFloat(f.field3)
    })) || [];
  }, [data]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Connecting to Hive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-50/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
              <Activity size={20} />
            </div>
            Golden Nectar Apiary
          </h1>
          <p className="text-xs text-zinc-500">Channel: {THINGSPEAK_CHANNEL_ID}</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
          disabled={loading}
        >
          <RefreshCw size={20} className={cn("text-zinc-600", loading && "animate-spin")} />
        </button>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Status Banner */}
        {insight && (
          <div className={cn(
            "p-4 rounded-2xl flex items-start gap-3 border",
            insight.status === 'healthy' ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
            insight.status === 'warning' ? "bg-amber-50 border-amber-100 text-amber-900" :
            "bg-rose-50 border-rose-100 text-rose-900"
          )}>
            {insight.status === 'healthy' ? <CheckCircle2 className="mt-0.5" size={20} /> : <AlertTriangle className="mt-0.5" size={20} />}
            <div>
              <p className="font-bold text-sm uppercase tracking-wider">Hive Status: {insight.status}</p>
              <p className="text-sm opacity-90">{insight.summary}</p>
            </div>
          </div>
        )}

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard 
            label="Temperature" 
            value={`${parseFloat(latest?.field1 || '0').toFixed(1)}°C`} 
            icon={<Thermometer className="text-rose-500" />}
            trend={parseFloat(latest?.field1 || '0') > 35 ? 'High' : 'Normal'}
          />
          <StatCard 
            label="Humidity" 
            value={`${parseFloat(latest?.field2 || '0').toFixed(1)}%`} 
            icon={<Droplets className="text-blue-500" />}
            trend="Stable"
          />
          <StatCard 
            label="Hive Weight" 
            value={`${parseFloat(latest?.field3 || '0').toFixed(1)} kg`} 
            icon={<Weight className="text-amber-600" />}
            className="col-span-2"
            trend={insight?.harvestReady ? 'Harvest Ready' : 'Growing'}
          />
        </div>

        {/* AI Insights Section */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <BrainCircuit size={20} className="text-amber-500" />
              AI Insights
            </h2>
            {analyzing && <span className="text-xs text-amber-500 animate-pulse font-medium">Analyzing...</span>}
          </div>

          {!insight ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                <Info size={24} className="text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">Analyzing hive patterns...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-1000" 
                    style={{ width: `${insight.hiveHealthScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{insight.hiveHealthScore}% Health</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recommendations</p>
                <ul className="space-y-2">
                  {insight.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 text-zinc-700">
                      <ChevronRight size={14} className="mt-1 text-amber-500 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {insight.harvestReady && (
                <div className="mt-4 p-4 bg-amber-500 rounded-xl text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="animate-bounce" size={20} />
                    <span className="font-bold">Harvest Ready!</span>
                  </div>
                  <button className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
                    Notify Me
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Weight Trend Chart */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-zinc-400" />
              Weight Trend
            </h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <p className="text-center text-[10px] text-zinc-400">
          Last updated: {format(lastUpdated, 'MMM d, HH:mm:ss')}
        </p>
      </main>

      {/* Bottom Nav Simulation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-200 px-8 py-3 flex justify-between items-center">
        <NavItem icon={<Activity size={24} />} active />
        <NavItem icon={<TrendingUp size={24} />} />
        <NavItem icon={<Bell size={24} />} />
        <NavItem icon={<Info size={24} />} />
      </nav>
    </div>
  );
}

function StatCard({ label, value, icon, trend, className }: { label: string, value: string, icon: React.ReactNode, trend?: string, className?: string }) {
  return (
    <div className={cn("glass-card p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold font-display">{value}</span>
        {trend && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{trend}</span>}
      </div>
    </div>
  );
}

function NavItem({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={cn(
      "p-2 rounded-xl transition-all",
      active ? "text-amber-500 bg-amber-50" : "text-zinc-400 hover:text-zinc-600"
    )}>
      {icon}
    </button>
  );
}
