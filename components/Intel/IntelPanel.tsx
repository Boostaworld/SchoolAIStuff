
import React, { useMemo, useState } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Search, Loader2, Database, BrainCircuit, Sparkles, Settings, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntelResults } from './IntelResults';
import { SaveDropModal } from './SaveDropModal';
import { toast } from '@/lib/toast';
import clsx from 'clsx';

export const IntelPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showCommandDeck, setShowCommandDeck] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro' | 'orbit-x'>('flash');
  const [depth, setDepth] = useState(3);
  const [researchMode, setResearchMode] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const { sendIntelQuery, isIntelLoading, currentIntelResult, currentUser, intelMessages, clearIntelHistory } = useOrbitStore();
  const canCustomize = !!currentUser?.can_customize_ai;
  const unlockedModels = useMemo(() => currentUser?.unlocked_models || ['flash'], [currentUser?.unlocked_models]);
  const conversationLength = intelMessages.length;

  const models = [
    { id: 'flash' as const, name: 'Flash 2.0', color: 'from-cyan-500 to-blue-500', locked: false },
    { id: 'pro' as const, name: 'Pro 1.5', color: 'from-purple-500 to-pink-500', locked: !unlockedModels.includes('pro') },
    { id: 'orbit-x' as const, name: 'Orbit-X', color: 'from-violet-500 to-indigo-500', locked: !unlockedModels.includes('orbit-x') }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isIntelLoading) return;

    setCurrentQuery(query);
    setQuery(''); // Clear the input after submitting
    try {
      const effectiveDepth = canCustomize ? depth : Math.min(depth, 3);
      const effectiveModel = unlockedModels.includes(selectedModel) ? selectedModel : 'flash';
      await sendIntelQuery(query, {
        depthLevel: effectiveDepth,
        modelUsed: effectiveModel,
        researchMode,
        customInstructions: customInstructions.trim() || undefined
      });
    } catch (error) {
      // Error is already logged and toasted in the store
    }
  };

  const handleFollowUp = async (followUpQuery: string) => {
    try {
      const effectiveModel = unlockedModels.includes(selectedModel) ? selectedModel : 'flash';
      await sendIntelQuery(followUpQuery, {
        modelUsed: effectiveModel,
        conversationMode: true // Use simple chat mode for follow-ups
      });
    } catch (error) {
      // Error is already logged and toasted in the store
    }
  };

  const handleSave = () => {
    setShowSaveModal(true);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setQuery('');
    setCurrentQuery('');
    setUseDeepThinking(false);
  };

  const openSettings = () => {
    setSelectedModel(unlockedModels.includes(selectedModel) ? selectedModel : 'flash');
    setDepth(canCustomize ? depth : Math.min(depth, 3));
    setCustomInstructions(currentUser?.intel_instructions || '');
    setResearchMode(false);
    setShowCommandDeck(true);
    toast.info(
      `Access: is_admin=${!!currentUser?.is_admin}, can_customize_ai=${canCustomize}, unlocked_models=${unlockedModels.join(',')}`
    );
  };

  const saveSettings = () => {
    if (!canCustomize && depth > 3) {
      setDepth(3);
      toast.error('Depth above 3 requires AI+ access');
      return;
    }
    if (!unlockedModels.includes(selectedModel)) {
      setSelectedModel('flash');
      toast.error('Model not unlocked; using Flash');
      return;
    }
    setShowCommandDeck(false);
    toast.success('Intel settings saved');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900/90 to-slate-900/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(124,58,237,0.05)_50%,transparent_100%)] animate-shimmer" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Database className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <h2 className="font-bold text-slate-100 tracking-wider">INTEL ENGINE</h2>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">AI Research Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            {conversationLength > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">THREAD:</span>
                <span className="text-violet-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {Math.floor(conversationLength / 2)} msg{Math.floor(conversationLength / 2) !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearIntelHistory();
                    setCurrentQuery('');
                  }}
                  className="px-2 py-0.5 rounded border border-slate-700 text-[9px] uppercase tracking-wider text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            <span className="text-slate-600">STATUS:</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              OPERATIONAL
            </span>
            <button
              type="button"
              onClick={openSettings}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors ml-2"
            >
              <Settings className="w-3.5 h-3.5" />
              Command Deck
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Area */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 space-y-3">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
            <div className="relative flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group-focus-within:border-cyan-500/50 transition-colors">
              <Search className="w-4 h-4 text-slate-500 ml-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter research query..."
                disabled={isIntelLoading}
                className="flex-1 bg-transparent px-2 py-3 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-mono"
              />
              <button
                type="submit"
                disabled={!query.trim() || isIntelLoading}
                className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-mono text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-500 hover:to-violet-500 transition-all"
              >
                {isIntelLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    PROCESSING
                  </span>
                ) : (
                  'EXECUTE'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Deep Dive Toggle */}
        <div className="flex items-center justify-between">
           <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">
             Query structured intelligence from global sources
           </p>
           
           <button 
             type="button"
             onClick={() => {
               setUseDeepThinking(!useDeepThinking);
               setResearchMode(!useDeepThinking);
             }}
             disabled={isIntelLoading}
             className={clsx(
               "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono disabled:opacity-50",
               useDeepThinking 
                 ? "bg-violet-500/10 border-violet-500 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                 : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
             )}
           >
             <div className="relative">
               <BrainCircuit className={clsx("w-3.5 h-3.5", useDeepThinking && "animate-pulse")} />
               {useDeepThinking && (
                 <motion.div 
                   layoutId="sparkles"
                   className="absolute -top-1 -right-1"
                 >
                   <Sparkles className="w-2 h-2 text-yellow-400" />
                 </motion.div>
               )}
             </div>
             <span>DEEP THINKING MODE</span>
             {useDeepThinking && <span className="px-1 bg-violet-600 text-white text-[9px] rounded ml-1">PRO</span>}
           </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {isIntelLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-800 rounded-full" />
                <div className={clsx(
                  "absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin",
                  useDeepThinking ? "border-t-violet-500 border-r-fuchsia-500 duration-[2s]" : "border-t-cyan-500 border-r-violet-500"
                )} />
                {useDeepThinking && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-violet-500 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="text-center max-w-xs">
                <p className={clsx(
                  "font-mono text-sm uppercase tracking-widest mb-2",
                  useDeepThinking ? "text-violet-400" : "text-slate-400"
                )}>
                  {useDeepThinking ? "Deep Neural Analysis" : "Analyzing Query"}
                </p>
                {useDeepThinking ? (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Accessing extended context window (32k). Cross-referencing hundreds of vectors. This may take a moment.
                  </p>
                ) : (
                  <div className="flex gap-1 justify-center mt-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!isIntelLoading && currentIntelResult && (
            <IntelResults
              result={currentIntelResult}
              query={currentQuery}
              onSave={handleSave}
              onFollowUp={handleFollowUp}
              isLoading={isIntelLoading}
            />
          )}

          {!isIntelLoading && !currentIntelResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                <Database className="w-10 h-10 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-1">No Active Query</p>
                <p className="text-slate-600 text-xs max-w-xs">
                  Execute a research query to generate structured intelligence dossiers
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && currentIntelResult && (
          <SaveDropModal
            query={currentQuery}
            onClose={handleCloseSaveModal}
          />
        )}
      </AnimatePresence>

      {/* Command Deck Settings Modal */}
      <AnimatePresence>
        {showCommandDeck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowCommandDeck(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/70">
                <div className="text-sm font-mono text-slate-400 uppercase tracking-wider">Intel Command Deck (Settings)</div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>Admin: {currentUser?.is_admin ? 'Yes' : 'No'}</span>
                  <span>AI+: {canCustomize ? 'Yes' : 'No'}</span>
                  <button
                    onClick={() => setShowCommandDeck(false)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Close
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {models.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (model.locked) {
                          toast.error('Model not unlocked. Ask owner for access.');
                          return;
                        }
                        setSelectedModel(model.id);
                      }}
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
                      <div className="text-sm font-bold">{model.name}</div>
                      <div className="text-xs opacity-70 mt-1">{model.id === 'orbit-x' ? 'Deep thinking mode' : 'Standard'}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-blue-400 font-mono uppercase flex items-center gap-2">
                      Depth (1-9)
                    </label>
                    {!canCustomize && <span className="text-[11px] text-red-400 font-mono">AI+ required for 4-9</span>}
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={9}
                    value={depth}
                    onChange={(e) => {
                      const next = parseInt(e.target.value);
                      if (!canCustomize && next > 3) {
                        setDepth(3);
                        toast.error('Depth above 3 requires AI+ access. Ask owner for access.');
                        return;
                      }
                      setDepth(next);
                    }}
                    className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(6 182 212) 0%, rgb(147 51 234) ${((depth - 1) / 8) * 100}%, rgb(239 68 68) 100%)`
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {depth <= 3 ? 'Surface (fast, bullet points)' : depth <= 6 ? 'Standard (academic, citations)' : 'Abyss (slow, deep analysis)'}
                  </p>
                </div>

                <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-slate-200 font-medium">Research Mode</p>
                    <p className="text-xs text-slate-500">Forces structured JSON output</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResearchMode(!researchMode)}
                    className={`relative w-14 h-7 rounded-full transition-all ${researchMode ? 'bg-blue-500' : 'bg-slate-700'}`}
                  >
                    <motion.div
                      animate={{ x: researchMode ? 28 : 2 }}
                      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-blue-400 font-mono uppercase mb-2 block flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    Custom Instructions
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={canCustomize ? 'Provide comprehensive, factual research with credible sources.' : 'AI+ required to save custom instructions.'}
                    disabled={!canCustomize}
                    className="w-full h-24 bg-slate-950/50 border border-blue-500/30 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-mono resize-none disabled:opacity-50"
                  />
                  {!canCustomize && (
                    <p className="text-[11px] text-red-400 font-mono mt-1">Custom instructions require AI+ access. Ask the owner to enable.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCommandDeck(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-mono uppercase tracking-wider border border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-mono uppercase tracking-wider shadow-[0_0_14px_rgba(59,130,246,0.3)]"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
