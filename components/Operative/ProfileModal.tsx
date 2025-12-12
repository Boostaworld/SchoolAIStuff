import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Target, TrendingUp, Calendar, Activity, Signal, Sparkles, Crown, Brain } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { getUserBadgeStyle } from '../../lib/utils/badges';

interface ProfileModalProps {
  profile: {
    id: string;
    username: string;
    avatar_url: string;
    bio: string;
    tasks_completed: number;
    tasks_forfeited: number;
    status: string;

    orbit_points?: number;
    is_admin?: boolean;
    can_customize_ai?: boolean;
  };
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose }) => {
  const { createOrGetChannel, setActiveChannel, currentUser } = useOrbitStore();
  const [showPublicPreview, setShowPublicPreview] = useState(false);

  const reliability = profile.tasks_completed > 0
    ? Math.round((profile.tasks_completed / (profile.tasks_completed + profile.tasks_forfeited)) * 100)
    : 0;

  const isOwnProfile = currentUser?.id === profile.id;

  const handleInitializeUplink = async () => {
    if (isOwnProfile) return; // Can't DM yourself

    try {
      const channelId = await createOrGetChannel(profile.id);
      setActiveChannel(channelId);
      if (typeof window !== 'undefined') {
        window.location.hash = '#comms';
      }
      onClose();
    } catch (error) {
      console.error('Failed to initialize uplink:', error);
    }
  };

  // Badge style for the viewed profile
  const profileBadgeStyle = getUserBadgeStyle({
    is_admin: profile.is_admin,
    can_customize_ai: profile.can_customize_ai
  });

  // Badge style for the current user (preview)
  const currentUserBadgeStyle = getUserBadgeStyle({
    is_admin: currentUser?.isAdmin,
    can_customize_ai: currentUser?.can_customize_ai
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10" />
            <div className="relative px-6 py-8 border-b border-slate-800">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-20 h-20 rounded-xl border-2 border-slate-700"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${profile.status === 'Online' ? 'bg-green-500' :
                    profile.status === 'Focus Mode' ? 'bg-violet-500' : 'bg-slate-600'
                    }`}>
                    {profile.status === 'Focus Mode' && (
                      <Activity className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-xl tracking-wider ${profileBadgeStyle.nameClasses || 'text-slate-100'} ${profileBadgeStyle.glowClasses}`}>
                      {profile.username}
                    </h3>
                    {profileBadgeStyle.badgeLabel && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${profileBadgeStyle.badgeContainerClasses}`}>
                        {profileBadgeStyle.badgeIcon}
                        <span>{profileBadgeStyle.badgeLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-mono uppercase tracking-wider ${profile.status === 'Online' ? 'text-green-400' :
                      profile.status === 'Focus Mode' ? 'text-violet-400' : 'text-slate-500'
                      }`}>
                      {profile.status}
                    </span>
                  </div>
                  {profile.bio && (
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6 grid grid-cols-2 gap-4">
            {/* Tasks Completed */}
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Completed</span>
              </div>
              <p className="text-3xl font-bold text-green-400 font-mono">
                {profile.tasks_completed}
              </p>
            </div>

            {/* Tasks Forfeited */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Forfeited</span>
              </div>
              <p className="text-3xl font-bold text-red-400 font-mono">
                {profile.tasks_forfeited}
              </p>
            </div>



            {/* Orbit Points */}
            {profile.orbit_points !== undefined && (
              <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">Orbit</span>
                </div>
                <p className="text-3xl font-bold text-violet-400 font-mono">
                  {profile.orbit_points}
                </p>
              </div>
            )}

            {/* Badges Card */}
            <div className="col-span-2 bg-slate-950/40 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Badges</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.is_admin && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Owner
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-bold border border-purple-400/30">OG</span>
                {profile.can_customize_ai && (
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-bold border border-cyan-400/30 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI+
                  </span>
                )}
                {!profile.can_customize_ai && !profile.is_admin && (
                  <span className="px-3 py-1 rounded-full bg-slate-700/60 text-slate-300 text-xs font-bold border border-slate-600">Standard</span>
                )}
              </div>
            </div>
          </div>

          {/* Reliability Score */}
          <div className="px-6 pb-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Reliability Index
                </span>
                <span className={`text-2xl font-bold font-mono ${reliability >= 80 ? 'text-green-400' :
                  reliability >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  {reliability}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${reliability}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${reliability >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    reliability >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                      'bg-gradient-to-r from-red-500 to-orange-500'
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isOwnProfile && (
            <div className="px-6 pb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInitializeUplink}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono font-bold px-6 py-4 rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 transition-all flex items-center justify-center gap-3 group"
              >
                <Signal className="w-5 h-5 group-hover:animate-pulse" />
                <span className="text-lg tracking-wider">SEND MESSAGE</span>
              </motion.button>
            </div>
          )}

          {isOwnProfile && (
            <div className="px-6 pb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPublicPreview(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-mono font-bold px-6 py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-3"
              >
                <span className="text-lg tracking-wider">How others see me</span>
              </motion.button>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40">
            <p className="text-center text-xs text-slate-600 font-mono uppercase tracking-wider">
              Operative ID: <span className="text-slate-500">{profile.id.slice(0, 8)}...</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {showPublicPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPublicPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
                <div>
                  <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest">Public Preview</p>
                  <h4 className="text-xl font-bold text-slate-100">{profile.username}</h4>
                </div>
                <button
                  onClick={() => setShowPublicPreview(false)}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 flex flex-col items-center gap-3">
                  <div className="relative">
                    <motion.div
                      className="absolute -inset-3 rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-transparent blur-xl"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute -inset-4 rounded-full border border-cyan-400/40"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-24 h-24 rounded-2xl border-4 border-cyan-500/40 shadow-[0_0_24px_rgba(34,211,238,0.25)] object-cover"
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {currentUserBadgeStyle.badgeLabel && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${currentUserBadgeStyle.badgeContainerClasses}`}>
                          {currentUserBadgeStyle.badgeIcon}
                          <span>{currentUserBadgeStyle.badgeLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-400">Profile Effects</p>
                    <p className="text-xs text-slate-500 font-mono">Holo frame + particle trail (preview only)</p>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                      <p className="text-[11px] text-slate-500 font-mono uppercase">Orbit Points</p>
                      <p className="text-2xl font-bold text-cyan-300 font-mono">{profile.orbit_points ?? 0}</p>
                    </div>
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                      <p className="text-[11px] text-slate-500 font-mono uppercase">Completed</p>
                      <p className="text-2xl font-bold text-emerald-300 font-mono">{profile.tasks_completed}</p>
                    </div>
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                      <p className="text-[11px] text-slate-500 font-mono uppercase">Forfeited</p>
                      <p className="text-2xl font-bold text-amber-300 font-mono">{profile.tasks_forfeited}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <p className="text-[11px] text-slate-500 font-mono uppercase mb-1">Badges</p>
                    <div className="flex flex-wrap gap-2">
                      {currentUserBadgeStyle.badgeLabel ? (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold tracking-wider ${currentUserBadgeStyle.badgeContainerClasses}`}>
                          {currentUserBadgeStyle.badgeIcon}
                          <span>{currentUserBadgeStyle.badgeLabel}</span>
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-700/60 text-slate-300 text-xs font-bold border border-slate-600">Standard</span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-bold border border-purple-400/30">OG</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
