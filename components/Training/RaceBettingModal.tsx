import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, TrendingUp, X, Zap, Target, Percent } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import { toast } from '@/lib/toast';

interface RaceBettingModalProps {
  botRanges: number[]; // Target WPM for each bot
  userMaxWPM: number;
  onPlaceBet: (bet: { wager: number; predictedPosition: number; odds: number }) => void;
  onSkip: () => void;
}

const BOT_NAMES = ['NEXUS-01', 'CIPHER-7', 'QUANTUM-X'];
const POSITION_LABELS = ['1st Place', '2nd Place', '3rd Place', '4th Place'];
const POSITION_COLORS = [
  'from-yellow-500 to-amber-500',
  'from-slate-400 to-slate-500',
  'from-orange-700 to-orange-800',
  'from-slate-600 to-slate-700'
];

export function RaceBettingModal({ botRanges, userMaxWPM, onPlaceBet, onSkip }: RaceBettingModalProps) {
  const { currentUser } = useOrbitStore();
  const [wager, setWager] = useState(10);
  const [predictedPosition, setPredictedPosition] = useState(1);

  const userPoints = currentUser?.points || 0;
  const maxWager = Math.min(userPoints, 1000); // Cap at 1000pts per race
  const canAffordBet = userPoints >= 10; // Minimum 10 points to place bet

  // Calculate odds based on user skill vs bot difficulty
  const calculateOdds = (position: number): number => {
    const avgBotWPM = botRanges.reduce((sum, wpm) => sum + wpm, 0) / botRanges.length;
    const userAdvantage = (userMaxWPM || 40) / avgBotWPM;

    // Odds decrease as predicted position gets worse (1st = hardest, 4th = easiest)
    // Higher user advantage = lower odds for winning positions
    const baseOdds = [3.5, 2.0, 1.5, 1.2]; // 1st, 2nd, 3rd, 4th

    if (userAdvantage > 1.3) {
      // User is skilled - lower odds for top positions
      return Math.max(baseOdds[position - 1] * 0.6, 1.1);
    } else if (userAdvantage > 1.0) {
      return baseOdds[position - 1] * 0.8;
    } else if (userAdvantage > 0.7) {
      return baseOdds[position - 1];
    } else {
      // User is slower than bots - higher odds for top positions
      return baseOdds[position - 1] * 1.5;
    }
  };

  const currentOdds = calculateOdds(predictedPosition);
  const potentialWin = Math.floor(wager * currentOdds);

  const handlePlaceBet = () => {
    if (wager > userPoints) {
      toast.error('Insufficient points');
      return;
    }
    if (wager < 1) {
      toast.error('Minimum bet is 1 point');
      return;
    }

    onPlaceBet({
      wager,
      predictedPosition,
      odds: currentOdds
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50 p-6"
    >
      {/* Animated background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-2 border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.3)] overflow-hidden"
      >
        {/* Scanlines effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-[scan_8s_linear_infinite]" />
        </div>

        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400" style={{ fontFamily: 'Orbitron, monospace' }}>
                PLACE YOUR BETS
              </h2>
              <p className="text-sm text-slate-400 mt-1 font-mono">Wager points on your race performance</p>
            </div>
            <button
              onClick={onSkip}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-6">
          {/* Low Balance Warning */}
          {!canAffordBet && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-2 border-cyan-500/40 rounded-xl p-4 mb-4"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-cyan-400" />
                <div>
                  <h4 className="text-cyan-400 font-bold font-mono text-sm">PRACTICE MODE</h4>
                  <p className="text-slate-400 text-xs font-mono mt-1">
                    Insufficient points for betting. Race for free to earn your starting balance!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Opponent Stats */}
          <div>
            <h3 className="text-xs text-purple-400 font-mono uppercase mb-3 flex items-center gap-2">
              <Target className="w-3 h-3" />
              Race Opponents
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {BOT_NAMES.map((name, idx) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-3"
                >
                  <div className="text-xs text-purple-400 font-mono mb-1">{name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-200">{botRanges[idx]}</span>
                    <span className="text-xs text-slate-500 font-mono">WPM</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Your Stats */}
          <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-cyan-400 font-mono uppercase mb-1">Your Max Speed</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-cyan-400">{userMaxWPM || 40}</span>
                  <span className="text-sm text-slate-500 font-mono">WPM</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-yellow-400 font-mono uppercase mb-1">Available Points</div>
                <div className="flex items-baseline gap-2 justify-end">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-2xl font-black text-yellow-400">{userPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bet Position Selection */}
          <div>
            <h3 className="text-xs text-pink-400 font-mono uppercase mb-3 flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              Predicted Finish Position
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {POSITION_LABELS.map((label, idx) => {
                const position = idx + 1;
                const odds = calculateOdds(position);
                const isSelected = predictedPosition === position;

                return (
                  <motion.button
                    key={position}
                    onClick={() => setPredictedPosition(position)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${POSITION_COLORS[idx]} border-transparent text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]`
                        : 'bg-slate-800/50 border-purple-500/30 text-slate-300 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono mb-1">{label}</div>
                    <div className="flex items-baseline gap-1 justify-center">
                      <Percent className="w-3 h-3 opacity-70" />
                      <span className="text-lg font-black">{odds.toFixed(1)}x</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Wager Amount - Only show if user can afford to bet */}
          {canAffordBet && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs text-yellow-400 font-mono uppercase flex items-center gap-2">
                    <Coins className="w-3 h-3" />
                    Wager Amount
                  </h3>
                  <button
                    onClick={() => setWager(maxWager)}
                    className="text-xs text-yellow-400 font-mono uppercase hover:text-yellow-300 transition-colors"
                  >
                    MAX
                  </button>
                </div>

                <input
                  type="range"
                  min="10"
                  max={maxWager}
                  value={wager}
                  onChange={(e) => setWager(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, rgb(234 179 8) 0%, rgb(234 179 8) ${(wager / maxWager) * 100}%, rgb(30 41 59) ${(wager / maxWager) * 100}%, rgb(30 41 59) 100%)`
                  }}
                />

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">10 pts</span>
                  <span className="text-2xl font-black text-yellow-400">{wager.toLocaleString()}</span>
                  <span className="text-slate-500">{maxWager.toLocaleString()} pts</span>
                </div>
              </div>

              {/* Payout Preview */}
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-slate-400 font-mono">Potential Win</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-green-400">+{potentialWin.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 font-mono">pts</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {canAffordBet ? (
              <>
                <motion.button
                  onClick={onSkip}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-400 font-bold font-mono hover:bg-slate-700/50 transition-colors"
                >
                  SKIP BET
                </motion.button>
                <motion.button
                  onClick={handlePlaceBet}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-black font-mono shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] transition-shadow flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  PLACE BET
                </motion.button>
              </>
            ) : (
              <motion.button
                onClick={onSkip}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-black font-mono shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] transition-shadow flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                START FREE RACE
              </motion.button>
            )}
          </div>
        </div>

        {/* CSS */}
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
        `}</style>
      </motion.div>
    </motion.div>
  );
}
