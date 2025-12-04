import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { UserProfile } from '../../types';
import { ProfileModal } from '../Operative/ProfileModal';

// Deterministic hash function for consistent positioning
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Generate deterministic position from user ID relative to container
const getStarPosition = (userId: string, containerWidth: number, containerHeight: number) => {
  const hash = hashString(userId);
  // Ensure we have some padding from the edges (50px)
  const x = (hash % (containerWidth - 100)) + 50;
  const y = ((hash >> 8) % (containerHeight - 100)) + 50;
  return { x, y };
};

interface ConstellationMapProps {
  users: UserProfile[];
}

export default function ConstellationMap({ users }: ConstellationMapProps) {
  const { onlineUsers } = useOrbitStore();
  const [hoveredUser, setHoveredUser] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 1000, height: 700 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  // Calculate star positions based on current container size
  const starData = useMemo(() => {
    return users.map(user => ({
      user,
      pos: getStarPosition(user.id, containerDimensions.width, containerDimensions.height),
      isOnline: onlineUsers.includes(user.id)
    }));
  }, [users, onlineUsers, containerDimensions]);

  const onlineVisibleCount = useMemo(() => {
    return starData.filter(d => d.isOnline).length;
  }, [starData]);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Users className="w-20 h-20 text-cyan-500/30 mb-6" />
        <p className="text-cyan-400/60 font-mono text-lg">NO OPERATIVES DETECTED</p>
        <p className="text-cyan-500/40 font-mono text-sm mt-2">Scanning for signals...</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-[400px] md:h-[500px] lg:h-[700px] bg-slate-950 rounded-2xl border border-cyan-500/20 overflow-hidden group"
        onMouseMove={handleMouseMove}
      >
        {/* Background Grid & Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 50px 50px, 50px 50px'
          }}
        />

        {/* Scanline effect */}
        <motion.div
          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none"
          animate={{ y: [0, containerDimensions.height - 128, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Constellation Lines */}
        <svg className="absolute inset-0 pointer-events-none overflow-visible">
          {starData.map((data1, i) => {
            // Only draw lines for a subset to avoid performance issues
            if (i % 2 !== 0 && !data1.isOnline) return null;

            return starData.slice(i + 1).map(data2 => {
              const dist = Math.sqrt(
                Math.pow(data2.pos.x - data1.pos.x, 2) +
                Math.pow(data2.pos.y - data1.pos.y, 2)
              );

              // Draw lines between nearby stars
              if (dist < 200) {
                return (
                  <motion.line
                    key={`${data1.user.id}-${data2.user.id}`}
                    x1={data1.pos.x}
                    y1={data1.pos.y}
                    x2={data2.pos.x}
                    y2={data2.pos.y}
                    stroke="rgba(6, 182, 212, 0.15)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                  />
                );
              }
              return null;
            });
          })}
        </svg>

        {/* Stars */}
        {starData.map(({ user, pos, isOnline }, index) => {
          // Calculate size based on orbit points (min 16px, max 48px)
          const size = Math.min(Math.max(16, (user.orbit_points || 0) / 100), 48);
          const isFocus = user.status === 'Focus Mode';

          return (
            <motion.div
              key={user.id}
              className="absolute cursor-pointer"
              style={{ left: pos.x, top: pos.y, zIndex: isOnline ? 10 : 1 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.02, type: 'spring' }}
              whileHover={{ scale: 1.5, zIndex: 50 }}
              onClick={() => setSelectedUser(user)}
              onMouseEnter={() => setHoveredUser(user)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              {/* Pulse for high ranking users */}
              {user.orbit_points && user.orbit_points > 1000 && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-cyan-500/20"
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
                />
              )}

              {/* Star Body */}
              <div
                className={`
                  rounded-full border-2 transition-colors duration-300
                  ${isOnline
                    ? 'bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                    : isFocus
                      ? 'bg-violet-500 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.6)]'
                      : 'bg-slate-700 border-slate-600 opacity-60'
                  }
                `}
                style={{
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2
                }}
              />

              {/* Hover tooltip */}
              <AnimatePresence>
                {hoveredUser?.id === user.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -50, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                  >
                    <div className="bg-slate-900 border border-cyan-500/40 rounded-lg px-4 py-2 shadow-2xl backdrop-blur-xl z-50">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-full border-2 border-cyan-500/30"
                        />
                        <div>
                          <p className="text-cyan-300 font-mono font-semibold text-sm">
                            {user.username}
                          </p>
                          <p className="text-cyan-500/60 text-xs font-mono">
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="w-3 h-3 bg-slate-900 border-r border-b border-cyan-500/40 transform rotate-45 mx-auto -mt-1.5" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User label (always visible for online users) */}
              {isOnline && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 text-center whitespace-nowrap pointer-events-none"
                >
                  <p className="text-cyan-400 text-xs font-mono font-semibold drop-shadow-lg">
                    {user.username}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Cursor glow effect */}
        <motion.div
          className="absolute w-32 h-32 rounded-full pointer-events-none"
          animate={{ x: mousePos.x - 64, y: mousePos.y - 64 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)'
          }}
        />

        {/* Legend */}
        <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-2 md:p-4">
          <p className="text-cyan-400 font-mono text-[10px] md:text-xs uppercase tracking-wider mb-2 md:mb-3">STATUS</p>
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
              <span className="text-cyan-300 text-[10px] md:text-xs font-mono">ONLINE</span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-600 opacity-40" />
              <span className="text-slate-400 text-[10px] md:text-xs font-mono">OFFLINE</span>
            </div>
          </div>
        </div>

        {/* Stats corner */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg px-2 md:px-4 py-2 md:py-3">
          <p className="text-cyan-400 font-mono text-xs md:text-sm">
            <span className="text-lg md:text-2xl font-bold">{onlineVisibleCount}</span>
            <span className="text-cyan-500/60 text-[10px] md:text-xs ml-1 md:ml-2">/ {users.length} ONLINE</span>
          </p>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <ProfileModal
            profile={{
              id: selectedUser.id,
              username: selectedUser.username,
              avatar_url: selectedUser.avatar,
              bio: '',
              tasks_completed: selectedUser.stats.tasksCompleted,
              tasks_forfeited: selectedUser.stats.tasksForfeited,
              status: onlineUsers.includes(selectedUser.id) ? 'Online' : 'Offline',
              max_wpm: selectedUser.max_wpm,
              orbit_points: selectedUser.orbit_points,
              is_admin: selectedUser.isAdmin,
              can_customize_ai: selectedUser.can_customize_ai
            }}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
