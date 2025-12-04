import React, { useState, useEffect, useRef } from 'react';
import { Upload, Send, X, Loader2, Image as ImageIcon, MessageSquare, Settings as SettingsIcon, Trash2, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { LockedResearchLab } from './LockedResearchLab';
import { useToast } from '../Shared/ToastManager';
import { analyzeImageWithVision, analyzeGoogleForm, VisionMessage, sendChatMessage, ChatRequest } from '../../lib/ai/gemini';
import clsx from 'clsx';
import { MarkdownRenderer } from '../Social/MarkdownRenderer';

type Tab = 'chat' | 'vision';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  timestamp: Date;
}

interface VisionChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: Date;
}

const CHAT_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'FAST', color: 'cyan', supportsThinking: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'BEST', color: 'purple', supportsThinking: true },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', badge: 'EXPERIMENTAL', color: 'amber', supportsThinking: false },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', badge: 'LATEST', color: 'emerald', supportsThinking: true },
];

const VISION_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', badge: 'SMARTEST', color: 'emerald' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'BEST', color: 'purple' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'FAST', color: 'cyan' },
];

export const ResearchLab: React.FC = () => {
  const { currentUser } = useOrbitStore();
  const toastManager = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const visionEndRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Chat Mode state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedChatModel, setSelectedChatModel] = useState('gemini-2.5-flash');
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [temperature, setTemperature] = useState(1.0);

  // Vision Lab state
  const [visionMessages, setVisionMessages] = useState<VisionChatMessage[]>([]);
  const [visionInput, setVisionInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVisionModel, setSelectedVisionModel] = useState('gemini-3-pro-preview');
  const [isFormMode, setIsFormMode] = useState(false);

  // Access control
  const hasAccess = currentUser?.can_customize_ai;
  const currentChatModel = CHAT_MODELS.find(m => m.id === selectedChatModel);
  const supportsThinking = currentChatModel?.supportsThinking || false;

  const logChatConfig = (reason: string, extra?: Record<string, any>) => {
    console.log('[ResearchLab Chat]', reason, {
      model: selectedChatModel,
      thinkingSupported: supportsThinking,
      thinkingLevel: supportsThinking ? thinkingLevel : 'n/a',
      temperature,
      hasSystemInstructions: Boolean(systemInstructions.trim()),
      systemInstructionsPreview: systemInstructions.slice(0, 200),
      chatHistoryLength: chatMessages.length,
      ...extra
    });
  };

  useEffect(() => {
    logChatConfig('Settings changed');
  }, [selectedChatModel, thinkingLevel, temperature, systemInstructions]);

  // If no access, show locked screen
  if (!hasAccess) {
    return <LockedResearchLab />;
  }

  // Auto-scroll for chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Auto-scroll for vision
  useEffect(() => {
    if (activeTab === 'vision') {
      visionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visionMessages, activeTab]);

  // Chat Mode handlers
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    logChatConfig('Dispatch request', {
      promptPreview: chatInput.slice(0, 200),
      conversationHistoryLength: chatMessages.length
    });

    try {
      const request: ChatRequest = {
        message: chatInput,
        model: selectedChatModel,
        thinkingLevel: supportsThinking ? thinkingLevel : undefined,
        systemInstructions: systemInstructions.trim() || undefined,
        temperature,
        conversationHistory: chatMessages.map(msg => ({
          role: msg.role,
          text: msg.text
        }))
      };

      const response = await sendChatMessage(request);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        thinking: response.thinking,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
      toastManager.success('Response received', {
        description: response.thinkingUsed ? 'Used thinking mode' : undefined,
        duration: 2000
      });
      logChatConfig('Response received', {
        thinkingUsed: response.thinkingUsed,
        responsePreview: response.text.slice(0, 200)
      });

    } catch (error: any) {
      toastManager.error('Chat failed', {
        description: error.message || 'Please try again',
        duration: 5000
      });
      console.error('Chat error:', error);
    } finally {
      setIsChatLoading(false);
    }
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

    const userMessage: VisionChatMessage = {
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

      const aiMessage: VisionChatMessage = {
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
            {activeTab === 'chat' && (
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => setChatMessages([])}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-xs uppercase tracking-wider text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-colors font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setShowChatSettings(!showChatSettings)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 text-xs uppercase tracking-wider text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors font-mono"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
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
                left: activeTab === 'chat' ? '0%' : '50%',
                width: '50%'
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('chat')}
              className={clsx(
                "flex-1 px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider transition-all border-2 relative overflow-hidden",
                activeTab === 'chat'
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:border-cyan-500/30 hover:text-slate-400'
              )}
            >
              {activeTab === 'chat' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"
                  animate={{ top: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" />
                CHAT MODE
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
        {activeTab === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
              <AnimatePresence>
                {chatMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700/50'} border-2 p-4 relative rounded-lg space-y-3`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold ${message.role === 'user' ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {message.role === 'user' ? 'YOU' : 'AI'}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      {message.thinking && (
                        <details className="bg-slate-800/50 rounded p-2 border border-emerald-500/30">
                          <summary className="cursor-pointer text-xs font-mono text-emerald-400 font-bold flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" />
                            💭 View Thinking Process
                          </summary>
                          <div className="mt-2 text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {message.thinking}
                          </div>
                        </details>
                      )}

                      <div className="text-slate-300 text-sm font-mono leading-relaxed">
                        <MarkdownRenderer content={message.text} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isChatLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-900/50 border-2 border-cyan-500/50 p-4 relative rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      <span className="text-cyan-400 font-mono text-sm font-bold">
                        THINKING...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {chatMessages.length === 0 && !isChatLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center gap-4"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-1">Chat Mode Ready</p>
                    <p className="text-slate-600 text-xs max-w-xs">
                      Ask anything - homework help, coding questions, explanations, and more
                    </p>
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Settings Panel */}
            <AnimatePresence>
              {showChatSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-shrink-0 border-t-2 border-cyan-500/30 bg-slate-900/90 backdrop-blur-sm overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    {/* Model Selection */}
                    <div>
                      <label className="text-xs text-cyan-400 font-mono uppercase mb-2 block">Model</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CHAT_MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedChatModel(model.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${selectedChatModel === model.id
                              ? `bg-${model.color}-500/20 border-${model.color}-500 text-${model.color}-300`
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                          >
                            <div className="text-sm font-bold font-mono">{model.name}</div>
                            <div className="text-xs opacity-70 mt-1">{model.badge}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Thinking Level */}
                    {supportsThinking && (
                      <div>
                        <label className="text-xs text-cyan-400 font-mono uppercase mb-2 block flex items-center gap-2">
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
                      </div>
                    )}

                    {/* System Instructions */}
                    <div>
                      <label className="text-xs text-cyan-400 font-mono uppercase mb-2 block">System Instructions (Optional)</label>
                      <textarea
                        value={systemInstructions}
                        onChange={(e) => setSystemInstructions(e.target.value)}
                        placeholder="E.g., 'Always respond in simple terms' or 'Focus on Python examples'"
                        className="w-full h-20 bg-slate-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono resize-none"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-cyan-400 font-mono uppercase">Temperature: {temperature}</label>
                        <span className="text-xs text-slate-500 font-mono">
                          {temperature < 0.4 ? 'Precise' : temperature < 0.8 ? 'Balanced' : 'Creative'}
                        </span>
                      </div>
                      {selectedChatModel.includes('gemini-3') && (
                        <div className="mb-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-300 font-mono">
                          ⚠️ Gemini 3 optimized for temperature 1.0
                        </div>
                      )}
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        disabled={selectedChatModel.includes('gemini-3')}
                        className="w-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat input area */}
            <div className="flex-shrink-0 border-t-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm p-4 relative z-10">
              <form onSubmit={handleChatSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isChatLoading}
                  className="flex-1 px-4 py-3 bg-slate-900/50 border-2 border-cyan-500/30 text-slate-300 font-mono text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600 transition-all rounded-lg"
                />

                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-6 py-3 bg-cyan-600 border-2 border-cyan-500 text-black hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
                >
                  {isChatLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      THINKING
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      SEND
                    </>
                  )}
                </button>
              </form>
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
                  className="bg-slate-900/50 border border-orange-500/30 text-orange-300 px-3 py-1 text-xs font-mono focus:outline-none focus:border-orange-500 transition-colors rounded"
                >
                  {VISION_MODELS.map(model => (
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
                {visionMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-orange-950/50 border-orange-500/50' : 'bg-slate-900/50 border-slate-700/50'} border-2 p-4 relative rounded-lg`}>
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
                  <div className="bg-slate-900/50 border-2 border-orange-500/50 p-4 relative rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      <span className="text-orange-400 font-mono text-sm font-bold">
                        ANALYZING...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={visionEndRef} />
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
                        className="w-32 h-32 object-cover border-2 border-orange-500/50 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-green-400" />
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
                          className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all rounded ${!isFormMode
                            ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                            : 'bg-transparent border-slate-700 text-slate-500 hover:border-orange-500/50'
                            }`}
                        >
                          <ImageIcon className="w-3 h-3 inline mr-1" />
                          GENERAL
                        </button>
                        <button
                          onClick={() => setIsFormMode(true)}
                          className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all rounded ${isFormMode
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-transparent border-slate-700 text-slate-500 hover:border-amber-500/50'
                            }`}
                        >
                          GOOGLE FORM
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="flex-shrink-0 p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors rounded"
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
                  className="px-4 py-3 bg-slate-900 border-2 border-orange-500/30 text-orange-400 hover:border-orange-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-sm font-bold rounded-lg"
                >
                  <Upload className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={visionInput}
                  onChange={(e) => setVisionInput(e.target.value)}
                  placeholder={uploadedImage ? "Enter your question... (optional)" : "Upload or paste an image first (Ctrl+V)"}
                  disabled={isAnalyzing || !uploadedImage}
                  className="flex-1 px-4 py-3 bg-slate-900/50 border-2 border-orange-500/30 text-slate-300 font-mono text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600 transition-all rounded-lg"
                />

                <button
                  type="submit"
                  disabled={isAnalyzing || !uploadedImage}
                  className="px-6 py-3 bg-orange-600 border-2 border-orange-500 text-black hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
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

      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
      `}</style>
    </div>
  );
};
