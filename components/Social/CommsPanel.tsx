import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, AlertTriangle, Signal, Users, Trash2, Eye, EyeOff } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { DMChannel } from '../../types';
import MessageBubble from './MessageBubble';
import { formatLastSeen } from '../../lib/utils/time';
import { groupMessagesByDate } from '../../lib/utils/messageGrouping';
import { supabase } from '../../lib/supabase';
import { ConfirmModal } from '../Shared/ConfirmModal';

export default function CommsPanel() {
  const {
    commsPanelOpen,
    toggleCommsPanel,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; username: string }>({ isOpen: false, username: '' });

  // Force presence sync when panel opens
  useEffect(() => {
    if (commsPanelOpen) {
      // Get latest presence state from Supabase
      const presenceChannel = supabase.channel('online_presence');
      presenceChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const state = presenceChannel.presenceState();
          const userIds = Object.values(state).flat().map((p: any) => p.user_id);
          console.log('🔄 Synced online users in CommsPanel:', userIds.length);
        }
      });
    }
  }, [commsPanelOpen]);

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

  const getOtherUser = (channel: DMChannel) => {
    return channel.otherUser;
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.includes(userId);
  };

  const getTypingIndicatorText = (userIds: string[]) => {
    if (userIds.length === 0) return '';
    if (userIds.length === 1) return 'Operative is transmitting...';
    return `${userIds.length} operatives are transmitting...`;
  };

  if (!commsPanelOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-screen w-[400px] bg-slate-950/98 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl shadow-cyan-900/20 flex flex-col z-50"
          style={{
            backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Header */}
          <div className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl">
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="h-full w-full" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.5) 2px, rgba(6, 182, 212, 0.5) 4px)'
              }} />
            </div>

            <div className="relative px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Signal className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <h2 className="text-cyan-400 font-mono text-lg tracking-wider font-bold">
                    SECURE UPLINK
                  </h2>
                  <p className="text-cyan-500/60 text-xs font-mono tracking-wide">
                    {dmChannels.length} ACTIVE CHANNEL{dmChannels.length !== 1 ? 'S' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleCommsPanel}
                className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors group"
              >
                <X className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              </button>
            </div>
          </div>

          {/* Channel List (if no active channel) */}
          {!activeChannelId && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {dmChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Users className="w-16 h-16 text-cyan-500/30 mb-4" />
                  <p className="text-cyan-400/60 font-mono text-sm">
                    NO ACTIVE CHANNELS
                  </p>
                  <p className="text-cyan-500/40 font-mono text-xs mt-2">
                    Initialize uplink from operative profile
                  </p>
                </div>
              ) : (
                dmChannels.map(channel => {
                  const otherUser = getOtherUser(channel);
                  const online = otherUser ? isUserOnline(otherUser.id) : false;
                  const unreadCount = channel.unreadCount || 0;
                  const hasUnread = unreadCount > 0;

                  return (
                    <motion.button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel.id)}
                      className="w-full p-4 bg-slate-900/50 hover:bg-slate-800/50 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg transition-all text-left group relative overflow-hidden"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Unread pulse effect background */}
                      {hasUnread && (
                        <motion.div
                          animate={{
                            opacity: [0.1, 0.2, 0.1],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 pointer-events-none"
                        />
                      )}

                      <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                          <img
                            src={otherUser?.avatar}
                            alt={otherUser?.username}
                            className="w-12 h-12 rounded-full border-2 border-cyan-500/30 group-hover:border-cyan-400/50 transition-colors"
                          />
                          {online && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-slate-950 shadow-lg shadow-cyan-400/50"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-cyan-300 font-mono font-semibold truncate">
                            {otherUser?.username || 'Unknown'}
                          </p>
                          <p className="text-cyan-500/60 text-xs font-mono truncate">
                            {online ? 'ONLINE' : 'OFFLINE'}
                          </p>
                        </div>

                        {/* Unread badge */}
                        {hasUnread && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                            }}
                            className="relative"
                          >
                            {/* Glowing background */}
                            <motion.div
                              animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.5, 0.8, 0.5]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-md"
                            />

                            {/* Badge container */}
                            <div className="relative flex items-center justify-center min-w-[28px] h-7 px-2 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-full border-2 border-orange-300/50 shadow-lg shadow-orange-500/50">
                              {/* Inner glow */}
                              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full" />

                              {/* Count text */}
                              <span className="relative text-white font-mono text-xs font-bold tracking-wider drop-shadow-lg">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>

                              {/* Scanline effect */}
                              <motion.div
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear"
                                }}
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent rounded-full"
                                style={{ height: '50%' }}
                              />
                            </div>

                            {/* Alert pulse rings */}
                            <motion.div
                              animate={{
                                scale: [1, 2, 2],
                                opacity: [0.6, 0, 0]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeOut"
                              }}
                              className="absolute inset-0 border-2 border-orange-400 rounded-full"
                            />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          )}

          {/* Active Channel View */}
          {activeChannelId && activeChannel && (
            <>
              {/* Channel Header */}
              <div className="border-b border-cyan-500/20 bg-slate-900/30 px-6 py-3">
                <button
                  onClick={() => setActiveChannel(null)}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm mb-2 flex items-center gap-2 transition-colors"
                >
                  ← BACK TO CHANNELS
                </button>

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
                      <div className="flex-1">
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
                        className={`p-2 border rounded-lg transition-colors group ${activeChannel.read_receipts_enabled
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

              {/* Ghost Town Warning */}
              {(() => {
                const otherUser = getOtherUser(activeChannel);
                const online = otherUser ? isUserOnline(otherUser.id) : false;

                return !online ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 bg-amber-900/20 border-b border-amber-500/30 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-amber-400 text-xs font-mono">
                        TARGET OFFLINE // SIGNAL CACHED // TRANSMISSION DELAYED
                      </p>
                    </div>
                  </motion.div>
                ) : null;
              })()}

              {/* Typing Indicator */}
              {currentTypingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 bg-cyan-900/10 border-b border-cyan-500/10"
                >
                  <p className="text-cyan-400 text-xs font-mono italic flex items-center gap-2">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                    </span>
                    {getTypingIndicatorText(currentTypingUsers)}
                  </p>
                </motion.div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeMessages.length === 0 ? (
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
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl p-4">
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
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={() => activeChannelId && setTyping(activeChannelId, false)}
                      placeholder="TRANSMIT SIGNAL..."
                      className="flex-1 bg-slate-900 border border-cyan-500/30 focus:border-cyan-400/50 rounded-lg px-4 py-3 text-cyan-100 placeholder-cyan-500/40 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
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
                      className="p-3 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg transition-all group"
                    >
                      <Paperclip className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                    </button>

                    <button
                      type="submit"
                      disabled={!inputValue.trim() && !selectedFile}
                      className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:opacity-50 rounded-lg transition-all group disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
                    >
                      <Send className="w-5 h-5 text-slate-950 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete Chat Confirmation Modal */}
      <ConfirmModal
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
