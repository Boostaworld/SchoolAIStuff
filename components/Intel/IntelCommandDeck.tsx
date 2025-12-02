import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '@/store/useOrbitStore';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Brain, Sparkles, Lock, Zap, RotateCcw, Send, Settings, ChevronDown, ExternalLink, Lightbulb } from 'lucide-react';
import { IntelChatMessage } from '@/lib/ai/IntelService';

type Mode = 'full' | 'settings';

interface IntelCommandDeckProps {
  mode?: Mode;
  initialConfig?: {
    model?: 'flash' | 'pro' | 'orbit-x';
    depth?: number;
    researchMode?: boolean;
    customInstructions?: string;
  };
  onSaveConfig?: (config: {
    model: 'flash' | 'pro' | 'orbit-x';
    depth: number;
    researchMode: boolean;
    customInstructions: string;
  }) => void;
}

export function IntelCommandDeck({
  mode = 'full',
  initialConfig,
  onSaveConfig
}: IntelCommandDeckProps) {
  const {
    currentUser,
    intelMessages,
    isIntelLoading,
    sendIntelQuery,
    loadIntelHistory,
    clearIntelHistory,
    setIntelInstructions
  } = useOrbitStore();
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro' | 'orbit-x'>(initialConfig?.model || 'flash');
  const [depth, setDepth] = useState(initialConfig?.depth ?? 3);
  const [researchMode, setResearchMode] = useState(initialConfig?.researchMode ?? false);
  const [thinkingEnabled, setThinkingEnabled] = useState(true); // Thinking enabled by default
  const [customInstructions, setCustomInstructions] = useState(initialConfig?.customInstructions || '');
  const [showInstructions, setShowInstructions] = useState(false);
  const [query, setQuery] = useState('');
  const [savedInstructions, setSavedInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [hasTouchedInstructions, setHasTouchedInstructions] = useState(false);

  const canCustomize = currentUser?.can_customize_ai || false;
  const unlockedModels = currentUser?.unlocked_models || ['flash'];

  const models = [
    {
      id: 'flash' as const,
      name: 'Flash 2.0',
      description: 'Lightning fast responses',
      icon: '⚡',
      color: 'from-cyan-500 to-blue-500',
      locked: false
    },
    {
      id: 'pro' as const,
      name: 'Pro 1.5',
      description: 'Advanced reasoning',
      icon: '🧠',
      color: 'from-purple-500 to-pink-500',
      locked: !unlockedModels.includes('pro')
    },
    {
      id: 'orbit-x' as const,
      name: 'Orbit-X',
      description: 'Deep thinking mode',
      icon: '🌌',
      color: 'from-violet-500 to-indigo-500',
      locked: !unlockedModels.includes('orbit-x')
    }
  ];

  const presets = [
    { label: 'Debate', instructions: 'Challenge my arguments. Play devil\'s advocate. Find flaws in my reasoning.' },
    { label: 'Code Audit', instructions: 'Review code for bugs, security issues, and optimization opportunities. Be thorough and critical.' },
    { label: 'Exam Prep', instructions: 'Quiz me on the topic. Ask follow-up questions. Explain answers in detail.' }
  ];

  const getDepthLabel = () => {
    if (depth <= 3) return { label: 'SURFACE', desc: 'Bullet points, ELI5 tone', color: 'text-cyan-400' };
    if (depth <= 6) return { label: 'STANDARD', desc: 'Academic tone, citations', color: 'text-purple-400' };
    return { label: 'ABYSS', desc: 'PhD-level analysis', color: 'text-red-400' };
  };

  const depthInfo = getDepthLabel();

  useEffect(() => {
    if (currentUser) {
      loadIntelHistory();
    }
  }, [currentUser, loadIntelHistory]);

  useEffect(() => {
    const saved = currentUser?.intel_instructions || '';
    setSavedInstructions(saved);

    if (!canCustomize) {
      setCustomInstructions('');
      setHasTouchedInstructions(false);
      return;
    }

    if (!hasTouchedInstructions && saved) {
      setCustomInstructions(saved);
    }
  }, [currentUser, hasTouchedInstructions, canCustomize]);

  const handleSend = async () => {
    if (mode === 'settings') return;
    if (!query.trim() || isIntelLoading) return;

    setQuery('');

    try {
      const instructions = customInstructions.trim();

      await sendIntelQuery(query, {
        modelUsed: selectedModel,
        depthLevel: depth,
        researchMode,
        customInstructions: instructions || undefined,
        thinkingEnabled: thinkingEnabled // Pass thinking preference
      });
      toast.success('Intel query complete');
    } catch (error: any) {
      toast.error(error.message || 'Intel query failed');
      console.error('Intel error:', error);
    }
  };

  const clearSession = () => {
    clearIntelHistory();
    toast.info('Session cleared');
  };

  const handleSaveInstructions = async () => {
    if (!currentUser || !canCustomize) return;
    setIsSavingInstructions(true);
    try {
      const trimmed = customInstructions.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ intel_instructions: trimmed })
        .eq('id', currentUser.id);

      if (error) throw error;

      setSavedInstructions(trimmed);
      setIntelInstructions(trimmed);
      setHasTouchedInstructions(false);
      toast.success('Default Intel instructions saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save instructions');
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleSaveConfigOnly = () => {
    if (!onSaveConfig) return;
    onSaveConfig({
      model: selectedModel,
      depth,
      researchMode,
      customInstructions: customInstructions.trim()
    });
    toast.success('Intel settings saved');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 rounded-3xl border-2 border-blue-500/30 overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.2)] relative">
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent animate-[scan_6s_linear_infinite]" />
      </div>

      {/* Header */}
      <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-slate-900/80 to-blue-950/50 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400" style={{ fontFamily: 'Orbitron, monospace' }}>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity }
                }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)]"
              >
                <Brain className="text-white w-6 h-6" />
              </motion.div>
              INTEL COMMAND DECK
            </h2>
            <p className="text-sm text-blue-400/70 mt-2 font-mono">AI-POWERED RESEARCH • NEURAL INTERFACE • DEEP ANALYSIS</p>
          </div>

          <button
            onClick={clearSession}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-blue-500/30 rounded-lg text-blue-400 font-mono text-sm transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            NEW SESSION
          </button>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="p-6 bg-slate-900/40 border-b border-blue-500/20 space-y-6 relative z-10">
        {/* Model Selector */}
        <div>
          <label className="text-xs text-blue-400 font-mono uppercase mb-3 block flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Neural Model
          </label>
          <div className="grid grid-cols-3 gap-3">
            {models.map(model => (
              <motion.button
                key={model.id}
                onClick={() => !model.locked && setSelectedModel(model.id)}
                disabled={model.locked}
                whileHover={!model.locked ? { scale: 1.05 } : {}}
                whileTap={!model.locked ? { scale: 0.95 } : {}}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedModel === model.id
                    ? `bg-gradient-to-br ${model.color} border-transparent text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]`
                    : model.locked
                    ? 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-blue-500/30 text-slate-300 hover:border-blue-500/50'
                }`}
              >
                {model.locked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-red-400" />
                  </div>
                )}
                <div className="text-3xl mb-2">{model.icon}</div>
                <div className="text-sm font-bold">{model.name}</div>
                <div className="text-xs opacity-70 mt-1">{model.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Depth Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-blue-400 font-mono uppercase flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Analysis Depth
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black font-mono ${depthInfo.color}`}>{depthInfo.label}</span>
              <span className="text-xs text-slate-500 font-mono">LVL {depth}</span>
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min="1"
              max="9"
              value={depth}
              onChange={(e) => {
                const next = parseInt(e.target.value);
                if (!canCustomize && next > 3) {
                  setDepth(3);
                  toast.error('Depth 4-9 requires AI+ access');
                  return;
                }
                setDepth(next);
              }}
              disabled={!canCustomize && depth > 3}
              className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(6 182 212) 0%, rgb(147 51 234) ${((depth - 1) / 8) * 100}%, rgb(239 68 68) 100%)`
              }}
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono">
              <span>1</span>
              <span>3</span>
              <span>6</span>
              <span>9</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">{depthInfo.desc}</p>
        </div>

        {/* Research Mode Toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setResearchMode(!researchMode)}>
            <div className={`relative w-14 h-7 rounded-full transition-all ${researchMode ? 'bg-blue-500' : 'bg-slate-700'}`}>
              <motion.div
                animate={{ x: researchMode ? 28 : 2 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
              />
            </div>
            <div>
              <span className="text-sm text-slate-200 font-medium">Research Mode</span>
              <p className="text-xs text-slate-500">Force JSON structured output</p>
            </div>
          </label>
        </div>

        {/* Thinking Mode Toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setThinkingEnabled(!thinkingEnabled)}>
            <div className={`relative w-14 h-7 rounded-full transition-all ${thinkingEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-700'}`}>
              <motion.div
                animate={{ x: thinkingEnabled ? 28 : 2 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-200 font-medium">Deep Thinking</span>
                <motion.div
                  animate={thinkingEnabled ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Brain className={`w-4 h-4 ${thinkingEnabled ? 'text-purple-400' : 'text-slate-600'}`} />
                </motion.div>
              </div>
              <p className="text-xs text-slate-500">
                {thinkingEnabled
                  ? 'AI uses enhanced reasoning for smarter responses'
                  : 'Disabled for faster, simpler responses'}
              </p>
            </div>
          </label>
        </div>

        {/* Custom Instructions */}
        {canCustomize && (
          <div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-xs text-blue-400 font-mono uppercase mb-3 hover:text-blue-300 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Override Protocols
              <ChevronDown className={`w-3 h-3 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex gap-2">
                    {presets.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setCustomInstructions(preset.instructions);
                          setHasTouchedInstructions(true);
                        }}
                        className="px-3 py-1 text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-blue-500/30 rounded-lg text-blue-400 font-mono transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                    {savedInstructions && (
                      <button
                        onClick={() => {
                          setCustomInstructions(savedInstructions);
                          setHasTouchedInstructions(false);
                        }}
                        className="px-3 py-1 text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/40 rounded-lg text-cyan-300 font-mono transition-all"
                      >
                        Load Saved
                      </button>
                    )}
                  </div>

                  <textarea
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      setHasTouchedInstructions(true);
                    }}
                    placeholder="Enter custom system instructions..."
                    className="w-full h-24 bg-slate-950/50 border border-blue-500/30 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-mono resize-none"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 font-mono">
                    <span>
                      {savedInstructions
                        ? 'Default instructions will auto-load for new sessions.'
                        : 'No default Intel instructions saved yet.'}
                    </span>
                    <button
                      onClick={handleSaveInstructions}
                      disabled={isSavingInstructions}
                      className="px-3 py-1 bg-slate-800/60 hover:bg-slate-700/60 border border-cyan-500/40 rounded-lg text-cyan-300 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSavingInstructions ? 'Saving...' : 'Save Default'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {intelMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)]"
              >
                <Brain className="w-12 h-12 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Neural Interface Ready</h3>
              <p className="text-sm text-slate-500 font-mono">Begin your research query below</p>
            </div>
          </div>
        ) : (
          intelMessages.map((msg: IntelChatMessage, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-none shadow-[0_0_20px_rgba(59,130,246,0.3)] p-4'
                    : 'w-full'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="font-mono text-sm">{msg.content}</div>
                ) : (
                  <div className="bg-slate-800/80 border border-blue-500/30 rounded-2xl rounded-bl-none p-6 space-y-4">
                    {/* Summary Bullets */}
                    {msg.result?.summary_bullets && msg.result.summary_bullets.length > 0 && (
                      <div>
                        <h4 className="text-xs text-cyan-400 font-mono uppercase mb-3 flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          Key Insights
                        </h4>
                        <ul className="space-y-2">
                          {msg.result.summary_bullets.map((bullet, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="text-sm text-slate-200 font-mono flex gap-3"
                            >
                              <span className="text-cyan-400 font-bold">▸</span>
                              <span>{bullet}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Essay Content */}
                    {msg.result?.essay && (
                      <div className="border-t border-blue-500/20 pt-4">
                        <h4 className="text-xs text-purple-400 font-mono uppercase mb-3 flex items-center gap-2">
                          <Brain className="w-3 h-3" />
                          Deep Analysis
                        </h4>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-mono">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.result.essay}</div>
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    {msg.result?.sources && msg.result.sources.length > 0 && (
                      <div className="border-t border-blue-500/20 pt-4">
                        <h4 className="text-xs text-blue-400 font-mono uppercase mb-3 flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" />
                          Sources
                        </h4>
                        <div className="space-y-2">
                          {msg.result.sources.slice(0, 5).map((source, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                              className="bg-slate-900/50 border border-blue-500/20 rounded-lg p-3 hover:border-blue-500/40 transition-colors"
                            >
                              <div className="text-xs text-blue-400 font-bold mb-1">{source.title}</div>
                              <div className="text-xs text-slate-500 font-mono mb-2 truncate">{source.url}</div>
                              <div className="text-xs text-slate-400">{source.snippet}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Concepts */}
                    {msg.result?.related_concepts && msg.result.related_concepts.length > 0 && (
                      <div className="border-t border-blue-500/20 pt-4">
                        <h4 className="text-xs text-yellow-400 font-mono uppercase mb-3 flex items-center gap-2">
                          <Lightbulb className="w-3 h-3" />
                          Related Concepts
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {msg.result.related_concepts.map((concept, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 + i * 0.05 }}
                              className="px-3 py-1 bg-slate-900/50 border border-yellow-500/30 rounded-full text-xs text-yellow-400 font-mono hover:bg-yellow-500/10 transition-colors cursor-pointer"
                            >
                              {concept}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}

        {isIntelLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-slate-800/80 border border-blue-500/30 p-4 rounded-2xl rounded-bl-none flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Brain className="w-5 h-5 text-blue-400" />
              </motion.div>
              <span className="text-sm text-slate-400 font-mono">Processing neural pathways...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-blue-500/20 bg-slate-900/60 relative z-10">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Enter research query..."
            disabled={isIntelLoading}
            className="flex-1 bg-slate-950/50 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-mono disabled:opacity-50"
          />
          <motion.button
            onClick={handleSend}
            disabled={!query.trim() || isIntelLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            SEND
          </motion.button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-mono">
          <span>MODEL: {models.find(m => m.id === selectedModel)?.name.toUpperCase()}</span>
          <span>DEPTH: {depth}/9</span>
          <span>{intelMessages.length} MESSAGES</span>
        </div>
      </div>

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
