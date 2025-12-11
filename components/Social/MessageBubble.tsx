import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Image as ImageIcon, Smile, Maximize2, Edit2, Trash2, Check, X, Reply } from 'lucide-react';
import { Message } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';
import ReactionPicker from './ReactionPicker';
import { getUserBadgeStyle } from '../../lib/utils/badges';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageModal } from './MessageModal';
import { ConfirmModal } from '../Shared/ConfirmModal';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser, reactions, addReaction, removeReaction, deleteMessage, editMessage, setReplyingTo, messages, activeChannelId } = useOrbitStore();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isSelf = message.sender_id === currentUser?.id;
  const messageReactions = reactions[message.id] || [];

  // Get badge styling for sender
  const badgeStyle = getUserBadgeStyle({
    is_admin: message.senderIsAdmin,
    can_customize_ai: message.senderCanCustomizeAI
  });

  // Check if message is long (10+ lines)
  const lineCount = message.content.split('\n').length;
  const isLongMessage = lineCount >= 10;

  const handleAddReaction = (emoji: string) => {
    addReaction(message.id, emoji);
    setShowReactionPicker(false);
  };

  const handleRemoveReaction = (reactionId: string) => {
    removeReaction(reactionId);
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <FileText className="w-5 h-5" />;
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Check if message can be edited or deleted
  const minutesSinceSent = (Date.now() - new Date(message.created_at).getTime()) / (1000 * 60);
  const daysSinceSent = minutesSinceSent / (60 * 24);
  const canEdit = isSelf && minutesSinceSent <= 5;
  const canDelete = isSelf && daysSinceSent <= 7;

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    await deleteMessage(message.id, message.channel_id);
    setShowDeleteConfirm(false);
  };

  const handleEditSave = async () => {
    if (editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    await editMessage(message.id, message.channel_id, editContent);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Check if message is deleted
  if (message.deleted_at) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'} group opacity-60`}
      >
        {/* Avatar (only for received messages) */}
        {!isSelf && (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-cyan-500/10 flex items-center justify-center flex-shrink-0 grayscale">
            {message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={message.senderUsername || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-cyan-400 text-xs font-mono">OP</span>
            )}
          </div>
        )}

        <div className={`flex flex-col gap-1 max-w-[75%] ${isSelf ? 'items-end' : 'items-start'}`}>
          {!isSelf && message.senderUsername && (
            <div className="flex items-center gap-1.5 px-2 opacity-50">
              <span className="text-xs font-mono text-slate-400">
                {message.senderUsername}
              </span>
            </div>
          )}

          <div className={`
            px-4 py-3 rounded-2xl font-mono text-sm italic
            ${isSelf
              ? 'bg-slate-800/50 border border-slate-700 text-slate-400 rounded-tr-sm'
              : 'bg-slate-900/50 border border-slate-800 text-slate-500 rounded-tl-sm'
            }
          `}>
            [message deleted at {formatTimestamp(message.deleted_at)}]
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'} group`}
    >
      {/* Avatar (only for received messages) */}
      {!isSelf && (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderUsername || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-cyan-400 text-xs font-mono">OP</span>
          )}
        </div>
      )}

      <div className={`relative flex flex-col gap-1 max-w-[75%] ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Sender Name with Badge (only for received messages) */}
        {!isSelf && message.senderUsername && (
          <div className={`flex items-center gap-1.5 px-2 ${badgeStyle.glowClasses}`}>
            {badgeStyle.badgeIcon}
            <span className={`text-xs font-mono ${badgeStyle.nameClasses}`}>
              {message.senderUsername}
            </span>
          </div>
        )}

        {/* Reply Context (Discord style) */}
        {message.reply_to_id && (() => {
          const replyMessage = activeChannelId ? messages[activeChannelId]?.find(m => m.id === message.reply_to_id) : null;
          return replyMessage ? (
            <div className="flex items-center gap-1.5 px-2 mb-1">
              {/* Hook line */}
              <div className="w-4 h-4 border-l-2 border-t-2 border-cyan-500/40 rounded-tl ml-1" />
              <div className="flex items-center gap-1 text-cyan-400/60 text-xs font-mono truncate max-w-[80%]">
                <Reply className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold">{replyMessage.senderUsername || 'User'}</span>
                <span className="truncate opacity-70">{replyMessage.content.substring(0, 50)}{replyMessage.content.length > 50 ? '...' : ''}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 mb-1 text-cyan-400/40 text-xs font-mono italic">
              <Reply className="w-3 h-3" />
              <span>Original message unavailable</span>
            </div>
          );
        })()}

        {/* Message Content */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`
            relative px-4 py-3 rounded-2xl font-mono text-sm
            ${isSelf
              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 rounded-tr-sm'
              : 'bg-slate-800/80 border border-cyan-500/20 text-cyan-200 rounded-tl-sm'
            }
            backdrop-blur-sm shadow-lg
          `}
        >
          {/* Holographic overlay effect */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
            style={{
              background: `
                linear-gradient(135deg,
                  rgba(6, 182, 212, 0.1) 0%,
                  transparent 50%,
                  rgba(6, 182, 212, 0.1) 100%
                )
              `
            }}
          />

          {/* Message text - edit mode or markdown display */}
          <div className="relative z-10">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded p-2 text-cyan-100 font-mono text-sm focus:outline-none focus:border-cyan-500/50 min-h-[60px] resize-y"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditSave}
                    className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-xs text-cyan-300 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>

          {/* Expand button for long messages */}
          {isLongMessage && (
            <button
              onClick={() => setShowModal(true)}
              className="relative z-10 mt-2 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors group"
            >
              <Maximize2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Expand full message</span>
            </button>
          )}

          {/* Attachment */}
          {message.attachment_url && (
            <>
              {message.attachment_type?.startsWith('image/') ? (
                // Image embed - Discord style
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 rounded-lg overflow-hidden border border-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer max-w-md"
                  onClick={() => window.open(message.attachment_url, '_blank')}
                >
                  <img
                    src={message.attachment_url}
                    alt="Attachment"
                    className="w-full h-auto object-cover max-h-96 hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                </motion.div>
              ) : (
                // File download box for non-images
                <motion.a
                  href={message.attachment_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 p-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg flex items-center gap-3 group hover:bg-slate-900/70 transition-colors cursor-pointer"
                >
                  {getFileIcon(message.attachment_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-cyan-300 text-xs font-semibold truncate">
                      {message.attachment_url.split('/').pop()}
                    </p>
                    <p className="text-cyan-500/60 text-xs">
                      {message.attachment_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </motion.a>
              )}
            </>
          )}
        </motion.div>

        {/* Timestamp, Actions & Reaction Trigger */}
        <div className={`flex items-center gap-2 px-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-cyan-500/50 text-xs font-mono">
            {formatTimestamp(message.created_at)}
            {message.edited_at && <span className="ml-1 opacity-70">(edited)</span>}
          </span>

          {/* Edit/Delete buttons (only for own messages) */}
          {isSelf && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                  title="Edit message (5 min window)"
                >
                  <Edit2 className="w-3 h-3 text-cyan-400" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  title="Delete message (7 day window)"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setReplyingTo(message)}
            className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded"
            title="Reply"
          >
            <Reply className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded"
          >
            <Smile className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Reactions */}
        {messageReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {messageReactions.map(reaction => {
              const isMyReaction = reaction.user_id === currentUser?.id;

              return (
                <motion.button
                  key={reaction.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => isMyReaction && handleRemoveReaction(reaction.id)}
                  className={`
                    px-2 py-1 rounded-full text-sm
                    ${isMyReaction
                      ? 'bg-cyan-500/30 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-800/50 border border-cyan-500/20'
                    }
                    hover:bg-cyan-500/20 transition-all
                  `}
                >
                  {reaction.emoji}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div className={`absolute z-50 bottom-full mb-2 ${isSelf ? 'right-0' : 'left-0'}`}>
            <ReactionPicker
              onSelect={handleAddReaction}
              onClose={() => setShowReactionPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Message Modal for Long Messages */}
      <MessageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        content={message.content}
        timestamp={message.created_at}
        senderUsername={message.senderUsername}
        senderAvatar={message.senderAvatar}
        isSelf={isSelf}
      />

      {/* Delete Message Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="DELETE MESSAGE"
        message="Delete this message? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteMessage}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
};

export default MessageBubble;
