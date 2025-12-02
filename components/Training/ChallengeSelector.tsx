import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingChallenge } from '../../types';

interface ChallengeSelectorProps {
  challenges: TypingChallenge[];
  onSelect: (challengeId: string) => void;
}

// Difficulty badge configuration with icons and colors
const DIFFICULTY_CONFIG = {
  Easy: {
    icon: '⚡',
    color: 'emerald',
    glow: 'rgba(16, 185, 129, 0.4)',
    border: 'rgb(16, 185, 129)',
  },
  Medium: {
    icon: '🔥',
    color: 'amber',
    glow: 'rgba(245, 158, 11, 0.4)',
    border: 'rgb(245, 158, 11)',
  },
  Hard: {
    icon: '💀',
    color: 'rose',
    glow: 'rgba(244, 63, 94, 0.4)',
    border: 'rgb(244, 63, 94)',
  },
};

const ChallengeSelector: React.FC<ChallengeSelectorProps> = ({
  challenges,
  onSelect,
}) => {
  return (
    <div className="challenge-selector-container">
      <AnimatePresence mode="wait">
        {challenges.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="empty-state"
          >
            <div className="terminal-box">
              <div className="scan-line" />
              <div className="glitch-text">NO CHALLENGES AVAILABLE</div>
              <div className="sub-text">// CONTACT ADMIN</div>
              <div className="terminal-cursor">_</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="challenges-grid"
            className="challenges-grid"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.08,
                },
              },
            }}
          >
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onSelect={onSelect}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .challenge-selector-container {
          width: 100%;
          min-height: 400px;
          position: relative;
        }

        /* Grid Layout */
        .challenges-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          width: 100%;
        }

        @media (max-width: 768px) {
          .challenges-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        /* Empty State */
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          width: 100%;
        }

        .terminal-box {
          position: relative;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%);
          border: 2px solid rgba(6, 182, 212, 0.3);
          border-radius: 8px;
          padding: 3rem 4rem;
          text-align: center;
          overflow: hidden;
          backdrop-filter: blur(12px);
          box-shadow:
            0 0 30px rgba(6, 182, 212, 0.15),
            inset 0 0 60px rgba(6, 182, 212, 0.03);
        }

        .terminal-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent);
          animation: scan-horizontal 3s infinite;
        }

        @keyframes scan-horizontal {
          0%, 100% { left: -100%; }
          50% { left: 100%; }
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(6, 182, 212, 0.03) 50%,
            transparent 100%
          );
          animation: scan-vertical 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes scan-vertical {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }

        .glitch-text {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 1.5rem;
          font-weight: 700;
          color: rgb(6, 182, 212);
          letter-spacing: 0.1em;
          text-shadow:
            0 0 10px rgba(6, 182, 212, 0.5),
            2px 2px 0 rgba(139, 92, 246, 0.3);
          margin-bottom: 0.75rem;
          position: relative;
          animation: subtle-glitch 5s infinite;
        }

        @keyframes subtle-glitch {
          0%, 90%, 100% { transform: translate(0, 0); }
          91% { transform: translate(-2px, 0); }
          92% { transform: translate(2px, 0); }
          93% { transform: translate(-2px, 0); }
          94% { transform: translate(2px, 0); }
          95% { transform: translate(0, 0); }
        }

        .sub-text {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.875rem;
          color: rgba(6, 182, 212, 0.5);
          letter-spacing: 0.05em;
        }

        .terminal-cursor {
          display: inline-block;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 1.5rem;
          color: rgb(6, 182, 212);
          margin-left: 0.5rem;
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

interface ChallengeCardProps {
  challenge: TypingChallenge;
  onSelect: (challengeId: string) => void;
  index: number;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onSelect,
  index,
}) => {
  const config = DIFFICULTY_CONFIG[challenge.difficulty];
  const preview =
    challenge.text_content.length > 100
      ? challenge.text_content.slice(0, 100) + '...'
      : challenge.text_content;

  return (
    <>
      <motion.div
        className="challenge-card"
        variants={{
          hidden: { opacity: 0, y: 30, scale: 0.95 },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              duration: 0.5,
              ease: [0.23, 1, 0.32, 1], // Custom easing for smooth entrance
            },
          },
        }}
        whileHover={{
          scale: 1.03,
          y: -4,
          transition: { duration: 0.25, ease: 'easeOut' },
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(challenge.id)}
      >
        {/* Animated border glow on hover */}
        <motion.div
          className="card-glow"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Scan line effect */}
        <div className="card-scan-line" />

        {/* Corner decorations */}
        <div className="corner-decoration corner-tl" />
        <div className="corner-decoration corner-tr" />
        <div className="corner-decoration corner-bl" />
        <div className="corner-decoration corner-br" />

        {/* Content */}
        <div className="card-content">
          {/* Title with cyber accent */}
          <div className="card-header">
            <h3 className="card-title">{challenge.title}</h3>
            <div className="title-underline" />
          </div>

          {/* Difficulty Badge */}
          <motion.div
            className={`difficulty-badge difficulty-${config.color}`}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="badge-icon">{config.icon}</span>
            <span className="badge-text">{challenge.difficulty}</span>
            <div className="badge-glow" style={{ backgroundColor: config.glow }} />
          </motion.div>

          {/* Text Preview */}
          <p className="card-preview">{preview}</p>

          {/* Interactive hint */}
          <motion.div
            className="select-hint"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="hint-arrow">&gt;&gt;</span> SELECT
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        .challenge-card {
          position: relative;
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.7) 0%,
            rgba(30, 41, 59, 0.5) 100%
          );
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 8px;
          padding: 1.75rem;
          cursor: pointer;
          overflow: hidden;
          backdrop-filter: blur(16px);
          transition: border-color 0.3s ease;
        }

        .challenge-card:hover {
          border-color: rgba(6, 182, 212, 0.6);
        }

        /* Animated glow border on hover */
        .card-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(
            135deg,
            rgba(6, 182, 212, 0.2),
            rgba(139, 92, 246, 0.2)
          );
          border-radius: 8px;
          z-index: -1;
          filter: blur(8px);
        }

        /* Scan line animation */
        .card-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(6, 182, 212, 0.02) 50%,
            transparent 100%
          );
          animation: card-scan 3s ease-in-out infinite;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .challenge-card:hover .card-scan-line {
          opacity: 1;
        }

        @keyframes card-scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }

        /* Corner decorations */
        .corner-decoration {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 1px solid rgba(6, 182, 212, 0.4);
        }

        .corner-tl {
          top: 8px;
          left: 8px;
          border-right: none;
          border-bottom: none;
        }

        .corner-tr {
          top: 8px;
          right: 8px;
          border-left: none;
          border-bottom: none;
        }

        .corner-bl {
          bottom: 8px;
          left: 8px;
          border-right: none;
          border-top: none;
        }

        .corner-br {
          bottom: 8px;
          right: 8px;
          border-left: none;
          border-top: none;
        }

        .card-content {
          position: relative;
          z-index: 1;
        }

        /* Card Header */
        .card-header {
          margin-bottom: 1rem;
        }

        .card-title {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 1.125rem;
          font-weight: 700;
          color: rgb(103, 232, 249);
          letter-spacing: 0.02em;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 0 20px rgba(103, 232, 249, 0.3);
          line-height: 1.3;
        }

        .title-underline {
          width: 40px;
          height: 2px;
          background: linear-gradient(
            90deg,
            rgba(6, 182, 212, 0.8),
            transparent
          );
          margin-bottom: 0.25rem;
        }

        /* Difficulty Badge */
        .difficulty-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 100px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 1rem;
          position: relative;
          overflow: hidden;
          border: 1px solid;
        }

        .difficulty-emerald {
          background: rgba(16, 185, 129, 0.15);
          color: rgb(52, 211, 153);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .difficulty-amber {
          background: rgba(245, 158, 11, 0.15);
          color: rgb(251, 191, 36);
          border-color: rgba(245, 158, 11, 0.4);
        }

        .difficulty-rose {
          background: rgba(244, 63, 94, 0.15);
          color: rgb(251, 113, 133);
          border-color: rgba(244, 63, 94, 0.4);
        }

        .badge-icon {
          font-size: 1rem;
          line-height: 1;
        }

        .badge-text {
          position: relative;
          z-index: 1;
        }

        .badge-glow {
          position: absolute;
          inset: 0;
          border-radius: 100px;
          opacity: 0;
          transition: opacity 0.3s;
          filter: blur(8px);
        }

        .difficulty-badge:hover .badge-glow {
          opacity: 0.6;
        }

        /* Text Preview */
        .card-preview {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.8125rem;
          line-height: 1.6;
          color: rgba(6, 182, 212, 0.6);
          margin: 0 0 1rem 0;
          min-height: 3.2em;
          word-wrap: break-word;
        }

        /* Select Hint */
        .select-hint {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.75rem;
          color: rgba(139, 92, 246, 0.8);
          letter-spacing: 0.1em;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .hint-arrow {
          display: inline-block;
          animation: arrow-pulse 1.5s ease-in-out infinite;
        }

        @keyframes arrow-pulse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }

        /* Reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .card-scan-line,
          .hint-arrow,
          .terminal-cursor,
          .scan-line,
          .glitch-text,
          .terminal-box::before {
            animation: none;
          }

          .challenge-card {
            transition: none;
          }
        }
      `}</style>
    </>
  );
};

export default ChallengeSelector;
