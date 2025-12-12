import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, TrendingUp, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { ProfileModal } from './ProfileModal';
import { getUserBadgeStyle } from '../../lib/utils/badges';

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  tasks_completed: number;
  tasks_forfeited: number;
  status: string;
  orbit_points?: number;
  last_active?: string;
  is_admin?: boolean;
  can_customize_ai?: boolean;
}

export const OperativeSearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<SearchResult | null>(null);

  // Helper function to determine if user is online based on last_active
  const getOnlineStatus = (lastActive?: string) => {
    if (!lastActive) return 'Offline';
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);

    // Consider online if active within last 5 minutes
    if (diffMinutes < 5) return 'Online';
    // Consider away if active within last 30 minutes
    if (diffMinutes < 30) return 'Away';
    return 'Offline';
  };

  // Fetch all profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, tasks_completed, tasks_forfeited, status, orbit_points, last_active, is_admin, can_customize_ai')
          .order('username', { ascending: true })
          .limit(1000); // Reasonable limit for client-side filtering

        if (error) throw error;
        setAllProfiles(data as unknown as SearchResult[] || []);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return allProfiles;

    const query = searchQuery.toLowerCase();
    return allProfiles.filter(profile =>
      profile.username.toLowerCase().includes(query)
    );
  }, [allProfiles, searchQuery]);

  return (
    <>
      <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900/90 to-slate-900/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(6,182,212,0.05)_50%,transparent_100%)] animate-shimmer" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>
              <div>
                <h2 className="font-bold text-slate-100 tracking-wider">OPERATIVE DATABASE</h2>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Global Registry Access</p>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-500">
              {allProfiles.length} RECORDS
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
            <div className="relative flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group-focus-within:border-cyan-500/50 transition-colors">
              <Search className="w-4 h-4 text-slate-500 ml-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter operatives..."
                className="flex-1 bg-transparent px-2 py-3 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-500/60 font-mono text-xs animate-pulse">DOWNLOADING REGISTRY...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredProfiles.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center gap-4"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                    <Search className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-1">No Matches Found</p>
                    <p className="text-slate-600 text-xs max-w-xs">
                      Try adjusting your search filters
                    </p>
                  </div>
                </motion.div>
              ) : (
                filteredProfiles.map((profile) => {
                  const actualStatus = getOnlineStatus(profile.last_active);
                  return (
                    <motion.button
                      layout
                      key={profile.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedProfile(profile)}
                      className="w-full bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] rounded-xl p-4 transition-all duration-300 text-left group relative overflow-hidden"
                    >
                      {/* Subtle gradient background on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="flex items-start gap-4 relative z-10">
                        <div className="relative">
                          <img
                            src={profile.avatar_url}
                            alt={profile.username}
                            className="w-12 h-12 rounded-xl border-2 border-slate-700 group-hover:border-cyan-400 transition-colors duration-300 object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 transition-all duration-300 ${actualStatus === 'Online' ? 'bg-green-500 group-hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                            actualStatus === 'Away' ? 'bg-amber-500 group-hover:shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                              profile.status === 'Focus Mode' ? 'bg-violet-500 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-slate-600'
                            }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            {(() => {
                              const badgeStyle = getUserBadgeStyle({
                                is_admin: profile.is_admin,
                                can_customize_ai: profile.can_customize_ai
                              });
                              return (
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm font-bold tracking-wide transition-colors duration-300 ${badgeStyle.nameClasses || 'text-slate-200 group-hover:text-cyan-400'} ${badgeStyle.glowClasses}`}>
                                    {profile.username}
                                  </h4>
                                  {badgeStyle.badgeLabel && (
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${badgeStyle.badgeContainerClasses}`}>
                                      {badgeStyle.badgeIcon}
                                      <span className="hidden sm:inline">{badgeStyle.badgeLabel}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div className="flex items-center gap-2">
                              {(profile.orbit_points || 0) > 0 && (
                                <span className="text-[10px] px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 font-mono">
                                  {profile.orbit_points} OP
                                </span>
                              )}
                              {profile.status === 'Focus Mode' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono hidden sm:inline-block">FOCUS</span>
                              )}
                            </div>
                          </div>

                          {profile.bio && (
                            <p className="text-xs text-slate-500 line-clamp-1 mb-3 group-hover:text-slate-400 transition-colors">{profile.bio}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Completed Stats Pill */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 group-hover:border-green-500/30 group-hover:bg-green-500/10 transition-all duration-300">
                              <Target className="w-3.5 h-3.5 text-slate-500 group-hover:text-green-400 transition-colors" />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-mono text-slate-600 group-hover:text-green-400/80 uppercase leading-none mb-0.5">Mission Comp.</span>
                                <span className="text-xs font-bold text-slate-300 group-hover:text-green-300 font-mono leading-none">{profile.tasks_completed}</span>
                              </div>
                            </div>

                            {/* Forfeited Stats Pill */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 group-hover:border-red-500/30 group-hover:bg-red-500/10 transition-all duration-300">
                              <TrendingUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition-colors" />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-mono text-slate-600 group-hover:text-red-400/80 uppercase leading-none mb-0.5">Mission Fail</span>
                                <span className="text-xs font-bold text-slate-300 group-hover:text-red-300 font-mono leading-none">{profile.tasks_forfeited}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
