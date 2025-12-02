import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, Clock, AlertCircle } from 'lucide-react';

interface KeyStat {
  key: string;
  presses: number;
  errors: number;
  accuracy: number;
}

interface DrillSuggestion {
  title: string;
  targetKeys: string[];
  difficulty: number;
  estimatedTime: number; // minutes
}

interface AcademyDashboardProps {
  // Weekly accuracy trend (7 data points)
  weeklyAccuracy: number[];
  // Weak keys data for heatmap
  keyStats: KeyStat[];
  // Next recommended drill
  nextDrill: DrillSuggestion;
  // Progress metrics
  drillsCompleted: number;
  avgAccuracy: number;
  avgLatency: number; // ms between keystrokes
  onStartDrill: () => void;
}

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function AcademyDashboard({
  weeklyAccuracy,
  keyStats,
  nextDrill,
  drillsCompleted,
  avgAccuracy,
  avgLatency,
  onStartDrill,
}: AcademyDashboardProps) {
  // Helper to get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'bg-emerald-500';
    if (accuracy >= 85) return 'bg-cyan-500';
    if (accuracy >= 75) return 'bg-yellow-500';
    if (accuracy >= 65) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Helper to get key accuracy
  const getKeyAccuracy = (key: string): number => {
    const stat = keyStats.find(k => k.key.toLowerCase() === key.toLowerCase());
    return stat ? stat.accuracy : 100;
  };

  // Max value for chart scaling
  const maxAccuracy = Math.max(...weeklyAccuracy, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">The Academy</h1>
          <p className="text-slate-600">
            Precision training for lasting improvement
          </p>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Drills Completed</div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{drillsCompleted}</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Avg Accuracy</div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{avgAccuracy.toFixed(1)}%</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Avg Latency</div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{avgLatency}ms</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Week Trend</div>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {weeklyAccuracy.length >= 2
                ? `${(weeklyAccuracy[weeklyAccuracy.length - 1] - weeklyAccuracy[0] > 0 ? '+' : '')}${(weeklyAccuracy[weeklyAccuracy.length - 1] - weeklyAccuracy[0]).toFixed(1)}%`
                : 'N/A'}
            </div>
          </motion.div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accuracy improvement chart - 2 columns */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Weekly Accuracy Trend</h2>
            </div>

            {/* Custom line chart using CSS Grid and framer-motion */}
            <div className="relative h-64">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-slate-400 font-mono">
                <span>{maxAccuracy}%</span>
                <span>{(maxAccuracy * 0.75).toFixed(0)}%</span>
                <span>{(maxAccuracy * 0.5).toFixed(0)}%</span>
                <span>{(maxAccuracy * 0.25).toFixed(0)}%</span>
                <span>0%</span>
              </div>

              {/* Chart area */}
              <div className="absolute left-12 right-0 top-0 bottom-8">
                {/* Grid lines */}
                <div className="absolute inset-0">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-slate-200"
                      style={{ top: `${i * 25}%` }}
                    />
                  ))}
                </div>

                {/* Data points and line */}
                <svg className="absolute inset-0" preserveAspectRatio="none">
                  <motion.polyline
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    points={weeklyAccuracy
                      .map((acc, i) => {
                        const x = (i / (weeklyAccuracy.length - 1)) * 100;
                        const y = 100 - (acc / maxAccuracy) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Data points */}
                {weeklyAccuracy.map((acc, i) => {
                  const x = (i / (weeklyAccuracy.length - 1)) * 100;
                  const y = 100 - (acc / maxAccuracy) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 * i, type: 'spring' }}
                      className="absolute w-3 h-3 -ml-1.5 -mt-1.5 bg-blue-500 rounded-full border-2 border-white shadow-lg"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                      }}
                      title={`Day ${i + 1}: ${acc.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="absolute left-12 right-0 bottom-0 flex justify-between text-xs text-slate-400 font-mono">
                {weeklyAccuracy.map((_, i) => (
                  <span key={i}>Day {i + 1}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Next drill suggestion - 1 column */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-xl shadow-sm border border-blue-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Next Drill</h2>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{nextDrill.title}</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Target Keys:</span>
                  <div className="flex gap-1">
                    {nextDrill.targetKeys.map((key) => (
                      <span
                        key={key}
                        className="px-2 py-1 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{nextDrill.estimatedTime} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Difficulty:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-2 h-4 rounded ${
                          level <= nextDrill.difficulty ? 'bg-blue-500' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartDrill}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              Start Drill
            </motion.button>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                This drill is optimized for your current weak keys to maximize improvement.
              </p>
            </div>
          </motion.div>

          {/* Weak keys heatmap - full width */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-3 bg-white p-8 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-800">Keyboard Accuracy Heatmap</h2>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                <span>Low</span>
                <div className="flex gap-1">
                  {['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'].map(
                    (color, i) => (
                      <div key={i} className={`w-4 h-4 rounded ${color}`} />
                    )
                  )}
                </div>
                <span>High</span>
              </div>
            </div>

            {/* Keyboard layout */}
            <div className="flex flex-col items-center gap-2">
              {KEYBOARD_LAYOUT.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-2" style={{ marginLeft: rowIdx * 24 }}>
                  {row.map((key) => {
                    const accuracy = getKeyAccuracy(key);
                    const colorClass = getAccuracyColor(accuracy);

                    return (
                      <motion.div
                        key={key}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.02 * (rowIdx * 10 + row.indexOf(key)),
                          type: 'spring',
                        }}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        className={`relative w-14 h-14 rounded-lg ${colorClass} flex items-center justify-center text-white font-bold text-lg shadow-md cursor-pointer group`}
                        title={`${key}: ${accuracy.toFixed(1)}% accuracy`}
                      >
                        {key}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {accuracy.toFixed(1)}% accuracy
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {/* Spacebar */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className={`w-64 h-14 rounded-lg ${getAccuracyColor(
                  getKeyAccuracy(' ')
                )} flex items-center justify-center text-white font-bold shadow-md mt-2`}
              >
                SPACE
              </motion.div>
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Color coding:</strong> Red (&lt;65%) indicates keys that need focused practice.
                Green (≥95%) shows mastered keys. Click on any key to see detailed statistics.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
