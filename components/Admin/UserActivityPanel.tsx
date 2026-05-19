import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Users,
  DollarSign,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  Activity,
  Cpu,
  BarChart3,
  ArrowLeft,
  Receipt
} from 'lucide-react';
import { UsagePricingBreakdown } from './UsagePricingBreakdown';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface AIActivity {
  id: string;
  user_id: string;
  activity_type: string;
  model: string;
  estimated_tokens: number;
  estimated_cost_usd: number;
  user_input: string;
  ai_response: string;
  image_prompt: string;
  image_url: string;
  feature: string;
  created_at: string;
  flagged: boolean;
  flag_reason: string;
}

interface UserStats {
  user_id: string;
  username: string;
  avatar_url: string;
  total_interactions: number;
  interactions_today: number;
  interactions_week: number;
  chat_messages: number;
  images_generated: number;
  research_queries: number;
  total_cost_usd: number;
  cost_today: number;
  cost_month: number;
  flagged_count: number;
  last_activity: string;
}

const ACTIVITY_TYPES = {
  chat_message: { icon: MessageSquare, label: 'Chat', color: '#00ff9f' },
  image_generation: { icon: ImageIcon, label: 'Image', color: '#ff00ff' },
  research_query: { icon: Search, label: 'Research', color: '#00d4ff' },
  vision_session: { icon: Eye, label: 'Vision', color: '#ffaa00' },
  prompt_improve: { icon: Zap, label: 'Enhance', color: '#ff6b00' },
  image_edit: { icon: ImageIcon, label: 'Edit', color: '#aa00ff' },
};

