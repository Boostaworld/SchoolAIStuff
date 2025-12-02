import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Flame,
  Target,
  ChevronDown,
  Sparkles,
  AlignLeft,
  Code,
  FlaskConical,
  Briefcase,
  Palette,
  TrendingUp,
  BookOpen,
  Newspaper,
  HeartPulse,
  Cpu,
  Landmark
} from 'lucide-react';
import { TypingChallenge } from '../../types';

interface EnhancedChallengeSelectorProps {
  challenges: TypingChallenge[];
  onSelect: (id: string) => void;
  onGenerateCustom?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Programming': Code,
  'Technical': Target,
  'Science': FlaskConical,
  'ELA': BookOpen,
  'Literature': BookOpen,
  'Reading': BookOpen,
  'Article': Newspaper,
  'Article Excerpt': Newspaper,
  'History': Landmark,
  'Health': HeartPulse,
  'Economics': Briefcase,
  'Technology': Cpu,
  'Business': Briefcase,
  'Creative': Palette,
  'Speed Training': Zap,
  'Personalized': TrendingUp,
  'Standard': AlignLeft
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  'Programming': {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'
  },
  'Technical': {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]'
  },
  'Science': {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]'
  },
  'ELA': {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]'
  },
  'Literature': {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]'
  },
  'Reading': {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]'
  },
  'Article': {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
  },
  'Article Excerpt': {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
  },
  'History': {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-300',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]'
  },
  'Health': {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'
  },
  'Economics': {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]'
  },
  'Technology': {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]'
  },
  'Business': {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]'
  },
  'Creative': {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]'
  },
  'Speed Training': {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
  },
  'Personalized': {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]'
  },
  'Standard': {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    glow: 'shadow-[0_0_20px_rgba(100,116,139,0.3)]'
  }
};

const LENGTH_LABELS: Record<string, { icon: any; label: string; color: string }> = {
  'Sprint': { icon: Zap, label: 'SPRINT', color: 'text-yellow-400' },
  'Medium': { icon: Target, label: 'STANDARD', color: 'text-cyan-400' },
  'Marathon': { icon: Flame, label: 'MARATHON', color: 'text-orange-400' }
};

