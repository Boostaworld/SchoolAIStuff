import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Flag, User, Bot, Eye, Copy, Check, ArrowLeft } from 'lucide-react';
import { TypingChallenge, RaceParticipant } from '../../types';
import { supabase } from '../../lib/supabase';
import { toast } from '@/lib/toast';
import { useOrbitStore } from '@/store/useOrbitStore';

interface RacingTerminalProps {
  challenge: TypingChallenge;
  botRanges: number[]; // e.g. [35, 65, 85] for slow/medium/fast bots
  onComplete: (results: {
    position: number;
    wpm: number;
    accuracy: number;
    time: number;
  }) => void;
  onExit: () => void;
  enableBroadcast?: boolean; // Enable spectator broadcasting
}

const BOT_NAMES = [
  { name: 'NEXUS-01', color: 'from-red-500 to-orange-500', avatar: 'dY-' },
  { name: 'CIPHER-7', color: 'from-blue-500 to-cyan-500', avatar: 'dYs?' },
  { name: 'QUANTUM-X', color: 'from-violet-500 to-purple-500', avatar: 'ƒs­' },
];

export default function RacingTerminal({ challenge, botRanges, onComplete, onExit, enableBroadcast = true }: RacingTerminalProps) {
  const { submitSession } = useOrbitStore();
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [userPosition, setUserPosition] = useState(0);
  const [botProgress, setBotProgress] = useState<number[]>(botRanges.map(() => 0));
  const [countdown, setCountdown] = useState(3);
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceStartMs, setRaceStartMs] = useState<number | null>(null);
  const [finalPositions, setFinalPositions] = useState<Array<{ name: string; time: number; isUser: boolean }>>([]);
  const [raceId] = useState(() => `race-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showSpectatorLink, setShowSpectatorLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const broadcastChannelRef = useRef<any>(null);

  const textContainerRef = useRef<HTMLDivElement>(null);
  const currentCharRef = useRef<HTMLSpanElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const challengeText = challenge.text_content;
  const userProgress = (currentIndex / challengeText.length) * 100;

  const botDurations = useMemo(
    () =>
      botRanges.map((targetWPM) => {
        const charsPerMin = targetWPM * 5;
        const minutes = challengeText.length / charsPerMin;
        return minutes * 60000; // ms to finish
      }),
    [botRanges, challengeText.length]
  );

  // Set up broadcast channel
  useEffect(() => {
    if (!enableBroadcast) return;

    const channel = supabase.channel(`race:${raceId}`);
    broadcastChannelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Race broadcast channel ready:', raceId);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId, enableBroadcast]);

  // Broadcast race state to spectators
  useEffect(() => {
    if (!enableBroadcast || !broadcastChannelRef.current || !raceStarted) return;

    const interval = setInterval(() => {
      const participants = [
        {
          id: 'user',
          name: 'YOU',
          progress: userProgress,
          wpm: calculateWPM(),
          isBot: false,
          isFinished: isComplete,
          finishTime: isComplete && startTime ? (Date.now() - startTime) / 1000 : undefined
        },
        ...BOT_NAMES.map((bot, idx) => ({
          id: `bot-${idx}`,
          name: bot.name,
          progress: botProgress[idx],
          wpm: botRanges[idx],
          isBot: true,
          isFinished: botProgress[idx] >= 100,
          finishTime: botProgress[idx] >= 100 ? ((Date.now() - (raceStartMs || 0)) / 1000) : undefined
        }))
      ];

      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'race_update',
        payload: {
          participants,
          status: isComplete ? 'finished' : (raceStarted ? 'racing' : 'countdown'),
          countdown,
          startedAt: raceStartMs
        }
      });
    }, 200); // Broadcast 5 times per second

    return () => clearInterval(interval);
  }, [enableBroadcast, raceStarted, userProgress, botProgress, isComplete, countdown, raceStartMs, startTime]);

  // Countdown before race starts
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!raceStarted) {
      setRaceStarted(true);
      setRaceStartMs(Date.now());
      inputRef.current?.focus();
    }
  }, [countdown, raceStarted]);

  // Focus the input when race starts
  useEffect(() => {
    if (raceStarted && countdown === 0) {
      inputRef.current?.focus();
    }
  }, [raceStarted, countdown]);

  // Bot simulation (human-like pacing)
  useEffect(() => {
    if (!raceStarted || isComplete || raceStartMs === null) return;

    const perBotVariance = botRanges.map(() => 0.9 + Math.random() * 0.25); // 90–115% speed

    const interval = setInterval(() => {
      const elapsed = Date.now() - raceStartMs;

      setBotProgress((prev) =>
        prev.map((progress, idx) => {
          if (progress >= 100) return 100;

          const duration = botDurations[idx] * perBotVariance[idx];
          const pct = Math.min(100, (elapsed / duration) * 100 + Math.random() * 0.5);

          if (pct >= 100 && !finalPositions.find((p) => p.name === BOT_NAMES[idx].name)) {
            setFinalPositions((fp) => [...fp, { name: BOT_NAMES[idx].name, time: elapsed, isUser: false }]);
          }

          return pct;
        })
      );
    }, 120);

    return () => clearInterval(interval);
  }, [raceStarted, isComplete, raceStartMs, botDurations, finalPositions, botRanges]);

  // Handle typing
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!raceStarted || countdown > 0) return;

    const newInput = e.target.value;

    // Start timer
    if (!startTime && newInput.length > 0) {
      setStartTime(Date.now());
    }

    // Allow backspace
    if (newInput.length < userInput.length) {
      setUserInput(newInput);
      setCurrentIndex(newInput.length);
      return;
    }

    const expectedChar = challengeText[currentIndex];
    const typedChar = newInput[newInput.length - 1];

    if (typedChar === expectedChar) {
      setUserInput(newInput);
      setCurrentIndex(currentIndex + 1);

      // Check completion
      if (currentIndex + 1 === challengeText.length) {
        handleRaceComplete();
      }
    } else {
      setErrors(errors + 1);
      setUserInput(newInput);
    }
  };

  // Handle race completion
  const handleRaceComplete = async () => {
    if (!startTime || isComplete) return;

    const timeMs = Date.now() - startTime;
    const timeSec = timeMs / 1000;
    const wpm = Math.round((challengeText.length / 5) / (timeSec / 60));
    const accuracy = currentIndex > 0
      ? Math.round(((currentIndex - errors) / currentIndex) * 100)
      : 100;

    setIsComplete(true);

    // Add user to final positions
    const newPositions = [...finalPositions, {
      name: 'YOU',
      time: timeMs,
      isUser: true
    }].sort((a, b) => a.time - b.time);

    setFinalPositions(newPositions);

    const position = newPositions.findIndex(p => p.isUser) + 1;
    setUserPosition(position);

    // Persist the session for stats/history
    if (submitSession) {
      submitSession(challenge.id, wpm, accuracy, errors).catch((err) => {
        console.warn('Race session persistence failed:', err);
      });
    }

    setTimeout(() => {
      onComplete({ position, wpm, accuracy, time: timeSec });
    }, 5000);
  };

  // Calculate WPM
  const calculateWPM = () => {
    if (!startTime) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60;
    return Math.round((currentIndex / 5) / timeElapsed);
  };

  const currentWPM = calculateWPM();

  // Keep current character in view with a generous lead so upcoming text stays visible
  useEffect(() => {
    if (!textContainerRef.current || !currentCharRef.current) return;

    const container = textContainerRef.current;
    const target = currentCharRef.current;

    // Use DOM geometry instead of offset math to avoid incorrect zeros from mixed offsetParents
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Position the caret near the top with ~1.5 lines of lead so future text dominates the viewport
    const lineHeight = parseFloat(getComputedStyle(target).lineHeight || '32') || 32;
    const targetTop = targetRect.top - containerRect.top + container.scrollTop;
    const desiredScrollTop = Math.max(targetTop - lineHeight * 1.5, 0);
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const clampedScrollTop = Math.min(desiredScrollTop, maxScrollTop);

    if (Math.abs(container.scrollTop - clampedScrollTop) > 1) {
      container.scrollTo({ top: clampedScrollTop, behavior: 'smooth' });
    }
  }, [currentIndex]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 z-50 overflow-hidden"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'slide 20s linear infinite'
          }}
        />
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400"
              style={{ fontFamily: 'Orbitron, monospace' }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Race Header */}
      <div className="relative z-10 px-8 py-6 border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400" style={{ fontFamily: 'Orbitron, monospace' }}>
              VELOCITY RACE
            </h1>
            <p className="text-cyan-500/60 text-sm font-mono mt-1">{challenge.title}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <div className="text-xs text-slate-500 font-mono mb-1">YOUR WPM</div>
              <div className="text-3xl font-black text-cyan-400 font-mono">{currentWPM}</div>
            </div>

            {enableBroadcast && (
              <div className="relative">
                <button
                  onClick={() => setShowSpectatorLink(!showSpectatorLink)}
                  className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-mono text-sm transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  SPECTATE
                </button>

                <AnimatePresence>
                  {showSpectatorLink && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="fixed top-20 right-6 w-80 bg-slate-900 border border-purple-500/30 rounded-lg p-4 shadow-2xl shadow-purple-900/50 z-[9999]"
                    >
                      <p className="text-xs text-slate-400 font-mono mb-2">Share this link for spectators:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}?spectate=${raceId}`}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-purple-500/30 rounded text-xs text-purple-300 font-mono"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}?spectate=${raceId}`);
                            setLinkCopied(true);
                            toast.success('Spectator link copied!');
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded text-purple-300 transition-all"
                        >
                          {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={onExit}
              className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30 border-2 border-red-500/40 rounded-lg text-red-400 font-mono text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      {/* Race Track */}
      <div className="relative z-10 flex-1 px-8 py-8">
        <div className="space-y-6">
          {/* User Lane */}
          <motion.div
            className="relative p-6 bg-slate-900/50 border-2 border-cyan-500/50 rounded-2xl backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            animate={{ boxShadow: raceStarted ? '0 0 40px rgba(6,182,212,0.5)' : '0 0 20px rgba(6,182,212,0.2)' }}
          >
            {/* Lane header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/50">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-black text-cyan-400 font-mono">YOU</div>
                <div className="text-xs text-slate-500 font-mono">HUMAN OPERATIVE</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-black text-cyan-400 font-mono">{Math.round(userProgress)}%</div>
                <div className="text-xs text-slate-500 font-mono">PROGRESS</div>
              </div>
            </div>

            {/* Track */}
            <div className="relative h-8 bg-slate-950 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-end pr-2"
                initial={{ width: 0 }}
                animate={{ width: `${userProgress}%` }}
                transition={{ duration: 0.2 }}
              >
                {userProgress > 10 && (
                  <motion.div
                    animate={{ x: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-white font-bold text-sm"
                  >
                    dY?Z‹,?
                  </motion.div>
                )}
              </motion.div>

              {/* Finish line */}
              <div className="absolute right-0 inset-y-0 w-1 bg-yellow-400" />
            </div>
          </motion.div>

          {/* Bot Lanes */}
          {botRanges.map((targetWPM, idx) => {
            const bot = BOT_NAMES[idx];
            const progress = botProgress[idx];
            const isFinished = progress >= 100;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative p-6 bg-slate-900/30 border border-slate-700 rounded-2xl backdrop-blur-sm"
              >
                {/* Lane header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${bot.color} flex items-center justify-center text-2xl font-bold shadow-lg`}>
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-200 font-mono">{bot.name}</div>
                    <div className="text-xs text-slate-500 font-mono">AI BOT ƒ?› TARGET {targetWPM} WPM</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-black text-slate-300 font-mono">{Math.round(progress)}%</div>
                    <div className="text-xs text-slate-500 font-mono">PROGRESS</div>
                  </div>
                </div>

                {/* Track */}
                <div className="relative h-8 bg-slate-950 rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${bot.color} flex items-center justify-end pr-2`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  >
                    {progress > 10 && (
                      <motion.div
                        animate={{ x: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-white font-bold text-sm"
                      >
                        {bot.avatar}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Finish line */}
                  <div className="absolute right-0 inset-y-0 w-1 bg-yellow-400" />

                  {/* Finished indicator */}
                  {isFinished && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <Flag className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Typing Input Area */}
      <div className="relative z-10 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm p-10" onClick={() => inputRef.current?.focus()}>
        <div className="max-w-6xl mx-auto">
          <div className="relative p-8 bg-slate-950/80 border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_45px_rgba(6,182,212,0.25)] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/5 via-transparent to-violet-500/5" />
            <div
              ref={textContainerRef}
              className="relative leading-8 md:leading-[2.1rem] text-left font-mono text-lg md:text-xl text-slate-200 tracking-[0.01em] space-x-0.5 max-h-[360px] min-h-[200px] overflow-y-auto pr-3 whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-cyan-500/40 scrollbar-track-slate-900/60"
            >
              {challengeText.split('').map((char, idx) => {
                let colorClass = 'text-slate-600';
                const isCurrent = idx === currentIndex;

                if (idx < currentIndex) {
                  colorClass = 'text-emerald-400';
                } else if (isCurrent) {
                  colorClass = 'text-slate-950 bg-cyan-300 px-1.5 py-0.5 rounded shadow-[0_0_18px_rgba(6,182,212,0.6)] animate-pulse';
                }

                return (
                  <span
                    key={idx}
                    ref={isCurrent ? currentCharRef : null}
                    className={`${colorClass} transition-colors`}
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                );
              })}
            </div>

            <textarea
              ref={inputRef}
              value={userInput}
              onChange={handleInput}
              disabled={!raceStarted || countdown > 0}
              className="absolute inset-0 opacity-0"
              autoFocus
              aria-label="Race typing input"
            />
          </div>
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="text-center max-w-2xl w-full px-8"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mb-6"
              >
                <Trophy className={`w-32 h-32 mx-auto ${
                  userPosition === 1 ? 'text-yellow-400' :
                  userPosition === 2 ? 'text-slate-300' :
                  userPosition === 3 ? 'text-orange-400' : 'text-slate-600'
                }`} />
              </motion.div>

              {/* Position */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 mb-4"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                {userPosition === 1 ? '1ST PLACE!' : userPosition === 2 ? '2ND PLACE' : userPosition === 3 ? '3RD PLACE' : `${userPosition}TH PLACE`}
              </motion.h1>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-4 mb-8"
              >
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <div className="text-4xl font-black text-cyan-400 font-mono">{currentWPM}</div>
                  <div className="text-sm text-slate-400 font-mono">WPM</div>
                </div>
                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="text-4xl font-black text-violet-400 font-mono">{Math.round(((currentIndex - errors) / currentIndex) * 100)}%</div>
                  <div className="text-sm text-slate-400 font-mono">ACCURACY</div>
                </div>
              </motion.div>

              {/* Leaderboard */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-2"
              >
                {finalPositions.map((participant, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.isUser
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-800/50 border border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black text-slate-400 font-mono w-8">#{idx + 1}</div>
                      <div className="text-lg font-bold text-slate-200 font-mono">{participant.name}</div>
                    </div>
                    <div className="text-slate-400 font-mono text-sm">
                      {(participant.time / 1000).toFixed(2)}s
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles */}
      <style>{`
        @keyframes slide {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
      `}</style>
    </motion.div>
  );
}
