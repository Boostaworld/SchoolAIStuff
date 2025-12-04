import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrbitStore } from '../../store/useOrbitStore';
import clsx from 'clsx';

interface FriendOption {
  id: string;
  username: string;
  avatar?: string;
  orbitPoints?: number;
}

interface FriendPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string, friend?: FriendOption) => void;
}

export const FriendPickerModal: React.FC<FriendPickerModalProps> = ({ open, onClose, onSelect }) => {
  const { dmChannels, currentUser } = useOrbitStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FriendOption[]>([]);

  const recentContacts = useMemo(() => {
    const seen = new Set<string>();
    const contacts: FriendOption[] = [];

    dmChannels.forEach((channel) => {
      const friend = channel.otherUser;
      if (friend && friend.id !== currentUser?.id && !seen.has(friend.id)) {
        seen.add(friend.id);
        contacts.push({
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          orbitPoints: friend.orbit_points
        });
      }
    });

    return contacts;
  }, [dmChannels, currentUser?.id]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setResults([]);
    }
  }, [open]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, orbit_points')
      .ilike('username', `%${term}%`)
      .limit(8);

    if (error) {
      console.error('Friend search failed:', error);
    } else {
      const mapped = (data || [])
        .filter((row: any) => row.id !== currentUser?.id)
        .map((row: any) => ({
          id: row.id,
          username: row.username,
          avatar: row.avatar_url,
          orbitPoints: row.orbit_points
        }));
      setResults(mapped);
    }
    setIsSearching(false);
  };

  const renderOption = (friend: FriendOption) => (
    <button
      key={friend.id}
      onClick={() => onSelect(friend.id, friend)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all group"
    >
      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center">
        {friend.avatar ? (
          <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-mono text-cyan-300">{friend.username.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
          {friend.username}
        </p>
        <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wide">
          {friend.orbitPoints ? `${friend.orbitPoints} Orbit pts` : 'Tap to share'}
        </p>
      </div>
      <span className="text-[11px] font-mono text-cyan-400">Select</span>
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900 to-slate-900/80">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-mono uppercase tracking-wider text-slate-300">Send to Friend</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/60">
              <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wide">Search by username</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ex: nova, captain"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wide flex items-center gap-2 border',
                    isSearching
                      ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                      : 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 transition-colors'
                  )}
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
            </form>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {results.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Search Results</p>
                  </div>
                  <div className="space-y-2">
                    {results.map(renderOption)}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Recent Contacts</p>
                </div>
                {recentContacts.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-slate-700 text-slate-500 text-sm font-mono">
                    No recent contacts yet. Search for a friend to share this chat.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentContacts.map(renderOption)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
