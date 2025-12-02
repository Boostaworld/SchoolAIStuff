import React, { useState } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Database, Lock, ExternalLink, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntelDropModal } from './IntelDropModal';
import { IntelDrop } from '../../types';

export const HordeFeed: React.FC = () => {
  const { intelDrops, currentUser, deleteIntelDrop } = useOrbitStore();
  const [selectedDrop, setSelectedDrop] = useState<IntelDrop | null>(null);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("CONFIRM DELETION PROTOCOL? This item will be permanently purged.")) {
      await deleteIntelDrop(id);
    }
  };

  return (
    <>
      <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <span className="text-cyan-500">#</span> HORDE FEED
          </h3>
          <div className="flex items-center gap-2">
            {currentUser?.is_admin && (
              <div className="flex items-center gap-1 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/40">
                <ShieldAlert className="w-3 h-3 text-red-500" />
                <span className="text-[9px] text-red-500 font-mono uppercase">ADMIN</span>
              </div>
            )}
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-mono">
              LIVE
            </span>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {intelDrops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700 mb-3">
                <Database className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm font-mono uppercase tracking-wide">No Intel Drops</p>
              <p className="text-slate-600 text-xs mt-1">Share research to populate the feed</p>
            </div>
          ) : (
            intelDrops.map((drop, idx) => (
              <motion.div
                key={drop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedDrop(drop)}
                className="group bg-gradient-to-br from-slate-950/80 to-slate-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-lg overflow-hidden transition-all cursor-pointer relative"
              >
                {/* Author Header */}
                <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={drop.author_avatar}
                      alt={drop.author_username}
                      className="w-5 h-5 rounded-full border border-slate-700"
                    />
                    <span className="text-xs text-slate-400 font-mono">{drop.author_username}</span>
                    {drop.is_private && drop.author_id === currentUser?.id && (
                      <div className="flex items-center gap-1 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                        <Lock className="w-2.5 h-2.5 text-violet-400" />
                        <span className="text-[9px] text-violet-400 font-mono uppercase">Private</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-slate-600 font-mono">{formatTimeAgo(drop.created_at)}</span>
                    {/* Delete Button for Owner OR Admin */}
                    {(currentUser?.id === drop.author_id || currentUser?.is_admin) && (
                      <button
                        onClick={(e) => handleDelete(e, drop.id)}
                        className={`transition-colors ${currentUser?.is_admin ? 'text-red-500 hover:text-red-300' : 'text-slate-600 hover:text-red-400'}`}
                        title={currentUser?.is_admin ? "Admin Force Delete" : "Delete Drop"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Query */}
                <div className="px-3 py-2 bg-slate-900/40">
                  <div className="flex items-start gap-2">
                    <Database className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300 font-medium leading-snug">{drop.query}</p>
                  </div>
                </div>

                {/* Summary Bullets */}
                <div className="px-3 py-2 space-y-1.5">
                  {drop.summary_bullets.slice(0, 2).map((bullet, i) => (
                    <div key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                      <span className="text-cyan-500 mt-0.5 flex-shrink-0">•</span>
                      <span className="line-clamp-2">{bullet}</span>
                    </div>
                  ))}
                </div>

                {/* Footer - Sources Preview */}
                <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {drop.sources.length} sources
                    </span>
                    <span className="flex items-center gap-1">
                      {drop.related_concepts.length} concepts
                    </span>
                  </div>
                  <button className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono uppercase tracking-wider transition-colors opacity-0 group-hover:opacity-100">
                    View Full
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedDrop && (
          <IntelDropModal
            drop={selectedDrop}
            onClose={() => setSelectedDrop(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};