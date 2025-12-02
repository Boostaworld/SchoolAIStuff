import React, { useState, useRef, useEffect } from 'react';
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
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Generate deterministic position from user ID
const getStarPosition = (userId: string, containerWidth: number, containerHeight: number) => {
  const hash = hashString(userId);
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 1000, height: 700 });
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

  const containerWidth = containerDimensions.width;
  const containerHeight = containerDimensions.height;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Users className="w-20 h-20 text-cyan-500/30 mb-6" />
        <p className="text-cyan-400/60 font-mono text-lg">
          NO OPERATIVES DETECTED
        </p>
        <p className="text-cyan-500/40 font-mono text-sm mt-2">
          Scanning for signals...
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-[400px] md:h-[500px] lg:h-[700px] bg-slate-950 rounded-2xl border border-cyan-500/20 overflow-hidden"
        onMouseMove={handleMouseMove}
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
            radial-gradient(1px 1px at 20% 30%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 60% 70%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 50% 50%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 80% 10%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 90% 60%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 33% 90%, rgba(6, 182, 212, 0.3), transparent),
            radial-gradient(1px 1px at 15% 70%, rgba(6, 182, 212, 0.3), transparent)
          `,
          backgroundSize: '100% 100%, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px'
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Scanline effect */}
        <motion.div
          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none"
          animate={{ y: [0, containerHeight - 128, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Connection lines between nearby stars */}
        <svg className="absolute inset-0 pointer-events-none">
          {users.map((user, i) => {
            const pos1 = getStarPosition(user.id, containerWidth, containerHeight);
            const isOnline1 = onlineUsers.includes(user.id);

            return users.slice(i + 1).map(otherUser => {
              const pos2 = getStarPosition(otherUser.id, containerWidth, containerHeight);
              const isOnline2 = onlineUsers.includes(otherUser.id);
              const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));

              // Only draw lines between nearby stars
              if (distance < 150 && (isOnline1 || isOnline2)) {
                return (
                  <motion.line
                    key={`${user.id}-${otherUser.id}`}
                    x1={pos1.x}
                    y1={pos1.y}
                    x2={pos2.x}
                    y2={pos2.y}
                    stroke="rgba(6, 182, 212, 0.2)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: i * 0.1 }}
                  />
                );
              }
              return null;
            });
          })}
        </svg>

        {/* User stars */}
        {users.map((user, index) => {
          const position = getStarPosition(user.id, containerWidth, containerHeight);
          const isOnline = onlineUsers.includes(user.id);

          return (
            <motion.div
              key={user.id}
              className="absolute cursor-pointer group"
              style={{ left: position.x, top: position.y }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
              onMouseEnter={() => setHoveredUser(user)}
              onMouseLeave={() => setHoveredUser(null)}
              onClick={() => setSelectedUser(user)}
            >
              {/* Outer glow ring */}
              {isOnline && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.5, 0.2, 0.5]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, transparent 70%)',
                    width: '32px',
                    height: '32px',
                    marginLeft: '-8px',
                    marginTop: '-8px'
                  }}
                />
              )}

              {/* Star avatar */}
              <motion.div
                className={`
                  relative w-4 h-4 rounded-full border-2
                  ${isOnline
                    ? 'bg-cyan-400 border-cyan-300 shadow-lg shadow-cyan-400/50'
                    : 'bg-slate-600 border-slate-500 opacity-40'
                  }
                  group-hover:scale-150 transition-transform
                `}
                animate={isOnline ? {
                  scale: [1, 1.3, 1],
                  boxShadow: [
                    '0 0 10px rgba(6, 182, 212, 0.8)',
                    '0 0 20px rgba(6, 182, 212, 1)',
                    '0 0 10px rgba(6, 182, 212, 0.8)'
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {/* Inner core */}
                <div className={`
                  absolute inset-0.5 rounded-full
                  ${isOnline ? 'bg-white' : 'bg-slate-700'}
                `} />
              </motion.div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {hoveredUser?.id === user.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -50, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                  >
                    <div className="bg-slate-900 border border-cyan-500/40 rounded-lg px-4 py-2 shadow-2xl backdrop-blur-xl">
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
            <span className="text-lg md:text-2xl font-bold">{onlineUsers.length}</span>
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
              orbit_points: selectedUser.orbit_points
            }}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
