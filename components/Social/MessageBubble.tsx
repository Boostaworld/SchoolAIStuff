import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Image as ImageIcon, Smile } from 'lucide-react';
import { Message } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';
import ReactionPicker from './ReactionPicker';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser, reactions, addReaction, removeReaction } = useOrbitStore();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const isSelf = message.sender_id === currentUser?.id;
  const messageReactions = reactions[message.id] || [];

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar (only for received messages) */}
      {!isSelf && (
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-cyan-400 text-xs font-mono">OP</span>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isSelf ? 'items-end' : 'items-start'}`}>
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

          {/* Message text */}
          <p className="relative z-10 break-words whitespace-pre-wrap">
            {message.content}
          </p>

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

        {/* Timestamp & Reaction Trigger */}
        <div className={`flex items-center gap-2 px-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-cyan-500/50 text-xs font-mono">
            {formatTimestamp(message.created_at)}
          </span>

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
          <ReactionPicker
            onSelect={handleAddReaction}
            onClose={() => setShowReactionPicker(false)}
          />
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
