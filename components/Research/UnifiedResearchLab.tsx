import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Send, X, Loader2, Image as ImageIcon, FileText, Zap, CheckCircle2, Database, BrainCircuit, Settings, Lock, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { LockedResearchLab } from './LockedResearchLab';
import { useToast } from '../Shared/ToastManager';
import { analyzeImageWithVision, analyzeGoogleForm, VisionMessage } from '../../lib/ai/gemini';
import { IntelResults } from '../Intel/IntelResults';
import { SaveDropModal } from '../Intel/SaveDropModal';
import { toast } from '@/lib/toast';
import clsx from 'clsx';
import { MarkdownRenderer } from '../Social/MarkdownRenderer';

type Tab = 'intel' | 'vision';

interface VisionMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: Date;
}

const VISION_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Flash Experimental', badge: 'FAST', color: 'cyan', requiredAccess: 'flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'BALANCED', color: 'purple', requiredAccess: 'pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'VISION+', color: 'amber', requiredAccess: 'flash' },
  { id: 'gemini-exp-1206', name: 'Gemini Experimental', badge: 'NEXT-GEN', color: 'green', requiredAccess: 'orbit-x' },
];

export const UnifiedResearchLab: React.FC = () => {
  const { currentUser, sendIntelQuery, isIntelLoading, currentIntelResult, intelMessages, clearIntelHistory } = useOrbitStore();
  const toastManager = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('intel');

  // Intel Engine state
  const [intelQuery, setIntelQuery] = useState('');
  const [showCommandDeck, setShowCommandDeck] = useState(false);
  const [selectedIntelModel, setSelectedIntelModel] = useState<'flash' | 'pro' | 'orbit-x' | 'gemini-3-pro' | 'gemini-3-image'>('flash');
  const [depth, setDepth] = useState(3);
  const [researchMode, setResearchMode] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  // Vision Lab state
  const [visionMessages, setVisionMessages] = useState<VisionMessage[]>([]);
  const [visionInput, setVisionInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>('gemini-2.0-flash-exp');
  const [isFormMode, setIsFormMode] = useState(false);

  // Access control
  const hasAccess = currentUser?.can_customize_ai;
  const canCustomize = !!currentUser?.can_customize_ai;
  const unlockedModels = useMemo(() => {
    if (currentUser?.isAdmin) {
      return ['flash', 'pro', 'orbit-x', 'gemini-3-pro', 'gemini-3-image'];
    }
    return currentUser?.unlocked_models || ['flash'];
  }, [currentUser?.unlocked_models, currentUser?.isAdmin]);
  const conversationLength = intelMessages.length;

  const intelModels = [
    { id: 'flash' as const, name: 'Flash 2.5', color: 'from-cyan-500 to-blue-500', locked: false, tier: 1 },
    { id: 'pro' as const, name: 'Pro 2.5', color: 'from-purple-500 to-pink-500', locked: !unlockedModels.includes('pro'), tier: 2 },
    { id: 'orbit-x' as const, name: 'Orbit-X', color: 'from-violet-500 to-indigo-500', locked: !unlockedModels.includes('orbit-x'), tier: 3 },
    { id: 'gemini-3-pro' as const, name: 'Gemini 3.0 Pro', color: 'from-emerald-500 to-teal-500', locked: !unlockedModels.includes('gemini-3-pro'), tier: 4 },
    { id: 'gemini-3-image' as const, name: 'Gemini 3.0 Image', color: 'from-rose-500 to-orange-500', locked: !unlockedModels.includes('gemini-3-image'), tier: 4 }
  ];

  const availableVisionModels = VISION_MODELS.filter(model => {
    if (model.requiredAccess === 'flash') return unlockedModels.includes('flash');
    if (model.requiredAccess === 'pro') return unlockedModels.includes('pro');
    return false;
  });

  const supportsThinkingLevel = ['gemini-3-pro', 'gemini-3-image'].includes(selectedIntelModel);

  // If no access, show locked screen
  if (!hasAccess) {
    return <LockedResearchLab />;
  }

  // Auto-scroll for vision chat
  useEffect(() => {
    if (activeTab === 'vision') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visionMessages, activeTab]);

  // Intel Engine handlers
  const handleIntelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intelQuery.trim() || isIntelLoading) return;

    setCurrentQuery(intelQuery);
    const queryToSend = intelQuery;
    setIntelQuery('');
    try {
      const effectiveDepth = canCustomize ? depth : Math.min(depth, 3);
      const effectiveModel = unlockedModels.includes(selectedIntelModel) ? selectedIntelModel : 'flash';
      await sendIntelQuery(queryToSend, {
        depthLevel: effectiveDepth,
        modelUsed: effectiveModel,
        researchMode,
        customInstructions: customInstructions.trim() || undefined,
        thinkingLevel
      });
    } catch (error) {
      // Error already handled
    }
  };

  const handleFollowUp = async (followUpQuery: string) => {
    try {
      const effectiveModel = unlockedModels.includes(selectedIntelModel) ? selectedIntelModel : 'flash';
      await sendIntelQuery(followUpQuery, {
        modelUsed: effectiveModel,
        conversationMode: true
      });
    } catch (error) {
      // Error already handled
    }
  };

  const openSettings = () => {
    setSelectedIntelModel(unlockedModels.includes(selectedIntelModel) ? selectedIntelModel : 'flash');
    setDepth(canCustomize ? depth : Math.min(depth, 3));
    setCustomInstructions(currentUser?.intel_instructions || '');
    setResearchMode(false);
    setShowCommandDeck(true);
  };

  const saveSettings = () => {
    if (!canCustomize && depth > 3) {
      setDepth(3);
      toast.error('Depth above 3 requires AI+ access');
      return;
    }
    if (!unlockedModels.includes(selectedIntelModel)) {
      setSelectedIntelModel('flash');
      toast.error('Model not unlocked; using Flash');
      return;
    }
    setShowCommandDeck(false);
    toast.success('Intel settings saved');
  };

  // Vision Lab handlers
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastManager.error('Invalid file type', { description: 'Please upload an image file' });
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toastManager.error('File too large', { description: 'Max file size is 4MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      toastManager.success('Image uploaded', { description: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleVisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!visionInput.trim() && !uploadedImage) || isAnalyzing) return;
    if (!uploadedImage) {
      toastManager.error('No image uploaded', { description: 'Please upload or paste an image first' });
      return;
    }

    const userMessage: VisionMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: visionInput || (isFormMode ? 'Analyze this Google Form' : 'What do you see in this image?'),
      image: uploadedImage,
      timestamp: new Date()
    };

    setVisionMessages(prev => [...prev, userMessage]);
    setVisionInput('');
    setIsAnalyzing(true);

    try {
      const history: VisionMessage[] = visionMessages.map(msg => ({
        role: msg.role,
        text: msg.text,
        image: msg.image
      }));

      let response;

      if (isFormMode) {
        response = await analyzeGoogleForm(uploadedImage, selectedVisionModel);
      } else {
        response = await analyzeImageWithVision(
          uploadedImage,
          visionInput || 'What do you see in this image?',
          selectedVisionModel,
          history
        );
      }

      const aiMessage: VisionMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date()
      };

      setVisionMessages(prev => [...prev, aiMessage]);
      setUploadedImage(null);
      setIsFormMode(false);

      toastManager.success('Analysis complete', {
        description: `Processed with ${VISION_MODELS.find(m => m.id === selectedVisionModel)?.name}`,
        duration: 3000
      });

    } catch (error: any) {
      toastManager.error('Analysis failed', {
        description: error.message || 'Please try again',
        duration: 5000
      });
      console.error('Vision analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Paste handler for vision
  useEffect(() => {
    if (activeTab !== 'vision') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          if (blob.size > 4 * 1024 * 1024) {
            toastManager.error('Image too large', { description: 'Max file size is 4MB' });
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setUploadedImage(base64);
            toastManager.success('Image pasted!', { description: 'Ready to analyze' });
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeTab, toastManager]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-black to-slate-950 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'gridScroll 20s linear infinite'
        }} />
      </div>

      {/* Header with tab switcher */}
      <div className="flex-shrink-0 border-b-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm relative z-10">
        <div className="px-4 py-3">
          {/* Status bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 font-mono text-xs tracking-wider font-bold">
                  SYSTEM ONLINE
                </span>
              </div>
              <div className="h-4 w-px bg-cyan-500/30" />
              <span className="text-cyan-400 font-mono text-xs font-bold">
                CLEARANCE: AI+
              </span>
            </div>
            {activeTab === 'intel' && (
              <div className="flex items-center gap-2">
                {conversationLength > 0 && (
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-slate-600 text-xs font-mono">THREAD:</span>
                    <span className="text-violet-400 flex items-center gap-1 text-xs font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {Math.floor(conversationLength / 2)} msg{Math.floor(conversationLength / 2) !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearIntelHistory();
                        setCurrentQuery('');
                      }}
                      className="px-2 py-0.5 rounded border border-slate-700 text-[9px] uppercase tracking-wider text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-colors font-mono"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={openSettings}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors font-mono"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 relative">
            <motion.div
              className="absolute bottom-0 h-0.5 bg-gradient-to-r from-cyan-400 to-teal-400"
              animate={{
                left: activeTab === 'intel' ? '0%' : '50%',
                width: '50%'
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('intel')}
              className={clsx(
                "flex-1 px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider transition-all border-2 relative overflow-hidden",
                activeTab === 'intel'
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:border-cyan-500/30 hover:text-slate-400'
              )}
            >
              {activeTab === 'intel' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"
                  animate={{ top: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                <Database className="w-4 h-4" />
                INTEL ENGINE
              </span>
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className={clsx(
                "flex-1 px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider transition-all border-2 relative overflow-hidden",
                activeTab === 'vision'
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-300'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:border-orange-500/30 hover:text-slate-400'
              )}
            >
              {activeTab === 'vision' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent"
                  animate={{ top: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                <ImageIcon className="w-4 h-4" />
                VISION LAB
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {activeTab === 'intel' ? (
          <motion.div
            key="intel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Intel search area */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 space-y-3 flex-shrink-0">
              <form onSubmit={handleIntelSubmit} className="relative">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                  <div className="relative flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group-focus-within:border-cyan-500/50 transition-colors">
                    <Search className="w-4 h-4 text-slate-500 ml-3" />
                    <input
                      type="text"
                      value={intelQuery}
                      onChange={(e) => setIntelQuery(e.target.value)}
                      placeholder="Enter research query..."
                      disabled={isIntelLoading}
                      className="flex-1 bg-transparent px-2 py-3 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!intelQuery.trim() || isIntelLoading}
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

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">
                  Query structured intelligence from global sources
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResearchMode(!researchMode);
                  }}
                  disabled={isIntelLoading}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono disabled:opacity-50",
                    researchMode
                      ? "bg-violet-500/10 border-violet-500 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                  )}
                >
                  <div className="relative">
                    <BrainCircuit className={clsx("w-3.5 h-3.5", researchMode && "animate-pulse")} />
                    {researchMode && (
                      <motion.div
                        layoutId="sparkles"
                        className="absolute -top-1 -right-1"
                      >
                        <Sparkles className="w-2 h-2 text-yellow-400" />
                      </motion.div>
                    )}
                  </div>
                  <span>DEEP THINKING</span>
                  {researchMode && <span className="px-1 bg-violet-600 text-white text-[9px] rounded ml-1">ACTIVE</span>}
                </button>
              </div>
            </div>

            {/* Intel results area */}
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
                      <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-cyan-500 border-r-violet-500" />
                    </div>
                    <div className="text-center max-w-xs">
                      <p className="font-mono text-sm uppercase tracking-widest mb-2 text-slate-400">
                        Analyzing Query
                      </p>
                      <div className="flex gap-1 justify-center mt-2">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isIntelLoading && currentIntelResult && (
                  <IntelResults
                    result={currentIntelResult}
                    query={currentQuery}
                    onSave={() => setShowSaveModal(true)}
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
          </motion.div>
        ) : (
          <motion.div
            key="vision"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Vision model selector */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex-shrink-0">
              <div className="flex items-center gap-3">
                <label className="text-slate-400 text-xs font-mono">VISION MODEL:</label>
                <select
                  value={selectedVisionModel}
                  onChange={(e) => setSelectedVisionModel(e.target.value)}
                  className="bg-slate-900/50 border border-orange-500/30 text-orange-300 px-3 py-1 text-xs font-mono focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {availableVisionModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vision chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
              <AnimatePresence>
                {visionMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-orange-950/50 border-orange-500/50' : 'bg-slate-900/50 border-slate-700/50'} border-2 p-4 relative`}>
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current opacity-50" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current opacity-50" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current opacity-50" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current opacity-50" />

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-mono font-bold ${message.role === 'user' ? 'text-orange-400' : 'text-slate-400'}`}>
                          {message.role === 'user' ? 'OPERATOR' : 'AI ANALYSIS'}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      {message.image && (
                        <div className="mb-3">
                          <img
                            src={message.image}
                            alt="Uploaded"
                            className="max-w-full h-auto border border-orange-500/30 rounded"
                          />
                        </div>
                      )}

                      <div className="text-slate-300 text-sm font-mono leading-relaxed">
                        <MarkdownRenderer content={message.text} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-900/50 border-2 border-orange-500/50 p-4 relative">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-orange-500" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-orange-500" />

                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      <span className="text-orange-400 font-mono text-sm font-bold">
                        ANALYZING...
                      </span>
                    </div>

                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent"
                      animate={{ top: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Image preview */}
            <AnimatePresence>
              {uploadedImage && !isAnalyzing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-shrink-0 border-t-2 border-orange-500/30 bg-black/60 backdrop-blur-sm p-4 relative z-10"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="w-32 h-32 object-cover border-2 border-orange-500/50"
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/30 to-transparent"
                        animate={{ top: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-mono text-xs font-bold">
                          IMAGE LOADED
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-mono mb-3">
                        Ready for analysis. Choose mode below:
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsFormMode(false)}
                          className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all ${!isFormMode
                            ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                            : 'bg-transparent border-slate-700 text-slate-500 hover:border-orange-500/50'
                            }`}
                        >
                          <ImageIcon className="w-3 h-3 inline mr-1" />
                          GENERAL
                        </button>
                        <button
                          onClick={() => setIsFormMode(true)}
                          className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all ${isFormMode
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-transparent border-slate-700 text-slate-500 hover:border-amber-500/50'
                            }`}
                        >
                          <FileText className="w-3 h-3 inline mr-1" />
                          GOOGLE FORM
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="flex-shrink-0 p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vision input area */}
            <div className="flex-shrink-0 border-t-2 border-orange-500/30 bg-black/40 backdrop-blur-sm p-4 relative z-10">
              <form onSubmit={handleVisionSubmit} className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="px-4 py-3 bg-slate-900 border-2 border-orange-500/30 text-orange-400 hover:border-orange-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-sm font-bold"
                >
                  <Upload className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={visionInput}
                  onChange={(e) => setVisionInput(e.target.value)}
                  placeholder={uploadedImage ? "Enter your question... (optional)" : "Upload or paste an image first (Ctrl+V)"}
                  disabled={isAnalyzing || !uploadedImage}
                  className="flex-1 px-4 py-3 bg-slate-900/50 border-2 border-orange-500/30 text-slate-300 font-mono text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600 transition-all"
                />

                <button
                  type="submit"
                  disabled={isAnalyzing || !uploadedImage}
                  className="px-6 py-3 bg-orange-600 border-2 border-orange-500 text-black hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono font-bold text-sm flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      ANALYZING
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      ANALYZE
                    </>
                  )}
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-600">
                <span>TIP: Paste images with Ctrl+V</span>
                <span>MAX SIZE: 4MB</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Deck Modal */}
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
                <div className="text-sm font-mono text-slate-400 uppercase tracking-wider">Intel Command Deck</div>
                <button
                  onClick={() => setShowCommandDeck(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="text-xs text-blue-400 font-mono uppercase mb-2 block">AI Model</label>
                  <div className="grid grid-cols-3 gap-3">
                    {intelModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          if (model.locked) {
                            toast.error('Model not unlocked. Ask owner for access.');
                            return;
                          }
                          setSelectedIntelModel(model.id);
                        }}
                        className={`relative p-4 rounded-xl border-2 transition-all ${selectedIntelModel === model.id
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

                {/* Thinking Level */}
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

                {/* Depth */}
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
                        toast.error('Depth above 3 requires AI+ access.');
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

                {/* Research Mode */}
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

                {/* Custom Instructions */}
                <div>
                  <label className="text-xs text-blue-400 font-mono uppercase mb-2 block flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    Custom Instructions
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={canCustomize ? 'Provide comprehensive, factual research with credible sources.' : 'AI+ required for custom instructions.'}
                    disabled={!canCustomize}
                    className="w-full h-24 bg-slate-950/50 border border-blue-500/30 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-mono resize-none disabled:opacity-50"
                  />
                  {!canCustomize && (
                    <p className="text-[11px] text-red-400 font-mono mt-1">Custom instructions require AI+ access.</p>
                  )}
                </div>

                {/* Save button */}
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
                <div className="mt-4 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                  <h4 className="text-xs text-slate-500 font-mono uppercase mb-2">Debug Info</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                    <div>User ID: <span className="text-slate-200">{currentUser?.id}</span></div>
                    <div>Is Admin: <span className={currentUser?.isAdmin ? "text-green-400" : "text-red-400"}>{currentUser?.isAdmin ? 'YES' : 'NO'}</span></div>
                    <div className="col-span-2">Unlocked Models: <span className="text-slate-200">{unlockedModels.join(', ')}</span></div>
                    <div>Selected Model: <span className="text-cyan-400">{selectedIntelModel}</span></div>
                    <div>Thinking Level: <span className="text-emerald-400">{thinkingLevel}</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && currentIntelResult && (
          <SaveDropModal
            query={currentQuery}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
      `}</style>
    </div>
  );
};
