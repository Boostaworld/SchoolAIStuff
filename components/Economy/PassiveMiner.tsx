import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '@/store/useOrbitStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Pickaxe, Clock, Sparkles, Zap, Coins } from 'lucide-react';

export function PassiveMiner() {
  const { currentUser, claimPassivePoints, orbitPoints } = useOrbitStore();
  const [lastClaim, setLastClaim] = useState<Date | null>(null);
  const [timeUntilClaim, setTimeUntilClaim] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isInitialized, setIsInitialized] = useState(false);

  // Anti-AFK detection
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setIsActive(true);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Check for AFK every 30 seconds
    const afkInterval = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivity;
      if (inactiveDuration > 5 * 60 * 1000) { // 5 minutes AFK
        setIsActive(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(afkInterval);
    };
  }, [lastActivity]);

  useEffect(() => {
    fetchClaimStatus();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    setUserPoints(orbitPoints || 0);
  }, [orbitPoints]);

  async function fetchClaimStatus() {
    if (!currentUser?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('last_passive_claim, orbit_points')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        setUserPoints(data.orbit_points || 0);
        if (data.last_passive_claim) {
          const claimDate = new Date(data.last_passive_claim);
          setLastClaim(claimDate);

          // Immediately sync timer with server timestamp
          const now = new Date();
          const nextClaim = new Date(claimDate.getTime() + 5 * 60 * 1000);
          const diff = nextClaim.getTime() - now.getTime();

          if (diff <= 0) {
            setCanClaim(true);
            setTimeUntilClaim(0);
          } else {
            setCanClaim(false);
            setTimeUntilClaim(Math.floor(diff / 1000));
          }
        } else {
          // First time claiming - allow immediately
          setCanClaim(true);
          setTimeUntilClaim(0);
        }
      }
    } catch (error) {
      console.error('Error fetching claim status:', error);
    } finally {
      setIsInitialized(true);
    }
  }

  function updateTimer() {
    if (!isInitialized) return;

    if (!lastClaim) {
      setCanClaim(true);
      setTimeUntilClaim(0);
      return;
    }

    const now = new Date();
    const nextClaim = new Date(lastClaim.getTime() + 5 * 60 * 1000); // 5 minutes
    const diff = nextClaim.getTime() - now.getTime();

    if (diff <= 0) {
      setCanClaim(true);
      setTimeUntilClaim(0);
    } else {
      setCanClaim(false);
      setTimeUntilClaim(Math.floor(diff / 1000));
    }
  }

  async function handleClaim() {
    if (!canClaim || claiming) return;

    setClaiming(true);
    try {
      const res = await claimPassivePoints();
      if (!res.success) throw new Error(res.error || 'Mining failed');
      const pointsEarned = res.earned ?? 0;

      if (pointsEarned > 0) {
        toast.success(`ƒ>?‹,? Mined ${pointsEarned} orbit points!`);
        setUserPoints(prev => prev + pointsEarned);
        setLastClaim(new Date());
        setCanClaim(false);
      } else {
        toast.info('Mining cooldown active - Come back in 5 minutes!');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error?.message || 'Mining failed - Please try again');
    } finally {
      setClaiming(false);
    }
  }

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-3 md:p-6 relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(234, 179, 8, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(234, 179, 8, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            animation: 'slide 15s linear infinite'
          }}
        />
      </div>

      <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-amber-950/40 backdrop-blur-xl rounded-2xl md:rounded-3xl border-2 border-yellow-500/30 overflow-hidden max-w-2xl w-full shadow-[0_0_60px_rgba(234,179,8,0.2)]">
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />

        {/* Scanline effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/10 to-transparent animate-[scan_8s_linear_infinite]" />
        </div>
        {/* Header */}
        <div className="p-3 md:p-6 border-b border-yellow-500/20 bg-gradient-to-r from-slate-900/50 to-amber-950/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <div>
              <h2 className="text-xl md:text-3xl font-black flex items-center gap-2 md:gap-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400" style={{ fontFamily: 'Orbitron, monospace' }}>
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.6)]"
                >
                  <Pickaxe className="text-slate-900 w-4 h-4 md:w-5 md:h-5" />
                </motion.div>
                ORBITAL MINER
              </h2>
              <p className="text-xs md:text-sm text-yellow-500/70 mt-2 font-mono flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span className="hidden sm:inline">1 PT/MIN • MAX 60 • AUTO-HARVEST</span>
                <span className="sm:hidden">1 PT/MIN • MAX 60</span>
              </p>
              <AnimatePresence>
                {!isActive && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-xs text-red-400 mt-2 flex items-center gap-1 font-mono bg-red-950/30 border border-red-500/30 px-2 py-1 rounded"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ⚠️
                    </motion.span>
                    AFK DETECTED - MINING PAUSED
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
              <div className="text-xs text-slate-500 font-mono uppercase mb-1">Current Balance</div>
              <div className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 font-mono flex items-center gap-2">
                {userPoints}
                <Coins className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Mining Orb */}
        <div className="p-6 md:p-12 flex flex-col items-center justify-center">
          <motion.div
            animate={{
              scale: canClaim ? [1, 1.1, 1] : isActive ? [1, 1.02, 1] : 1,
              rotate: canClaim ? [0, 5, -5, 0] : 0
            }}
            transition={{
              duration: canClaim ? 2 : 3,
              repeat: canClaim || isActive ? Infinity : 0,
              ease: "easeInOut"
            }}
            className="relative"
          >
            {/* Orb Glow */}
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-500 ${canClaim
              ? 'bg-yellow-500/60 animate-pulse'
              : isActive
                ? 'bg-yellow-500/20'
                : 'bg-slate-500/10'
              }`} />

            {/* Mining Orb - ENHANCED */}
            <div className={`relative w-40 h-40 md:w-56 md:h-56 rounded-full border-4 md:border-8 flex items-center justify-center transition-all duration-500 ${canClaim
              ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 shadow-[0_0_80px_rgba(234,179,8,0.8)]'
              : isActive
                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                : 'border-slate-600 bg-gradient-to-br from-slate-700/20 to-slate-800/20'
              }`}>
              {/* Inner pulsing ring */}
              {isActive && (
                <motion.div
                  className="absolute inset-4 rounded-full border-4 border-yellow-500/30"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              )}

              {/* Icon with rotation */}
              <motion.div
                animate={canClaim ? {
                  rotate: 360,
                  scale: [1, 1.1, 1]
                } : {
                  rotate: isActive ? [0, 5, -5, 0] : 0
                }}
                transition={canClaim ? {
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1, repeat: Infinity }
                } : {
                  duration: 3,
                  repeat: Infinity
                }}
              >
                <Pickaxe
                  size={60}
                  className={`md:w-20 md:h-20 transition-colors duration-500 ${canClaim ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]' : isActive ? 'text-yellow-500/70' : 'text-slate-500'
                    }`}
                  strokeWidth={2.5}
                />
              </motion.div>
            </div>

            {/* Particle Effect */}
            {isActive && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400"
                    style={{
                      left: `${30 + Math.random() * 40}%`,
                      top: `${30 + Math.random() * 40}%`,
                    }}
                    animate={{
                      y: [-30, -90],
                      x: [0, (Math.random() - 0.5) * 30],
                      opacity: [1, 0],
                      scale: [1, 0.5]
                    }}
                    transition={{
                      duration: 2 + Math.random(),
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>

          {/* Countdown/Status */}
          <div className="mt-8 text-center">
            {canClaim ? (
              <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles size={32} />
                </motion.div>
                Ready to Claim!
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                  <Clock size={20} />
                  <span className="text-sm">Next claim in</span>
                </div>
                <div className="text-4xl font-mono font-bold text-cyan-400">
                  {formatTime(timeUntilClaim)}
                </div>
              </div>
            )}
          </div>

          {/* Claim Button - ENHANCED */}
          <motion.button
            onClick={handleClaim}
            disabled={!canClaim || claiming || !isActive}
            whileHover={{ scale: canClaim && isActive ? 1.08 : 1 }}
            whileTap={{ scale: canClaim && isActive ? 0.92 : 1 }}
            className={`relative mt-8 px-10 py-5 rounded-2xl font-black text-xl transition-all overflow-hidden ${canClaim && isActive
              ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 text-slate-950 shadow-[0_0_40px_rgba(234,179,8,0.6)]'
              : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border-2 border-slate-700'
              }`}
            style={{ fontFamily: canClaim && isActive ? 'Orbitron, monospace' : 'inherit' }}
          >
            {/* Shimmer effect for active button */}
            {canClaim && isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-200%', '200%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            )}

            <span className="relative z-10 flex items-center gap-3">
              {claiming ? (
                <>
                  <motion.div
                    className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  HARVESTING...
                </>
              ) : !isActive ? (
                <>RESUME MINING</>
              ) : canClaim ? (
                <>
                  <Sparkles className="w-6 h-6" />
                  HARVEST POINTS
                  <Sparkles className="w-6 h-6" />
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Zap className="w-5 h-5" />
                  </motion.div>
                  MINING...
                </>
              )}
            </span>
          </motion.button>

          {/* Info - ENHANCED */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-yellow-500/20 backdrop-blur">
            <div className="text-sm font-mono text-slate-300 space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                <span className="text-yellow-400">⛏️ MINING RATE</span>
                <span className="font-bold">1 PT/MIN</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                <span className="text-yellow-400">⏱️ COOLDOWN</span>
                <span className="font-bold">5 MINUTES</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                <span className="text-yellow-400">💰 MAX HARVEST</span>
                <span className="font-bold">60 POINTS</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                <span className="text-yellow-400">🎮 ANTI-AFK</span>
                <span className="font-bold">ACTIVE REQUIRED</span>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          @keyframes slide {
            0% { transform: translateY(0); }
            100% { transform: translateY(30px); }
          }
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
        `}</style>
      </div>
    </div>
  );
}
