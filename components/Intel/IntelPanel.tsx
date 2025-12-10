
import React, { useEffect, useMemo, useState } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Search, Loader2, Database, BrainCircuit, Sparkles, Settings, X, Lock, Share2, Globe2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntelResults } from './IntelResults';
import { SaveDropModal } from './SaveDropModal';
import { toast } from '@/lib/toast';
import clsx from 'clsx';
import { FriendPickerModal } from '../Shared/FriendPickerModal';
import { Streamdown } from 'streamdown';

export const IntelPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showCommandDeck, setShowCommandDeck] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro' | 'orbit-x' | 'gemini-3-pro' | 'gemini-3-image'>('flash');
  const [depth, setDepth] = useState(3);
  const [researchMode, setResearchMode] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [shareTarget, setShareTarget] = useState<'dm' | null>(null);
  const [shareSubject, setShareSubject] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const {
    sendIntelQuery,
    isIntelLoading,
    currentIntelResult,
    currentUser,
    intelMessages,
    clearIntelHistory,
    shareAIChatToFeed,
    shareAIChatToDM
  } = useOrbitStore();
  const canCustomize = !!currentUser?.can_customize_ai;
  const unlockedModels = useMemo(() => {
    if (currentUser?.isAdmin || currentUser?.is_admin) {
      return ['flash', 'pro', 'orbit-x', 'gemini-3-pro', 'gemini-3-image'];
    }
    return currentUser?.unlocked_models || ['flash'];
  }, [currentUser?.unlocked_models, currentUser?.isAdmin, currentUser?.is_admin]);
  const conversationLength = intelMessages.length;

  const models = [
    { id: 'flash' as const, name: 'Flash 2.5', color: 'from-cyan-500 to-blue-500', locked: false, tier: 1 },
    { id: 'pro' as const, name: 'Pro 2.5', color: 'from-purple-500 to-pink-500', locked: !unlockedModels.includes('pro'), tier: 2 },
    { id: 'orbit-x' as const, name: 'Orbit-X', color: 'from-violet-500 to-indigo-500', locked: !unlockedModels.includes('orbit-x'), tier: 3 },
    { id: 'gemini-3-pro' as const, name: 'Gemini 3.0 Pro', color: 'from-emerald-500 to-teal-500', locked: !unlockedModels.includes('gemini-3-pro'), tier: 4 },
    { id: 'gemini-3-pro' as const, name: 'Gemini 3.0 Pro', color: 'from-emerald-500 to-teal-500', locked: !unlockedModels.includes('gemini-3-pro'), tier: 4 }
  ];

  // Check if current model supports thinking
  const supportsThinking = ['pro', 'orbit-x', 'flash', 'gemini-3-pro', 'gemini-3-image'].includes(selectedModel);

  // Check if current model supports thinking level (not just budget)
  const supportsThinkingLevel = ['gemini-3-pro', 'gemini-3-image'].includes(selectedModel);

  const selectedMessages = intelMessages.filter((msg) => selectedMessageIds.includes(msg.id));
  const latestUserPrompt = useMemo(() => {
    const reversed = [...intelMessages].reverse();
    const found = reversed.find((msg) => msg.role === 'user');
    return found?.content || '';
  }, [intelMessages]);
  const latestModelUsed = useMemo(() => {
    const reversed = [...intelMessages].reverse();
    const found = reversed.find((msg) => msg.role === 'model' && msg.meta?.model_used);
    return found?.meta?.model_used || selectedModel;
  }, [intelMessages, selectedModel]);
  const modelLabelMap: Record<string, string> = {
    flash: 'Gemini 2.5 Flash',
    pro: 'Gemini 2.5 Pro',
    'orbit-x': 'Orbit-X (2.5 Pro)',
    'gemini-3-pro': 'Gemini 3.0 Pro',
    'gemini-3-image': 'Gemini 3.0 Image'
  };

  useEffect(() => {
    if (!selectionMode) {
      setSelectedMessageIds([]);
      setShareTarget(null);
    }
  }, [selectionMode]);

  useEffect(() => {
    setSelectedMessageIds((prev) => prev.filter((id) => intelMessages.some((msg) => msg.id === id)));
  }, [intelMessages]);

  useEffect(() => {
    if (selectionMode && !shareSubject && (currentQuery || latestUserPrompt)) {
      setShareSubject(currentQuery || latestUserPrompt);
    }
  }, [selectionMode, shareSubject, currentQuery, latestUserPrompt]);

  const getMessageText = (message: (typeof intelMessages)[number]) => {
    if (message.role === 'user') return message.content;
    if (message.result) {
      const bulletText = Array.isArray(message.result.summary_bullets) && message.result.summary_bullets.length
        ? message.result.summary_bullets.join('\n')
        : '';
      const essayText = message.result.essay || '';
      return [bulletText, essayText].filter(Boolean).join('\n\n') || message.content || 'AI response';
    }
    return message.content || '';
  };

  const toggleMessageSelection = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((msgId) => msgId !== id) : [...prev, id]
    );
  };

  const handleShareToFeed = async () => {
    if (selectedMessages.length === 0) {
      toast.error('Select messages to share first.');
      return;
    }

    setIsSharing(true);
    try {
      const subject = (shareSubject || currentQuery || latestUserPrompt || 'AI Chat').trim();
      await shareAIChatToFeed(selectedMessages, subject);
      setSelectionMode(false);
      setSelectedMessageIds([]);
      setShareTarget(null);
    } catch (error) {
      // Error toast handled in store
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToDM = async (userId: string) => {
    if (selectedMessages.length === 0) {
      toast.error('Select messages to share first.');
      return;
    }
    setIsSharing(true);
    try {
      const subject = (shareSubject || currentQuery || latestUserPrompt || 'AI Chat').trim();
      await shareAIChatToDM(selectedMessages, subject, userId);
      setSelectionMode(false);
      setSelectedMessageIds([]);
      setShareTarget(null);
    } catch (error) {
      // Error toast handled in store
    } finally {
      setIsSharing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isIntelLoading) return;

    setCurrentQuery(query);
    const queryToSend = query;
    setQuery(''); // Clear the input after submitting
    try {
      const effectiveDepth = canCustomize ? depth : Math.min(depth, 3);
      const effectiveModel = unlockedModels.includes(selectedModel) ? selectedModel : 'flash';
      await sendIntelQuery(queryToSend, {
        depthLevel: effectiveDepth,
        modelUsed: effectiveModel,
        researchMode,
        customInstructions: customInstructions.trim() || undefined,
        mode: 'chat',
        thinkingLevel
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
            {intelMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectionMode(!selectionMode)}
                className={clsx(
                  "px-2 py-0.5 rounded border text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors",
                  selectionMode
                    ? "border-violet-500/70 text-violet-200 bg-violet-500/10"
                    : "border-cyan-500/50 text-cyan-200 hover:border-cyan-300 hover:text-cyan-100"
                )}
              >
                <Share2 className="w-3.5 h-3.5" />
                {selectionMode ? 'Cancel Share' : 'Share Chat'}
              </button>
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
        <form onSubmit={handleSubmit} className="relative space-y-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
            <div className="relative flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group-focus-within:border-cyan-500/50 transition-colors">
              <Search className="w-4 h-4 text-slate-500 ml-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={'Enter research query...'}
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
          {isIntelLoading ? (
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
          ) : (
            <motion.div
              key="intel-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {intelMessages.length > 0 && (
                <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 shadow-lg shadow-cyan-900/10">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">AI Chat Transcript</p>
                      <p className="text-xs text-slate-500">
                        {selectionMode ? `Select messages to share (${selectedMessageIds.length} chosen)` : `Captured ${intelMessages.length} turns`}
                      </p>
                    </div>
                    {selectionMode && (
                      <span className="px-2 py-1 rounded-full border border-violet-500/50 text-[10px] font-mono text-violet-200 bg-violet-500/10">
                        Selection Mode
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {intelMessages.map((message) => {
                      const isSelected = selectedMessageIds.includes(message.id);
                      const text = getMessageText(message);
                      const preview = text.length > 260 ? `${text.slice(0, 260)}...` : text;
                      const timestamp = message.created_at
                        ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={message.id}
                          onClick={() => selectionMode && toggleMessageSelection(message.id)}
                          className={clsx(
                            "relative p-3 rounded-lg border transition-all",
                            message.role === 'user'
                              ? "border-cyan-500/30 bg-cyan-500/5"
                              : "border-violet-500/30 bg-violet-500/5",
                            selectionMode && "cursor-pointer hover:border-cyan-400/60",
                            isSelected && "ring-2 ring-cyan-400/60"
                          )}
                        >
                          {selectionMode && (
                            <div
                              className={clsx(
                                "absolute top-3 right-3 w-5 h-5 rounded-md border flex items-center justify-center text-[11px] font-mono",
                                isSelected
                                  ? "bg-cyan-500 text-slate-900 border-cyan-400"
                                  : "border-slate-600 text-slate-500 bg-slate-900/80"
                              )}
                            >
                              {isSelected ? 'X' : ''}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "text-[11px] font-mono px-2 py-1 rounded-full border",
                                message.role === 'user'
                                  ? "border-cyan-500/50 text-cyan-200"
                                  : "border-violet-500/50 text-violet-200"
                              )}>
                                {message.role === 'user' ? (currentUser?.username || 'You') : 'AI Response'}
                              </span>
                              {message.meta?.model_used && (
                                <span className="text-[10px] text-slate-500 font-mono uppercase">
                                  {message.meta.model_used}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{timestamp}</span>
                          </div>

                          <div className="text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-slate-200 prose-headings:text-sm prose-strong:text-slate-100 prose-code:text-cyan-400 prose-pre:bg-slate-950/80">
                            <Streamdown>{preview || 'No content'}</Streamdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentIntelResult ? (
                <IntelResults
                  result={currentIntelResult}
                  query={currentQuery}
                  onSave={handleSave}
                  onFollowUp={handleFollowUp}
                  isLoading={isIntelLoading}
                  modelUsed={modelLabelMap[latestModelUsed] || latestModelUsed}
                />
              ) : (
                <motion.div
                  key="intel-empty"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectionMode && intelMessages.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-40">
          <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl shadow-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Share Subject</p>
              <input
                value={shareSubject}
                onChange={(e) => setShareSubject(e.target.value)}
                placeholder={latestUserPrompt || 'AI Chat topic'}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Selected {selectedMessageIds.length} message{selectedMessageIds.length === 1 ? '' : 's'} to share
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                disabled={isSharing || selectedMessageIds.length === 0}
                onClick={handleShareToFeed}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border",
                  isSharing || selectedMessageIds.length === 0
                    ? "border-slate-700 text-slate-500 cursor-not-allowed"
                    : "border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/10"
                )}
              >
                <Globe2 className="w-4 h-4" />
                Share to Feed
              </button>
              <button
                type="button"
                disabled={isSharing || selectedMessageIds.length === 0}
                onClick={() => setShareTarget('dm')}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border",
                  isSharing || selectedMessageIds.length === 0
                    ? "border-slate-700 text-slate-500 cursor-not-allowed"
                    : "border-cyan-500/60 text-cyan-200 hover:bg-cyan-500/10"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                Send to Friend
              </button>
            </div>
          </div>
        </div>
      )}

      <FriendPickerModal
        open={shareTarget === 'dm'}
        onClose={() => setShareTarget(null)}
        onSelect={async (userId) => {
          await handleShareToDM(userId);
          setShareTarget(null);
        }}
      />

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
                {/* Model Selection */}
                <div>
                  <label className="text-xs text-blue-400 font-mono uppercase mb-2 block">AI Model</label>
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
                        className={`relative p-4 rounded-xl border-2 transition-all ${selectedModel === model.id
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
                        <div className="text-xs opacity-70 mt-1">Tier {model.tier}</div>
                      </button>
                    ))}
                  </div>
                </div>



                {/* Thinking Level (only for Gemini 3.0 models) */}
                {supportsThinkingLevel && (
                  <div>
                    <label className="text-xs text-emerald-400 font-mono uppercase mb-2 block flex items-center gap-2">
                      <BrainCircuit className="w-3 h-3" />
                      Thinking Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setThinkingLevel(level as typeof thinkingLevel)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-mono uppercase ${thinkingLevel === level
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {thinkingLevel === 'low' ? 'Fast, simple reasoning' : thinkingLevel === 'medium' ? 'Balanced thinking' : 'Deep, complex analysis'}
                    </p>
                  </div>
                )}

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

                {/* Debug Info */}
                <div className="mt-4 p-4 bg-slate-950/50 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-400">
                  <h4 className="text-xs text-slate-500 uppercase mb-2 border-b border-slate-800 pb-1">Debug Configuration</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between"><span>User ID:</span> <span className="text-slate-200">{currentUser?.id}</span></div>
                    <div className="flex justify-between"><span>Admin:</span> <span className={currentUser?.is_admin || currentUser?.isAdmin ? "text-green-400" : "text-red-400"}>{currentUser?.is_admin || currentUser?.isAdmin ? 'YES' : 'NO'}</span></div>
                    <div className="col-span-2 flex justify-between border-t border-slate-800/50 pt-1 mt-1"><span>Unlocked:</span> <span className="text-slate-200">{unlockedModels.join(', ')}</span></div>

                    <div className="col-span-2 mt-2 mb-1 text-slate-500 font-bold">Model Parameters</div>
                    <div className="flex justify-between"><span>Model:</span> <span className="text-cyan-400">{selectedModel}</span></div>
                    <div className="flex justify-between"><span>Thinking:</span> <span className="text-emerald-400">{supportsThinkingLevel ? thinkingLevel : 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Depth:</span> <span className="text-purple-400">{depth}</span></div>
                    <div className="flex justify-between"><span>Research:</span> <span className={researchMode ? "text-green-400" : "text-slate-600"}>{researchMode ? 'ACTIVE' : 'OFF'}</span></div>
                    <div className="flex justify-between"><span>Deep Think:</span> <span className={useDeepThinking ? "text-green-400" : "text-slate-600"}>{useDeepThinking ? 'ON' : 'OFF'}</span></div>

                    <div className="col-span-2 mt-2 mb-1 text-slate-500 font-bold">Context</div>
                    <div className="col-span-2 truncate">
                      <span className="mr-2">Instructions:</span>
                      <span className="text-slate-300 italic">
                        {customInstructions ? `"${customInstructions.slice(0, 40)}..."` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