export function UserActivityPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserActivities(selectedUserId);
    }
  }, [selectedUserId, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .order('username', { ascending: true });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_ai_stats')
        .select('*');

      if (statsError) {
        console.warn('Stats view not available:', statsError);
      } else {
        const statsMap = (statsData || []).reduce((acc, stat) => {
          acc[stat.user_id] = stat;
          return acc;
        }, {} as Record<string, UserStats>);
        setUserStats(statsMap);
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async (userId: string) => {
    try {
      setLoadingActivities(true);
      let query = supabase
        .from('ai_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('activity_type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch activities:', error);
      } else {
        setActivities(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const toggleFlag = async (activityId: string, currentFlag: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_activity_logs')
        .update({ flagged: !currentFlag })
        .eq('id', activityId);

      if (error) throw error;

      // Refresh both activities AND user stats to update flag count
      if (selectedUserId) {
        await Promise.all([
          fetchUserActivities(selectedUserId),
          fetchData() // Refresh all user stats
        ]);
      }
    } catch (error: any) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const selectedStats = selectedUserId ? userStats[selectedUserId] : null;

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // User list view
  if (!selectedUserId) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 rounded-3xl border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.15)] relative">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, #00ffff 0px, transparent 1px, transparent 40px),
                            repeating-linear-gradient(90deg, #00ffff 0px, transparent 1px, transparent 40px)`,
        }} />

        {/* Scanline */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-[scan_8s_linear_infinite]" />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900/80 to-cyan-950/50 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-green-400 to-emerald-400 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ rotate: { duration: 4, repeat: Infinity, ease: 'linear' } }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-green-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                >
                  <Activity className="text-white w-6 h-6" />
                </motion.div>
                AI ACTIVITY MONITOR
              </h2>
              <p className="text-sm text-cyan-400/70 font-mono flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                {filteredUsers.length} USERS • TOTAL COST: ${Object.values(userStats).reduce((sum, s) => sum + (s.total_cost_usd || 0), 0).toFixed(4)}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-cyan-500/30 rounded-lg text-sm text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
        </div>

        {/* User Grid */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Activity className="w-12 h-12 text-cyan-400" />
              </motion.div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-20 h-20 text-cyan-500/30 mx-auto mb-4" />
                <p className="text-cyan-400/50 font-mono text-sm uppercase tracking-wider">NO USERS FOUND</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user, idx) => {
                const stats = userStats[user.id];
                const hasActivity = stats && stats.total_interactions > 0;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all group ${
                      hasActivity
                        ? 'bg-slate-800/50 border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center text-white font-bold">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.username[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{user.username}</h3>
                        {stats && stats.last_activity && (
                          <p className="text-xs text-slate-500 font-mono">
                            Last: {new Date(stats.last_activity).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          <div className="text-xs text-slate-500 font-mono uppercase">Interactions</div>
                          <div className="text-lg font-black text-cyan-400 font-mono">{stats?.total_interactions || 0}</div>
                        </div>
                        <div className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                          <div className="text-xs text-slate-500 font-mono uppercase">Cost</div>
                          <div className="text-lg font-black text-green-400 font-mono">${stats?.total_cost_usd?.toFixed(4) || '0.0000'}</div>
                        </div>
                      </div>

                      {hasActivity && (
                        <>
                          <div className="flex gap-2 text-xs font-mono flex-wrap">
                            {stats.chat_messages > 0 && (
                              <span className="px-2 py-1 bg-slate-700/50 text-green-400 rounded">
                                💬 {stats.chat_messages}
                              </span>
                            )}
                            {stats.images_generated > 0 && (
                              <span className="px-2 py-1 bg-slate-700/50 text-purple-400 rounded">
                                🖼️ {stats.images_generated}
                              </span>
                            )}
                            {stats.research_queries > 0 && (
                              <span className="px-2 py-1 bg-slate-700/50 text-cyan-400 rounded">
                                🔍 {stats.research_queries}
                              </span>
                            )}
                          </div>

                          {stats.flagged_count > 0 && (
                            <div className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span className="text-xs text-red-400 font-mono">{stats.flagged_count} Flagged</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
        `}</style>
      </div>
    );
  }

  // Activity detail view
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 rounded-3xl border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.15)] relative">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, #00ffff 0px, transparent 1px, transparent 40px),
                          repeating-linear-gradient(90deg, #00ffff 0px, transparent 1px, transparent 40px)`,
      }} />

      {/* Scanline */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-[scan_8s_linear_infinite]" />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900/80 to-cyan-950/50 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedUserId(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center text-white font-bold">
                {selectedUser?.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  selectedUser?.username[0].toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400" style={{ fontFamily: 'Orbitron, monospace' }}>
                  {selectedUser?.username}
                </h2>
                <p className="text-sm text-cyan-400/70 font-mono">Activity Monitor</p>
              </div>
            </div>
          </div>

          {selectedStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="text-xl font-black text-cyan-400 font-mono">${selectedStats.cost_month?.toFixed(4) || '0.0000'}</div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Month Cost</div>
              </div>
              <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-xl font-black text-green-400 font-mono">{selectedStats.total_interactions || 0}</div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Interactions</div>
              </div>
              <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-xl font-black text-amber-400 font-mono">{selectedStats.flagged_count || 0}</div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Flagged</div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Breakdown Toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowPricingBreakdown(!showPricingBreakdown)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span className="text-sm font-mono text-slate-300 group-hover:text-cyan-300 transition-colors">
                Usage & Pricing Breakdown
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${showPricingBreakdown ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showPricingBreakdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <UsagePricingBreakdown
                  stats={selectedStats}
                  activities={activities}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 flex-wrap mt-4"
        >
          {Object.entries(ACTIVITY_TYPES).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all ${
                filterType === type
                  ? 'border-2 shadow-lg'
                  : 'border border-slate-700 hover:border-slate-600'
              }`}
              style={{
                backgroundColor: filterType === type ? `${config.color}20` : 'rgba(15, 23, 42, 0.5)',
                borderColor: filterType === type ? config.color : undefined,
                color: filterType === type ? config.color : '#64748b',
              }}
            >
              <config.icon className="w-3 h-3 inline mr-1" />
              {config.label}
            </button>
          ))}
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all ${
              filterType === 'all'
                ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 shadow-lg'
                : 'bg-slate-900/50 border border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            All
          </button>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {loadingActivities ? (
          <div className="flex items-center justify-center h-full">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Activity className="w-12 h-12 text-cyan-400" />
            </motion.div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="w-20 h-20 text-cyan-500/30 mx-auto mb-4" />
              <p className="text-cyan-400/50 font-mono text-sm uppercase tracking-wider mb-2">
                NO ACTIVITY LOGGED YET
              </p>
              <p className="text-slate-600 text-xs font-mono">
                Activity will appear here after {selectedUser?.username} uses AI features
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, idx) => {
              const config = ACTIVITY_TYPES[activity.activity_type as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.chat_message;
              const isExpanded = expandedActivity === activity.id;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="group relative"
                >
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      activity.flagged
                        ? 'bg-red-500/10 border-red-500/50 hover:border-red-500/70'
                        : 'bg-slate-800/50 border-cyan-500/20 hover:border-cyan-500/40'
                    }`}
                    onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Type & Time */}
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0"
                          style={{
                            backgroundColor: `${config.color}15`,
                            borderColor: `${config.color}50`,
                          }}
                        >
                          <config.icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: config.color }}>
                              {config.label}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(activity.created_at).toLocaleString()}
                            </span>
                            {activity.feature && (
                              <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px] font-mono uppercase">
                                {activity.feature.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-slate-300 font-mono">
                            Model: <span className="text-cyan-400 font-bold">{activity.model}</span>
                            {activity.estimated_tokens && (
                              <>
                                {' • '}
                                <Zap className="w-3 h-3 inline text-amber-400" />
                                <span className="text-amber-400">{activity.estimated_tokens.toLocaleString()} tokens</span>
                              </>
                            )}
                          </div>

                          {/* Preview text */}
                          {!isExpanded && activity.user_input && (
                            <p className="text-xs text-slate-400 mt-2 line-clamp-2 font-mono break-words">
                              {activity.user_input.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Cost & Actions */}
                      <div className="flex items-start gap-3 flex-shrink-0">
                        {activity.estimated_cost_usd !== null && activity.estimated_cost_usd !== undefined && (
                          <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div className="text-lg font-black text-green-400 font-mono whitespace-nowrap">
                              ${activity.estimated_cost_usd.toFixed(6)}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlag(activity.id, activity.flagged);
                          }}
                          className={`p-2 rounded-lg border transition-all ${
                            activity.flagged
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400'
                          }`}
                          title={activity.flagged ? 'Unflag' : 'Flag for review'}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-cyan-500/20"
                        >
                          {activity.user_input && (
                            <div className="mb-3">
                              <div className="text-xs text-cyan-400 font-mono uppercase mb-1">User Input:</div>
                              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-700 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
                                {activity.user_input}
                              </div>
                            </div>
                          )}

                          {activity.ai_response && (
                            <div className="mb-3">
                              <div className="text-xs text-green-400 font-mono uppercase mb-1">AI Response:</div>
                              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-700 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
                                {activity.ai_response}
                              </div>
                            </div>
                          )}

                          {activity.image_prompt && (
                            <div className="mb-3">
                              <div className="text-xs text-purple-400 font-mono uppercase mb-1">Image Prompt:</div>
                              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-700 text-sm text-slate-300 font-mono break-words">
                                {activity.image_prompt}
                              </div>
                            </div>
                          )}

                          {activity.image_url && (
                            <div>
                              <div className="text-xs text-purple-400 font-mono uppercase mb-1">Generated Image:</div>
                              <img
                                src={activity.image_url}
                                alt="Generated"
                                className="max-w-md rounded-lg border border-purple-500/30"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
      `}</style>
    </div>
  );
}
