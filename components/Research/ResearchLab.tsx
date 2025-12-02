import React, { useState, useEffect, useRef } from 'react';
import { Upload, Send, X, Loader2, Image as ImageIcon, FileText, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { LockedResearchLab } from './LockedResearchLab';
import { useToast } from '../Shared/ToastManager';
import { analyzeImageWithVision, analyzeGoogleForm, VisionMessage } from '../../lib/ai/gemini';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: Date;
}

const MODEL_OPTIONS = [
  { id: 'gemini-2.0-flash-exp', name: 'Flash Experimental', badge: 'FAST', color: 'cyan', requiredAccess: 'flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'BALANCED', color: 'purple', requiredAccess: 'pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'VISION+', color: 'amber', requiredAccess: 'flash' },
  { id: 'gemini-exp-1206', name: 'Gemini Experimental', badge: 'NEXT-GEN', color: 'green', requiredAccess: 'orbit-x' },
];

export const ResearchLab: React.FC = () => {
  const { currentUser } = useOrbitStore();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash-exp');
  const [isFormMode, setIsFormMode] = useState(false);

  // Access control
  const hasAccess = currentUser?.can_customize_ai;
  const unlockedModels = currentUser?.unlocked_models || [];

  // Filter available models based on user access
  const availableModels = MODEL_OPTIONS.filter(model => {
    if (model.requiredAccess === 'flash') return unlockedModels.includes('flash');
    if (model.requiredAccess === 'pro') return unlockedModels.includes('pro');
    return false;
  });

  // If no access, show locked screen
  if (!hasAccess) {
    return <LockedResearchLab />;
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File too large', { description: 'Max file size is 4MB' });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      toast.success('Image uploaded', { description: file.name });
    };
    reader.readAsDataURL(file);
  };

  // Handle Ctrl+V paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          // Validate size
          if (blob.size > 4 * 1024 * 1024) {
            toast.error('Image too large', { description: 'Max file size is 4MB' });
            return;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setUploadedImage(base64);
            toast.success('Image pasted!', { description: 'Ready to analyze' });
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [toast]);

  // Handle message submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && !uploadedImage) || isAnalyzing) return;
    if (!uploadedImage) {
      toast.error('No image uploaded', { description: 'Please upload or paste an image first' });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input || (isFormMode ? 'Analyze this Google Form' : 'What do you see in this image?'),
      image: uploadedImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAnalyzing(true);

    try {
      // Build conversation history
      const history: VisionMessage[] = messages.map(msg => ({
        role: msg.role,
        text: msg.text,
        image: msg.image
      }));

      let response;

      // Use specialized form analyzer if in form mode
      if (isFormMode) {
        response = await analyzeGoogleForm(uploadedImage, selectedModel);
      } else {
        response = await analyzeImageWithVision(
          uploadedImage,
          input || 'What do you see in this image?',
          selectedModel,
          history
        );
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setUploadedImage(null);
      setIsFormMode(false);

      toast.success('Analysis complete', {
        description: `Processed with ${MODEL_OPTIONS.find(m => m.id === selectedModel)?.name}`,
        duration: 3000
      });

    } catch (error: any) {
      toast.error('Analysis failed', {
        description: error.message || 'Please try again',
        duration: 5000
      });
      console.error('Vision analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

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

      {/* Header with status bar */}
      <div className="flex-shrink-0 border-b-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm relative z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 font-mono text-xs tracking-wider">
                  SYSTEM ONLINE
                </span>
              </div>
              <div className="h-4 w-px bg-cyan-500/30" />
              <span className="text-cyan-400 font-mono text-xs">
                CLEARANCE: AI+
              </span>
            </div>
            <div className="flex items-center gap-2">
              {availableModels.map(model => (
                unlockedModels.includes(model.requiredAccess) && (
                  <div key={model.id} className={`px-2 py-0.5 text-[10px] font-mono font-bold bg-${model.color}-500/10 text-${model.color}-400 border border-${model.color}-500/30`}>
                    {model.badge}
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-3">
            <label className="text-slate-400 text-xs font-mono">MODEL:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900/50 border border-cyan-500/30 text-cyan-300 px-3 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700/50'} border-2 p-4 relative`}>
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current opacity-50" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current opacity-50" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current opacity-50" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current opacity-50" />

                {/* Message header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-mono font-bold ${message.role === 'user' ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {message.role === 'user' ? 'OPERATOR' : 'AI ANALYSIS'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {/* Image if present */}
                {message.image && (
                  <div className="mb-3">
                    <img
                      src={message.image}
                      alt="Uploaded"
                      className="max-w-full h-auto border border-cyan-500/30 rounded"
                    />
                  </div>
                )}

                {/* Message text */}
                <p className="text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {message.text}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Analyzing indicator */}
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

              {/* Scanning effect */}
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

      {/* Image preview area (if image uploaded) */}
      <AnimatePresence>
        {uploadedImage && !isAnalyzing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 border-t-2 border-cyan-500/30 bg-black/60 backdrop-blur-sm p-4 relative z-10"
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="w-32 h-32 object-cover border-2 border-cyan-500/50"
                />
                {/* Scanner overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"
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
                    className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all ${
                      !isFormMode
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-transparent border-slate-700 text-slate-500 hover:border-cyan-500/50'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    GENERAL
                  </button>
                  <button
                    onClick={() => setIsFormMode(true)}
                    className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-all ${
                      isFormMode
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                        : 'bg-transparent border-slate-700 text-slate-500 hover:border-orange-500/50'
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

      {/* Input area */}
      <div className="flex-shrink-0 border-t-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm p-4 relative z-10">
        <form onSubmit={handleSubmit} className="flex gap-3">
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
            className="px-4 py-3 bg-slate-900 border-2 border-cyan-500/30 text-cyan-400 hover:border-cyan-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-sm font-bold"
          >
            <Upload className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={uploadedImage ? "Enter your question... (optional)" : "Upload or paste an image first (Ctrl+V)"}
            disabled={isAnalyzing || !uploadedImage}
            className="flex-1 px-4 py-3 bg-slate-900/50 border-2 border-cyan-500/30 text-slate-300 font-mono text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600 transition-all"
          />

          <button
            type="submit"
            disabled={isAnalyzing || !uploadedImage}
            className="px-6 py-3 bg-cyan-600 border-2 border-cyan-500 text-black hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono font-bold text-sm flex items-center gap-2"
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

        {/* Hint text */}
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-600">
          <span>TIP: Paste images with Ctrl+V</span>
          <span>MAX SIZE: 4MB</span>
        </div>
      </div>

      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
      `}</style>
    </div>
  );
};
