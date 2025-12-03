import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '@/store/useOrbitStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Shield, Users, Edit, Trash2, Ban, Crown, Sparkles, Search, CheckCircle2, XCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  orbit_points: number;
  max_wpm: number;
  is_admin: boolean;
  can_customize_ai: boolean;
  unlocked_models: string[];
  tasks_completed: number;
  tasks_forfeited: number;
  created_at: string;
}

export function GodModePanel() {
  const { currentUser } = useOrbitStore();
  const isAdminUser = currentUser?.is_admin;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserOriginal, setSelectedUserOriginal] = useState<UserProfile | null>(null);

  const isMissingAuditTable = (error: any) =>
    error?.code === 'PGRST205' && error?.message?.includes("table 'public.admin_audit_logs'");

  const logAdminAction = async (action: string, details: Record<string, any>) => {
    if (!currentUser?.id) return;

    try {
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: currentUser.id,
          target_user_id: details.target_user_id,
          action,
          details
        });
    } catch (error: any) {
      if (!isMissingAuditTable(error)) {
        console.warn('Admin audit log failed:', error);
      }
    }
  };

  // Only show if user is admin
  if (!isAdminUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-20 h-20 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400">ACCESS DENIED</h2>
          <p className="text-slate-500 mt-2">Admin clearance required</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching users from database...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (error) throw error;
      console.log(`✅ Fetched ${data?.length || 0} users from database`);
      setUsers(data || []);
    } catch (error: any) {
      console.error('❌ Fetch users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<UserProfile>, previous?: UserProfile | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction('update_user', {
        target_user_id: userId,
        updates,
        previous
      });

      toast.success('User updated successfully');
      await fetchUsers();
      setSelectedUser(null);
      setSelectedUserOriginal(null);
    } catch (error: any) {
      console.error('Update user error:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('PERMANENTLY DELETE THIS USER?\n\nThis action cannot be undone.')) return;

    const targetUser = users.find(u => u.id === userId) || selectedUser || null;

    try {
      console.log('🗑️ Attempting to delete user:', userId);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('❌ Profile deletion failed:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Profile deleted from database');

      // Try to log admin action (optional, may fail if table doesn't exist)
      await logAdminAction('delete_user', {
        target_user_id: userId,
        previous: targetUser
      }).catch((err) => {
        console.warn('⚠️ Admin audit log failed (non-critical):', err.message);
      });

      toast.success('User deleted successfully');
      await fetchUsers();
      setSelectedUser(null);
      setSelectedUserOriginal(null);
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      toast.error(error.message || 'Failed to delete user - check console for details');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 rounded-3xl border-2 border-red-500/30 overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.2)] relative">
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/20 to-transparent animate-[scan_6s_linear_infinite]" />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-slate-900/80 to-red-950/50 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400" style={{ fontFamily: 'Orbitron, monospace' }}>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity }
                }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)]"
              >
                <Crown className="text-white w-6 h-6" />
              </motion.div>
              GOD MODE
            </h2>
            <p className="text-sm text-red-400/70 mt-2 font-mono flex items-center gap-2">
              <Shield className="w-3 h-3" />
              ADMIN CONTROL PANEL • FULL SYSTEM ACCESS • {users.length} OPERATIVES
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <div className="text-2xl font-black text-red-400 font-mono">{filteredUsers.length}</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Users</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by username..."
            className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-red-500/30 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 font-mono"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Shield className="w-12 h-12 text-red-400" />
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-4 bg-slate-800/50 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setSelectedUserOriginal(user);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.username[0].toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{user.username}</h3>
                      {user.is_admin && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          ADMIN
                        </span>
                      )}
                      {user.can_customize_ai && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI+
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-mono">
                      <span>💰 {user.orbit_points} PTS</span>
                      <span>⚡ {user.max_wpm} WPM</span>
                      <span>✅ {user.tasks_completed} tasks</span>
                      <span>❌ {user.tasks_forfeited} forfeited</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setSelectedUserOriginal(user);
                      }}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-all"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUser(user.id);
                      }}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50"
            onClick={() => {
              setSelectedUser(null);
              setSelectedUserOriginal(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-red-500/30 rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400" style={{ fontFamily: 'Orbitron, monospace' }}>
                  EDIT OPERATIVE
                </h3>
                <button
                  onClick={() => { setSelectedUser(null); setSelectedUserOriginal(null); }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* User Info */}
              <div className="space-y-6">
                {/* Points Editor */}
                <div>
                  <label className="text-xs text-red-400 font-mono uppercase mb-2 block">Orbit Points</label>
                  <input
                    type="number"
                    defaultValue={selectedUser.orbit_points}
                    onChange={(e) => setSelectedUser({ ...selectedUser, orbit_points: parseInt(e.target.value) })}
                    className="w-full bg-slate-950/50 border border-red-500/30 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500/50"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="text-xs text-red-400 font-mono uppercase mb-3 block">Permissions</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`relative w-14 h-7 rounded-full transition-all ${selectedUser.is_admin ? 'bg-red-500' : 'bg-slate-700'}`}>
                        <motion.div
                          animate={{ x: selectedUser.is_admin ? 28 : 2 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                        />
                      </div>
                      <div>
                        <span className="text-sm text-slate-200 font-medium flex items-center gap-2">
                          <Crown className="w-4 h-4 text-red-400" />
                          Admin Access
                        </span>
                        <p className="text-xs text-slate-500">Full system control</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUser.is_admin}
                        onChange={(e) => setSelectedUser({ ...selectedUser, is_admin: e.target.checked })}
                        className="hidden"
                      />
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`relative w-14 h-7 rounded-full transition-all ${selectedUser.can_customize_ai ? 'bg-purple-500' : 'bg-slate-700'}`}>
                        <motion.div
                          animate={{ x: selectedUser.can_customize_ai ? 28 : 2 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                        />
                      </div>
                      <div>
                        <span className="text-sm text-slate-200 font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          AI Customization
                        </span>
                        <p className="text-xs text-slate-500">Unlock command deck features</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUser.can_customize_ai}
                        onChange={(e) => setSelectedUser({ ...selectedUser, can_customize_ai: e.target.checked })}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* AI Models */}
                <div>
                  <label className="text-xs text-red-400 font-mono uppercase mb-3 block">Unlocked AI Models</label>
                  <div className="space-y-2">
                    {['flash', 'pro', 'orbit-x'].map(model => {
                      const isUnlocked = selectedUser.unlocked_models?.includes(model);
                      return (
                        <label
                          key={model}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:border-purple-500/50 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={isUnlocked}
                            onChange={(e) => {
                              const models = selectedUser.unlocked_models || [];
                              if (e.target.checked) {
                                setSelectedUser({ ...selectedUser, unlocked_models: [...models, model] });
                              } else {
                                setSelectedUser({ ...selectedUser, unlocked_models: models.filter(m => m !== model) });
                              }
                            }}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-slate-200 font-medium uppercase">{model}</span>
                          </div>
                          {isUnlocked ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-slate-600" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => { setSelectedUser(null); setSelectedUserOriginal(null); }}
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateUser(selectedUser.id, {
                      orbit_points: selectedUser.orbit_points,
                      is_admin: selectedUser.is_admin,
                      can_customize_ai: selectedUser.can_customize_ai,
                      unlocked_models: selectedUser.unlocked_models
                    })}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS */}
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
