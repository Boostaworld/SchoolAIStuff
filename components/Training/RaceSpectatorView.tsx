import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, Zap, Trophy, TrendingUp, Radio, Heart, Flame, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RaceSpectatorViewProps {
  raceId: string;
  onExit: () => void;
}

interface RaceState {
  participants: Array<{
    id: string;
    name: string;
    progress: number;
    wpm: number;
    isBot: boolean;
    isFinished: boolean;
    finishTime?: number;
  }>;
  status: 'countdown' | 'racing' | 'finished';
  countdown: number;
  startedAt: number | null;
}

const REACTION_EMOJIS = ['🔥', '💪', '⚡', '🚀', '👀', '😱', '🎯', '💀'];

export function RaceSpectatorView({ raceId, onExit }: RaceSpectatorViewProps) {
  const [raceState, setRaceState] = useState<RaceState>({
    participants: [],
    status: 'countdown',
    countdown: 3,
    startedAt: null
  });
  const [viewers, setViewers] = useState(1);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Subscribe to race updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`race:${raceId}`)
      .on('broadcast', { event: 'race_update' }, ({ payload }) => {
        setRaceState(payload);
      })
      .on('broadcast', { event: 'viewer_joined' }, () => {
        setViewers(v => v + 1);
      })
      .on('broadcast', { event: 'viewer_left' }, () => {
        setViewers(v => Math.max(1, v - 1));
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        addReaction(payload.emoji);
      })
      .subscribe();

    // Announce presence
    channel.send({
      type: 'broadcast',
      event: 'viewer_joined',
      payload: {}
    });

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'viewer_left',
        payload: {}
      });
      supabase.removeChannel(channel);
    };
  }, [raceId]);

  // Update elapsed time
  useEffect(() => {
    if (raceState.status !== 'racing' || !raceState.startedAt) return;

    const interval = setInterval(() => {
      setElapsedTime((Date.now() - raceState.startedAt!) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [raceState.status, raceState.startedAt]);

  const addReaction = (emoji: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const x = Math.random() * 80 + 10; // 10-90% from left

    setReactions(prev => [...prev, { id, emoji, x }]);

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const sendReaction = (emoji: string) => {
    addReaction(emoji);

    const channel = supabase.channel(`race:${raceId}`);
    channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji }
    });
  };

  // Sort participants by progress (descending)
  const sortedParticipants = [...raceState.participants].sort((a, b) => b.progress - a.progress);
  const leader = sortedParticipants[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 z-50 overflow-hidden"
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'slide 15s linear infinite'
          }}
        />
      </div>

      {/* Floating reactions */}
      <AnimatePresence>
        {reactions.map(reaction => (
          <motion.div
            key={reaction.id}
            initial={{ y: '100vh', opacity: 1, scale: 1 }}
            animate={{ y: '-20vh', opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute text-6xl pointer-events-none z-50"
            style={{ left: `${reaction.x}%` }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                SPECTATOR MODE
              </h1>
              <div className="flex items-center gap-4 text-sm font-mono">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-red-400 uppercase font-bold">Live</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Eye className="w-4 h-4" />
                  <span>{viewers} watching</span>
                </div>
                {raceState.status === 'racing' && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Zap className="w-4 h-4" />
                    <span>{elapsedTime.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onExit}
              className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-purple-500/30 rounded-xl text-slate-300 font-mono transition-all"
            >
              EXIT
            </button>
          </div>

          {/* Countdown */}
          <AnimatePresence>
            {raceState.status === 'countdown' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="text-center py-8"
              >
                <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500" style={{ fontFamily: 'Orbitron, monospace' }}>
                  {raceState.countdown}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Race Track */}
        <div className="flex-1 flex flex-col gap-6 overflow-auto">
          {sortedParticipants.map((participant, idx) => {
            const isLeader = participant.id === leader?.id;
            const position = idx + 1;

            return (
              <motion.div
                key={participant.id}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {/* Track lane */}
                <div className={`relative bg-slate-900/50 border-2 rounded-2xl overflow-hidden ${
                  isLeader ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'border-purple-500/30'
                }`}>
                  {/* Progress bar */}
                  <motion.div
                    animate={{ width: `${participant.progress}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className={`absolute inset-y-0 left-0 ${
                      participant.isBot
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                  />

                  {/* Grid lines */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    {[20, 40, 60, 80].map(pct => (
                      <div
                        key={pct}
                        className="absolute inset-y-0 border-l border-white/20"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                  </div>

                  {/* Participant info */}
                  <div className="relative p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Position badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${
                        position === 1 ? 'bg-gradient-to-br from-yellow-500 to-amber-500 text-white' :
                        position === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                        position === 3 ? 'bg-gradient-to-br from-orange-700 to-orange-800 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`} style={{ fontFamily: 'Orbitron, monospace' }}>
                        {position}
                      </div>

                      {/* Name and stats */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-xl font-bold font-mono ${
                            participant.isBot ? 'text-slate-300' : 'text-cyan-400'
                          }`}>
                            {participant.name}
                          </h3>
                          {isLeader && raceState.status === 'racing' && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <Flame className="w-5 h-5 text-yellow-400" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {participant.wpm} WPM
                          </span>
                          <span>{participant.progress.toFixed(1)}%</span>
                          {participant.isFinished && participant.finishTime && (
                            <span className="text-green-400 flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {participant.finishTime.toFixed(2)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Speed indicator */}
                    {raceState.status === 'racing' && !participant.isFinished && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-right"
                      >
                        <TrendingUp className={`w-8 h-8 ${
                          participant.isBot ? 'text-slate-500' : 'text-cyan-400'
                        }`} />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reaction Bar */}
        <div className="mt-6 pt-4 border-t border-purple-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-400 font-mono uppercase">React:</span>
            <div className="flex gap-2">
              {REACTION_EMOJIS.map(emoji => (
                <motion.button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 bg-slate-800/50 hover:bg-slate-700/50 border border-purple-500/30 rounded-xl text-2xl transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes slide {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
      `}</style>
    </motion.div>
  );
}
