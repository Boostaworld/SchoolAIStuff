import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Paperclip, Send, Signal, Users, Trash2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { DMChannel } from '../../types';
import MessageBubble from './MessageBubble';
import { formatLastSeen } from '../../lib/utils/time';
import { groupMessagesByDate } from '../../lib/utils/messageGrouping';
import { supabase } from '../../lib/supabase';
import { ConfirmModal } from '../Shared/ConfirmModal';

export default function CommsPage() {
  const {
    dmChannels,
    activeChannelId,
    messages,
    typingUsers,
    onlineUsers,
    setActiveChannel,
    sendMessage,
    setTyping,
    hideChannel,
    toggleReadReceipts
  } = useOrbitStore();

  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; username: string }>({ isOpen: false, username: '' });

  // Force presence sync when page mounts
  useEffect(() => {
    // Get latest presence state from Supabase
    const presenceChannel = supabase.channel('online_presence');
    presenceChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        const state = presenceChannel.presenceState();
        const userIds = Object.values(state).flat().map((p: any) => p.user_id);
        console.log('🔄 Synced online users in CommsPage:', userIds.length);
      }
    });
  }, []);

  // Instant scroll when channel changes (before paint)
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [activeChannelId]);

  // Smooth scroll when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && activeChannelId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const activeChannel = dmChannels.find(ch => ch.id === activeChannelId);
  const activeMessages = activeChannelId ? messages[activeChannelId] || [] : [];
  const groupedMessages = groupMessagesByDate(activeMessages);
  const currentTypingUsers = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannelId || (!inputValue.trim() && !selectedFile)) return;

    await sendMessage(activeChannelId, inputValue, selectedFile || undefined);
    setInputValue('');
    setSelectedFile(null);
    setTyping(activeChannelId, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (activeChannelId) {
      setTyping(activeChannelId, e.target.value.length > 0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getOtherUser = (channel: DMChannel) => channel.otherUser;
  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const getTypingIndicatorText = (userIds: string[]) => {
    if (userIds.length === 0) return '';
    if (userIds.length === 1) return 'Operative is transmitting...';
    return `${userIds.length} operatives are transmitting...`;
  };

  return (
    <>
      <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Channel list */}
        <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-cyan-500/20 bg-slate-900/60 flex items-center gap-2">
            <Signal className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-cyan-400 font-mono text-sm">SECURE UPLINK</p>
              <p className="text-cyan-500/60 text-xs font-mono">
                {dmChannels.length} ACTIVE CHANNEL{dmChannels.length !== 1 ? 'S' : ''}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {dmChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Users className="w-14 h-14 text-cyan-500/30 mb-3" />
                <p className="text-cyan-400/70 font-mono text-sm">NO ACTIVE CHANNELS</p>
                <p className="text-cyan-500/40 font-mono text-xs mt-1">
                  Initialize uplink from operative profiles
                </p>
              </div>
            ) : (
              dmChannels.map(channel => {
                const otherUser = getOtherUser(channel);
                const online = otherUser ? isUserOnline(otherUser.id) : false;

                return (
                  <motion.button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${activeChannelId === channel.id
                      ? 'bg-cyan-500/10 border-cyan-400/40'
                      : 'bg-slate-900/40 border-cyan-500/20 hover:border-cyan-400/40 hover:bg-slate-900/70'
                      }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={otherUser?.avatar}
                          alt={otherUser?.username}
                          className="w-12 h-12 rounded-full border-2 border-cyan-500/30"
                        />
                        {online && (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-slate-950 shadow-lg shadow-cyan-400/50"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-cyan-200 font-mono font-semibold truncate">
                          {otherUser?.username || 'Unknown'}
                        </p>
                        <p className="text-cyan-500/60 text-xs font-mono truncate">
                          {online ? 'ONLINE' : 'OFFLINE'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div >

        {/* Message pane */}
        < div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl flex flex-col overflow-hidden" >
          {activeChannel && (
            <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/50">
              {(() => {
                const otherUser = getOtherUser(activeChannel);
                const online = otherUser ? isUserOnline(otherUser.id) : false;
                return (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={otherUser?.avatar}
                        alt={otherUser?.username}
                        className="w-10 h-10 rounded-full border-2 border-cyan-500/30"
                      />
                      {online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-950" />
                      )}
                    </div>
                    <div>
                      <p className="text-cyan-300 font-mono font-semibold">
                        {otherUser?.username || 'Unknown'}
                      </p>
                      <p className="text-cyan-500/60 text-xs font-mono">
                        {online ? 'ONLINE' : `LAST SEEN: ${formatLastSeen(otherUser?.last_active)}`}
                      </p>
                    </div>
                    {/* Read Receipts Toggle */}
                    <button
                      onClick={() => toggleReadReceipts(activeChannelId, !activeChannel.read_receipts_enabled)}
                      className={`p-2 border rounded-lg transition-colors group ml-auto mr-2 ${activeChannel.read_receipts_enabled
                        ? 'hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-500/50'
                        : 'hover:bg-slate-700/50 border-slate-700 hover:border-slate-600'
                        }`}
                      title={activeChannel.read_receipts_enabled ? "Read Receipts: ON" : "Read Receipts: OFF"}
                    >
                      {activeChannel.read_receipts_enabled ? (
                        <Eye className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                      )}
                    </button>

                    {/* Delete Chat Button */}
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, username: otherUser?.username || 'Unknown' })}
                      className="p-2 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors group"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    </button>
                  </div>
                );
              })()}
            </div>
          )
          }

          {
            activeChannel && (() => {
              const otherUser = getOtherUser(activeChannel);
              const online = otherUser ? isUserOnline(otherUser.id) : false;
              return !online ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 bg-amber-900/20 border-b border-amber-500/30"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-400 text-xs font-mono">
                      TARGET OFFLINE // SIGNAL CACHED // TRANSMISSION DELAYED
                    </p>
                  </div>
                </motion.div>
              ) : null;
            })()
          }

          {
            currentTypingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-2 bg-cyan-900/10 border-b border-cyan-500/10"
              >
                <p className="text-cyan-400 text-xs font-mono italic flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                  {getTypingIndicatorText(currentTypingUsers)}
                </p>
              </motion.div>
            )
          }

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeChannel ? (
              activeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-cyan-500/40 font-mono text-sm text-center">
                    CHANNEL INITIALIZED<br />
                    <span className="text-xs">Begin secure transmission</span>
                  </p>
                </div>
              ) : (
                groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                      <span className="text-xs text-cyan-400/60 font-mono uppercase tracking-wider px-3 py-1 bg-slate-900/50 rounded-full border border-cyan-500/20">
                        {group.date}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                    </div>

                    {/* Messages for this day */}
                    {group.messages.map(message => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                ))
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-cyan-500/50 font-mono text-sm text-center">
                  Select a channel to begin transmission
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-cyan-500/20 bg-slate-900/50 p-4">
            <form onSubmit={handleSend} className="space-y-2">
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                >
                  <Paperclip className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300 text-sm font-mono flex-1 truncate">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    ×
                  </button>
                </motion.div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={() => activeChannelId && setTyping(activeChannelId, false)}
                  placeholder={activeChannel ? 'TRANSMIT SIGNAL...' : 'Select a channel to start'}
                  className="flex-1 bg-slate-900 border border-cyan-500/30 focus:border-cyan-400/50 rounded-lg px-4 py-3 text-cyan-100 placeholder-cyan-500/40 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
                  disabled={!activeChannel}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activeChannel}
                >
                  <Paperclip className="w-5 h-5 text-cyan-400" />
                </button>

                <button
                  type="submit"
                  disabled={!activeChannel || (!inputValue.trim() && !selectedFile)}
                  className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:opacity-50 rounded-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 text-slate-950" />
                </button>
              </div>
            </form>
          </div>
        </div >
      </div >

      {/* Delete Chat Confirmation Modal */}
      < ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="DELETE CHAT"
        message={`Delete conversation with ${deleteConfirm.username}? Messages will only be deleted for you.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          await hideChannel(activeChannelId);
          setDeleteConfirm({ isOpen: false, username: '' });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, username: '' })}
      />
    </>
  );
}
