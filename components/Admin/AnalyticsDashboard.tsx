import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Zap,
  TrendingUp,
  AlertTriangle,
  Database,
  Clock,
  Target,
  Award,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemMetrics {
  totalUsers: number;
  activeToday: number;
  totalPoints: number;
  pointsToday: number;
  tasksCompleted: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  event_type: string;
  user_name: string;
  details: string;
}

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeToday: 0,
    totalPoints: 0,
    pointsToday: 0,
    tasksCompleted: 0
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setRefreshing(true);
    try {
      // Total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active users today (based on last_active field)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active', today.toISOString());

      // Total points in circulation
      const { data: pointsData } = await supabase
        .from('profiles')
        .select('orbit_points');

      const totalPoints = pointsData
        ? pointsData.reduce((sum, p) => sum + (p.orbit_points || 0), 0)
        : 0;

      // Tasks completed
      const { data: tasksData } = await supabase
        .from('profiles')
        .select('tasks_completed');

      const tasksCompleted = tasksData
        ? tasksData.reduce((sum, p) => sum + (p.tasks_completed || 0), 0)
        : 0;

      setMetrics({
        totalUsers: userCount || 0,
        activeToday: activeCount || 0,
        totalPoints,
        pointsToday: 0, // Would need transaction table to calculate
        tasksCompleted
      });

      // Mock activity logs (would need proper activity logging table)
      setActivityLogs([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_type: 'RACE_COMPLETE',
          user_name: 'System',
          details: 'Metrics refreshed successfully'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getThreatLevel = (value: number, thresholds: [number, number, number]) => {
    if (value < thresholds[0]) return { level: 'LOW', color: 'cyan', label: 'OPTIMAL' };
    if (value < thresholds[1]) return { level: 'MODERATE', color: 'amber', label: 'ELEVATED' };
    return { level: 'HIGH', color: 'red', label: 'CRITICAL' };
  };

  const userActivityThreat = getThreatLevel(metrics.activeToday / Math.max(metrics.totalUsers, 1) * 100, [30, 60, 100]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950 relative">
      {/* CRT Scanlines Effect */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)'
        }} />
      </div>

      {/* Noise Texture */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.015]">
        <svg className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 to-orange-500 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
              MISSION CONTROL
            </h1>
            <p className="text-amber-500/70 text-sm font-mono uppercase tracking-widest">
              SYSTEM ANALYTICS // REAL-TIME MONITORING
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="px-6 py-3 bg-gradient-to-r from-amber-500/20 to-red-500/20 border-2 border-amber-500/40 rounded-lg text-amber-400 font-mono hover:bg-amber-500/30 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
            >
              <Activity className="w-5 h-5" />
            </motion.div>
            {refreshing ? 'SCANNING...' : 'REFRESH DATA'}
          </button>
        </motion.div>
      </div>

      {/* Threat Level Displays */}
      <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Activity Threat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-6 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-2 border-${userActivityThreat.color}-500/40 rounded-2xl backdrop-blur-sm relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${userActivityThreat.color}-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-${userActivityThreat.color}-500/20 flex items-center justify-center border-2 border-${userActivityThreat.color}-500/40`}>
                  <Users className={`w-6 h-6 text-${userActivityThreat.color}-400`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">User Activity</p>
                  <p className={`text-xl font-black text-${userActivityThreat.color}-400 font-mono`}>{userActivityThreat.label}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full bg-${userActivityThreat.color}-500/20 text-${userActivityThreat.color}-400 text-xs font-mono border border-${userActivityThreat.color}-500/30`}>
                LEVEL {userActivityThreat.level}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-slate-400">Active Today</span>
                <span className={`text-${userActivityThreat.color}-400 font-bold`}>{metrics.activeToday} / {metrics.totalUsers}</span>
              </div>
              <div className={`h-2 bg-slate-800 rounded-full overflow-hidden border border-${userActivityThreat.color}-500/30`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.activeToday / Math.max(metrics.totalUsers, 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full bg-gradient-to-r from-${userActivityThreat.color}-500 to-${userActivityThreat.color}-400`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Grid */}
      <div className="relative z-20 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL USERS', value: metrics.totalUsers, icon: Users, color: 'cyan', suffix: '' },
          { label: 'ACTIVE TODAY', value: metrics.activeToday, icon: Activity, color: 'violet', suffix: '' },
          { label: 'POINTS POOL', value: metrics.totalPoints, icon: Award, color: 'amber', suffix: '' },
          { label: 'TASKS DONE', value: metrics.tasksCompleted, icon: Database, color: 'green', suffix: '' }
        ].map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={`p-4 bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-${metric.color}-500/30 rounded-xl relative overflow-hidden group hover:border-${metric.color}-500/60 transition-all`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-${metric.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className={`w-5 h-5 text-${metric.color}-400`} />
                <span className={`text-[9px] text-${metric.color}-500 font-mono uppercase tracking-widest`}>{metric.label}</span>
              </div>
              <p className={`text-3xl font-black text-${metric.color}-400 font-mono`}>
                {metric.value.toLocaleString()}<span className="text-lg">{metric.suffix}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-20 p-6 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-2 border-cyan-500/30 rounded-2xl backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cyan-400 font-mono">ACTIVITY LOG</h3>
            <p className="text-xs text-cyan-500/60 font-mono">Real-time system events</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-xs text-cyan-500 font-mono">LIVE</span>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
          {activityLogs.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No recent activity</p>
          ) : (
            activityLogs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 bg-slate-950/60 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-cyan-500/60 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                    {log.event_type}
                  </span>
                  <span className="text-slate-400 text-xs">{log.user_name}</span>
                  <span className="text-slate-500 text-xs">{log.details}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
