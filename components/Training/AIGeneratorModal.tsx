import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader, Zap, Target, Flame } from 'lucide-react';
import { generateTypingChallenge } from '../../lib/ai/challengeGenerator';
import { useOrbitStore } from '../../store/useOrbitStore';

interface AIGeneratorModalProps {
  onClose: () => void;
  onGenerated: (challengeId: string) => void;
}

const CATEGORIES = [
  'Programming',
  'Technical',
  'Science',
  'Business',
  'Creative',
  'Speed Training',
  'Custom'
];

export default function AIGeneratorModal({ onClose, onGenerated }: AIGeneratorModalProps) {
  const { currentUser } = useOrbitStore();
  const [category, setCategory] = useState('Programming');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [lengthType, setLengthType] = useState<'Sprint' | 'Medium' | 'Marathon'>('Medium');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!currentUser) return;

    setIsGenerating(true);
    setError('');

    try {
      // Generate with AI
      const generated = await generateTypingChallenge({
        category,
        difficulty,
        length_type: lengthType,
        custom_prompt: customPrompt || undefined
      });

      // Save to database
      const { supabase } = await import('../../lib/supabase');
      const { data, error: insertError } = await supabase
        .from('typing_challenges')
        .insert({
          title: generated.title,
          text_content: generated.text_content,
          difficulty,
          category,
          length_type: lengthType,
          is_ai_generated: true,
          is_custom: true,
          user_id: currentUser.id,
          word_count: generated.text_content.split(/\s+/).length,
          char_count: generated.text_content.length
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Success!
      onGenerated(data.id);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate challenge');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-8"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-500/20 max-w-2xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.1),transparent)]" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/20 border border-violet-500/30 rounded-xl">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ fontFamily: 'Orbitron, monospace' }}>
                  AI CHALLENGE GENERATOR
                </h2>
                <p className="text-violet-500/60 text-sm font-mono">POWERED BY GEMINI 2.0 FLASH</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-mono text-slate-400 mb-2 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                    category === cat
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-mono text-slate-400 mb-2 uppercase tracking-wider">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Easy', 'Medium', 'Hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-4 py-3 rounded-lg font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                    difficulty === diff
                      ? diff === 'Easy'
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50'
                        : diff === 'Medium'
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/50'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {diff === 'Easy' && <Target className="w-4 h-4" />}
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-mono text-slate-400 mb-2 uppercase tracking-wider">
              Length
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Sprint', 'Medium', 'Marathon'] as const).map(length => (
                <button
                  key={length}
                  onClick={() => setLengthType(length)}
                  className={`px-4 py-3 rounded-lg font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                    lengthType === length
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {length === 'Sprint' && <Zap className="w-4 h-4" />}
                  {length === 'Marathon' && <Flame className="w-4 h-4" />}
                  {length}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-mono text-slate-400 mb-2 uppercase tracking-wider">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., 'Focus on React hooks', 'Include cybersecurity terms', 'Make it about space exploration'..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-violet-500/50 resize-none h-24"
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono"
            >
              {error}
            </motion.div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-6 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-violet-500/50 disabled:shadow-none flex items-center justify-center gap-3 transition-all text-lg"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span style={{ fontFamily: 'Rajdhani, sans-serif' }}>GENERATING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span style={{ fontFamily: 'Rajdhani, sans-serif' }}>GENERATE CHALLENGE</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Rajdhani:wght@700&display=swap');
      `}</style>
    </motion.div>
  );
}