export default function EnhancedChallengeSelector({ challenges, onSelect, onGenerateCustom }: EnhancedChallengeSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedLength, setSelectedLength] = useState<string>('All');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Get unique categories from challenges
  const categories = useMemo(() => {
    const cats = new Set(challenges.map(c => c.category || 'Standard'));
    return ['All', ...Array.from(cats)];
  }, [challenges]);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    return challenges.filter(c => {
      if (selectedCategory !== 'All' && (c.category || 'Standard') !== selectedCategory) return false;
      if (selectedDifficulty !== 'All' && c.difficulty !== selectedDifficulty) return false;
      if (selectedLength !== 'All' && (c.length_type || 'Medium') !== selectedLength) return false;
      return true;
    });
  }, [challenges, selectedCategory, selectedDifficulty, selectedLength]);

  return (
    <div className="space-y-6">
      {/* Header with AI Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 mb-1" style={{ fontFamily: 'Orbitron, monospace' }}>
            VELOCITY TRAINING
          </h2>
          <p className="text-cyan-500/60 text-sm font-mono">
            {filteredChallenges.length} CHALLENGE{filteredChallenges.length !== 1 ? 'S' : ''} AVAILABLE
          </p>
        </div>

        {onGenerateCustom && (
          <motion.button
            onClick={onGenerateCustom}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 rounded-xl font-bold text-white shadow-lg shadow-violet-500/50 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span style={{ fontFamily: 'Rajdhani, sans-serif' }}>AI GENERATE</span>
          </motion.button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-3">
        {/* Category Dropdown */}
        <div className="relative">
          <motion.button
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="px-4 py-2 bg-slate-900/50 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg font-mono text-sm text-cyan-300 flex items-center gap-2 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-cyan-500/60">CATEGORY:</span>
            <span className="font-bold">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {categoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full mt-2 left-0 z-50 min-w-[200px] bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 overflow-hidden"
              >
                {categories.map((cat, idx) => {
                  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Standard'];
                  const Icon = CATEGORY_ICONS[cat] || AlignLeft;

                  return (
                    <motion.button
                      key={cat}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left ${
                        selectedCategory === cat ? 'bg-slate-800/80' : ''
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                      <span className="font-mono text-sm text-slate-200">{cat}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Difficulty Pills */}
        {['All', 'Easy', 'Medium', 'Hard'].map(diff => (
          <motion.button
            key={diff}
            onClick={() => setSelectedDifficulty(diff)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
              selectedDifficulty === diff
                ? diff === 'Easy'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50'
                  : diff === 'Medium'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/50'
                  : diff === 'Hard'
                  ? 'bg-red-500 text-slate-950 shadow-lg shadow-red-500/50'
                  : 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50'
                : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {diff === 'All' ? 'ALL LEVELS' : diff.toUpperCase()}
          </motion.button>
        ))}

        {/* Length Pills */}
        {['All', 'Sprint', 'Medium', 'Marathon'].map(length => {
          const lengthData = LENGTH_LABELS[length];

          return (
            <motion.button
              key={length}
              onClick={() => setSelectedLength(length)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all flex items-center gap-2 ${
                selectedLength === length
                  ? 'bg-violet-500 text-slate-950 shadow-lg shadow-violet-500/50'
                  : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {lengthData && <lengthData.icon className="w-4 h-4" />}
              {length === 'All' ? 'ALL LENGTHS' : lengthData?.label || length.toUpperCase()}
            </motion.button>
          );
        })}
      </div>

      {/* Challenge Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        layout
      >
        <AnimatePresence mode="popLayout">
          {filteredChallenges.map((challenge, idx) => {
            const category = challenge.category || 'Standard';
            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Standard'];
            const Icon = CATEGORY_ICONS[category] || AlignLeft;
            const lengthData = LENGTH_LABELS[challenge.length_type || 'Medium'];

            return (
              <motion.div
                key={challenge.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => onSelect(challenge.id)}
                className={`relative p-5 rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-xl cursor-pointer group overflow-hidden transition-all hover:${colors.glow}`}
              >
                {/* Animated gradient overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${colors.bg.replace('/10', '/5')}, transparent)`
                  }}
                />

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 ${colors.bg} blur-2xl opacity-50`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Difficulty badge */}
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                        challenge.difficulty === 'Easy'
                          ? 'bg-emerald-500 text-slate-950'
                          : challenge.difficulty === 'Medium'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-red-500 text-white'
                      }`}>
                        {challenge.difficulty}
                      </div>

                      {/* Length badge */}
                      {lengthData && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/50 rounded text-xs font-mono">
                          <lengthData.icon className={`w-3 h-3 ${lengthData.color}`} />
                          <span className="text-slate-400">{challenge.word_count || '~'}w</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black text-slate-100 mb-2 leading-tight" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {challenge.title}
                  </h3>

                  {/* Preview */}
                  <p className="text-sm text-slate-400 font-mono line-clamp-2 mb-3 leading-relaxed">
                    {challenge.text_content.slice(0, 80)}...
                  </p>

                  {/* Category tag */}
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded ${colors.bg} ${colors.border} border`}>
                      <span className={`text-xs font-mono font-bold ${colors.text}`}>
                        {category.toUpperCase()}
                      </span>
                    </div>

                    {challenge.is_ai_generated && (
                      <div className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                      </div>
                    )}
                  </div>

                  {/* Hover indicator */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {filteredChallenges.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-mono text-lg mb-2">NO CHALLENGES FOUND</p>
          <p className="text-slate-600 text-sm">Try adjusting your filters</p>
        </motion.div>
      )}

      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Rajdhani:wght@700&display=swap');
      `}</style>
    </div>
  );
}
