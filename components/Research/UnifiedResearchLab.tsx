import React, { useState, useEffect, useRef } from 'react';
import { Upload, Send, X, Loader2, Image as ImageIcon, MessageSquare, Settings as SettingsIcon, Trash2, BrainCircuit, Sparkles, Share2, FolderOpen, Plus, Search, Zap, Globe, Sliders, FileText, ExternalLink, Copy, BookOpen, Crown, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { DynamicTextarea } from '../Shared/DynamicTextarea';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { LockedResearchLab } from './LockedResearchLab';
import { useToast } from '../Shared/ToastManager';
import { analyzeImageWithVision, analyzeGoogleForm, VisionMessage, sendChatMessage, ChatRequest } from '../../lib/ai/gemini';
import { runIntelQuery, IntelResult } from '../../lib/ai/intel';
import { improvePrompt, PromptMode } from '../../lib/ai/promptImprover';
import clsx from 'clsx';
import { MarkdownRenderer } from '../Social/MarkdownRenderer';
import { ConfirmModal } from '../Shared/ConfirmModal';

// ============================================================================
// TYPES
// ============================================================================
type ResearchTab = 'quick-chat' | 'deep-research' | 'intel-research' | 'vision-lab' | 'settings';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    thinking?: string;
    timestamp: Date;
}

interface ResearchTopic {
    id: string;
    name: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

interface IntelReport {
    id: string;
    title: string;
    bullets: Array<{ text: string; sourceIndex?: number }>;
    sources: Array<{ title: string; url: string; snippet: string }>;
    relatedConcepts: string[];
    essay?: string;
    depth: 'light' | 'standard' | 'deep' | 'max';
    essayEnabled: boolean;
    createdAt: Date;
}

interface VisionSession {
    id: string;
    name: string;
    imageData: string | null; // Base64 image
    messages: ChatMessage[];
    modelUsed: string;
    createdAt: Date;
    updatedAt: Date;
}

const DEPTH_OPTIONS = [
    { id: 'light' as const, label: 'Light', bullets: '3-5', color: 'cyan' },
    { id: 'standard' as const, label: 'Standard', bullets: '8-12', color: 'blue' },
    { id: 'deep' as const, label: 'Deep', bullets: '15-20', color: 'purple' },
    { id: 'max' as const, label: 'MAX/GOD MODE', bullets: '25+', color: 'amber', restricted: true },
];

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================
const ALL_MODELS = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        badge: 'FAST',
        color: 'cyan',
        tier: 1,
        permissionKey: 'flash', // maps to unlocked_models
        capabilities: { chat: true, vision: true, imageGen: false, web: true, thinking: true, thinkingDefault: false }
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        badge: 'BEST',
        color: 'purple',
        tier: 2,
        permissionKey: 'pro', // maps to unlocked_models
        capabilities: { chat: true, vision: true, imageGen: false, web: true, thinking: true, thinkingDefault: false }
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Exp',
        badge: 'EXPERIMENTAL',
        color: 'amber',
        tier: 1,
        permissionKey: 'flash', // shares permission with flash
        capabilities: { chat: true, vision: true, imageGen: false, web: true, thinking: false, thinkingDefault: false }
    },
    {
        id: 'gemini-3-pro',
        name: 'Gemini 3.0 Pro',
        badge: 'STABLE',
        color: 'teal',
        tier: 3,
        permissionKey: 'gemini-3-pro', // maps to unlocked_models
        capabilities: { chat: true, vision: true, imageGen: false, web: true, thinking: true, thinkingDefault: true }
    },
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3.0 Pro Preview',
        badge: 'BETA/MAX',
        color: 'emerald',
        tier: 3,
        permissionKey: 'gemini-3-pro', // shares permission with gemini-3-pro
        capabilities: { chat: true, vision: true, imageGen: false, web: true, thinking: true, thinkingDefault: true }
    },
];

// Helper to filter models based on user permissions
const getAvailableModels = (unlockedModels: string[] | undefined) => {
    if (!unlockedModels || unlockedModels.length === 0) return [];
    return ALL_MODELS.filter(m => unlockedModels.includes(m.permissionKey));
};

// ============================================================================
// CUSTOMIZATION PANEL COMPONENT
// ============================================================================
interface CustomizationPanelProps {
    availableModels: typeof ALL_MODELS; // Filtered models based on permissions
    selectedModel: string;
    setSelectedModel: (id: string) => void;
    thinkingEnabled: boolean;
    setThinkingEnabled: (v: boolean) => void;
    thinkingLevel: 'low' | 'medium' | 'high';
    setThinkingLevel: (v: 'low' | 'medium' | 'high') => void;
    webSearchEnabled: boolean;
    setWebSearchEnabled: (v: boolean) => void;
    temperature: number;
    setTemperature: (v: number) => void;
    systemInstructions?: string;
    setSystemInstructions?: (v: string) => void;
    showSystemInstructions?: boolean;
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
}

const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
    availableModels,
    selectedModel,
    setSelectedModel,
    thinkingEnabled,
    setThinkingEnabled,
    thinkingLevel,
    setThinkingLevel,
    webSearchEnabled,
    setWebSearchEnabled,
    temperature,
    setTemperature,
    systemInstructions,
    setSystemInstructions,
    showSystemInstructions = false,
    isExpanded,
    setIsExpanded
}) => {
    const currentModel = availableModels.find(m => m.id === selectedModel) || ALL_MODELS.find(m => m.id === selectedModel);

    return (
        <div className="border-t border-slate-800 bg-slate-900/50">
            {/* Toggle Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-wider">Customize</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{currentModel?.name}</span>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </motion.div>
                </div>
            </button>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-4 border-t border-slate-800">
                            {/* Model Selection */}
                            <div>
                                <label className="text-xs text-cyan-400 font-mono uppercase mb-2 block">Model</label>
                                {availableModels.length === 0 ? (
                                    <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-center">
                                        <p className="text-xs text-slate-500 font-mono">No models unlocked</p>
                                        <p className="text-[10px] text-slate-600 mt-1">Contact an admin to unlock models</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableModels.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setSelectedModel(model.id)}
                                                className={clsx(
                                                    "p-2 rounded-lg border-2 transition-all text-left text-xs",
                                                    selectedModel === model.id
                                                        ? `bg-${model.color}-500/20 border-${model.color}-500 text-${model.color}-300`
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                                )}
                                            >
                                                <div className="font-bold font-mono">{model.name}</div>
                                                <div className="opacity-70 mt-0.5">{model.badge}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Thinking Toggle + Level */}
                            {currentModel?.capabilities.thinking && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setThinkingEnabled(!thinkingEnabled)}
                                            className={clsx(
                                                "w-10 h-5 rounded-full transition-colors relative",
                                                thinkingEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                                thinkingEnabled ? 'left-5' : 'left-0.5'
                                            )} />
                                        </button>
                                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                            <BrainCircuit className="w-3 h-3" /> Thinking
                                        </span>
                                    </div>
                                    {thinkingEnabled && (
                                        <div className="flex gap-1">
                                            {(['low', 'medium', 'high'] as const).map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => setThinkingLevel(level)}
                                                    className={clsx(
                                                        "px-2 py-1 rounded text-[10px] font-mono uppercase",
                                                        thinkingLevel === level
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                                                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                                                    )}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Web Search Toggle */}
                            {currentModel?.capabilities.web && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                        className={clsx(
                                            "w-10 h-5 rounded-full transition-colors relative",
                                            webSearchEnabled ? 'bg-blue-500' : 'bg-slate-700'
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                            webSearchEnabled ? 'left-5' : 'left-0.5'
                                        )} />
                                    </button>
                                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> Web Search
                                    </span>
                                </div>
                            )}

                            {/* Temperature */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-slate-400 font-mono">Temperature: {temperature.toFixed(1)}</label>
                                    <span className="text-[10px] text-slate-600">
                                        {temperature < 0.4 ? 'Precise' : temperature < 0.8 ? 'Balanced' : 'Creative'}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500"
                                />
                            </div>

                            {/* System Instructions (optional) */}
                            {showSystemInstructions && setSystemInstructions && (
                                <div>
                                    <label className="text-xs text-cyan-400 font-mono uppercase mb-1 block">System Instructions</label>
                                    <textarea
                                        value={systemInstructions}
                                        onChange={(e) => setSystemInstructions(e.target.value)}
                                        placeholder="E.g., 'Always respond in simple terms'..."
                                        className="w-full h-16 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const UnifiedResearchLab: React.FC = () => {
    const { currentUser } = useOrbitStore();
    const toastManager = useToast();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<ResearchTab>('quick-chat');

    // Quick Chat state
    const [quickChatMessages, setQuickChatMessages] = useState<ChatMessage[]>([]);
    const [quickChatInput, setQuickChatInput] = useState('');
    const [quickChatLoading, setQuickChatLoading] = useState(false);
    const [quickChatExpanded, setQuickChatExpanded] = useState(false);
    const [quickChatModel, setQuickChatModel] = useState('gemini-2.5-flash');
    const [quickChatThinking, setQuickChatThinking] = useState(false);
    const [quickChatThinkingLevel, setQuickChatThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [quickChatWebSearch, setQuickChatWebSearch] = useState(false);
    const [quickChatTemp, setQuickChatTemp] = useState(1.0);
    const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);

    // Deep Research state
    const [topics, setTopics] = useState<ResearchTopic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [deepResearchInput, setDeepResearchInput] = useState('');
    const [deepResearchLoading, setDeepResearchLoading] = useState(false);
    const [deepResearchExpanded, setDeepResearchExpanded] = useState(false);
    const [deepResearchModel, setDeepResearchModel] = useState('gemini-3-pro-preview');
    const [deepResearchThinking, setDeepResearchThinking] = useState(true);
    const [deepResearchThinkingLevel, setDeepResearchThinkingLevel] = useState<'low' | 'medium' | 'high'>('high');
    const [deepResearchWebSearch, setDeepResearchWebSearch] = useState(true);
    const [deepResearchTemp, setDeepResearchTemp] = useState(1.0);
    const [deepResearchSystemInstructions, setDeepResearchSystemInstructions] = useState('');

    // Intel Research state
    const [intelReports, setIntelReports] = useState<IntelReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [intelQuery, setIntelQuery] = useState('');
    const [intelDepth, setIntelDepth] = useState<'light' | 'standard' | 'deep' | 'max'>('standard');
    const [intelEssayEnabled, setIntelEssayEnabled] = useState(false);
    const [intelModel, setIntelModel] = useState('gemini-3-pro-preview');
    const [intelLoading, setIntelLoading] = useState(false);
    const [intelWebSearch, setIntelWebSearch] = useState(true);
    const [intelThinking, setIntelThinking] = useState(true);
    const [intelThinkingLevel, setIntelThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [intelTemp, setIntelTemp] = useState(1.0);
    const [intelExpanded, setIntelExpanded] = useState(false);

    // Vision Lab state
    const [visionMessages, setVisionMessages] = useState<ChatMessage[]>([]);
    const [visionInput, setVisionInput] = useState('');
    const [visionImage, setVisionImage] = useState<string | null>(null);
    const [visionLoading, setVisionLoading] = useState(false);
    const [visionModel, setVisionModel] = useState('gemini-3-pro-preview');
    const [visionThinking, setVisionThinking] = useState(true);
    const [visionThinkingLevel, setVisionThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [visionExpanded, setVisionExpanded] = useState(false);
    const [visionTemp, setVisionTemp] = useState(1.0);
    const [isFormMode, setIsFormMode] = useState(false);

    // Vision Session Persistence state
    const [visionSessions, setVisionSessions] = useState<VisionSession[]>([]);
    const [selectedVisionSessionId, setSelectedVisionSessionId] = useState<string | null>(null);
    const [editingVisionSession, setEditingVisionSession] = useState<VisionSession | null>(null);
    const [editVisionSessionName, setEditVisionSessionName] = useState('');

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'topic' | 'report'; id: string | null; name: string }>({ isOpen: false, type: 'topic', id: null, name: '' });

    // Edit Topic Modal state
    const [editingTopic, setEditingTopic] = useState<ResearchTopic | null>(null);
    const [editTopicName, setEditTopicName] = useState('');

    // Default Settings state (persisted)
    const [defaultQuickChatModel, setDefaultQuickChatModel] = useState('gemini-2.5-flash');
    const [defaultDeepResearchModel, setDefaultDeepResearchModel] = useState('gemini-3-pro-preview');

    // Access control
    const hasAccess = currentUser?.can_customize_ai;

    // Compute available models based on user permissions
    const availableModels = getAvailableModels(currentUser?.unlocked_models);
    const hasMaxMode = currentUser?.unlocked_models?.includes('max-mode') || currentUser?.is_admin;

    // Load topics from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('research-topics');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setTopics(parsed.map((t: any) => ({
                    ...t,
                    createdAt: new Date(t.createdAt),
                    updatedAt: new Date(t.updatedAt),
                    messages: t.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
                })));
            } catch (e) {
                console.error('Failed to load topics:', e);
            }
        }
        // Load default models
        const savedDefaults = localStorage.getItem('research-defaults');
        if (savedDefaults) {
            try {
                const defaults = JSON.parse(savedDefaults);
                if (defaults.quickChatModel) {
                    setDefaultQuickChatModel(defaults.quickChatModel);
                    setQuickChatModel(defaults.quickChatModel);
                }
                if (defaults.deepResearchModel) {
                    setDefaultDeepResearchModel(defaults.deepResearchModel);
                    setDeepResearchModel(defaults.deepResearchModel);
                }
            } catch (e) {
                console.error('Failed to load defaults:', e);
            }
        }
    }, []);

    // Save topics to localStorage
    useEffect(() => {
        if (topics.length > 0) {
            localStorage.setItem('research-topics', JSON.stringify(topics));
        }
    }, [topics]);

    // Load vision sessions from Supabase
    useEffect(() => {
        const loadVisionSessions = async () => {
            if (!currentUser?.id) return;
            try {
                const { supabase } = await import('../../lib/supabase');
                const { data, error } = await supabase
                    .from('vision_sessions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('updated_at', { ascending: false });

                if (error) {
                    console.error('Failed to load vision sessions:', error);
                    return;
                }

                if (data) {
                    setVisionSessions(data.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        imageData: s.image_data,
                        messages: (s.messages || []).map((m: any) => ({
                            ...m,
                            timestamp: new Date(m.timestamp)
                        })),
                        modelUsed: s.model_used,
                        createdAt: new Date(s.created_at),
                        updatedAt: new Date(s.updated_at)
                    })));
                }
            } catch (e) {
                console.error('Error loading vision sessions:', e);
            }
        };
        loadVisionSessions();
    }, [currentUser?.id]);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [quickChatMessages, topics]);

    if (!hasAccess) {
        return <LockedResearchLab />;
    }

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleQuickChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickChatInput.trim() || quickChatLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: quickChatInput,
            timestamp: new Date()
        };

        setQuickChatMessages(prev => [...prev, userMessage]);
        setQuickChatInput('');
        setQuickChatLoading(true);

        try {
            const request: ChatRequest = {
                message: quickChatInput,
                model: quickChatModel,
                thinkingLevel: quickChatThinking ? quickChatThinkingLevel : undefined,
                temperature: quickChatTemp,
                webSearchEnabled: quickChatWebSearch, // ✨ Pass web search flag
                conversationHistory: quickChatMessages.map(msg => ({ role: msg.role, text: msg.text }))
            };

            const response = await sendChatMessage(request);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                thinking: response.thinking,
                timestamp: new Date()
            };

            setQuickChatMessages(prev => [...prev, aiMessage]);
            toastManager.success('Response received');
        } catch (error: any) {
            toastManager.error('Chat failed', { description: error.message });
        } finally {
            setQuickChatLoading(false);
        }
    };

    // Improve prompt using AI + web search
    const handleImprovePrompt = async (
        currentPrompt: string,
        setPrompt: (v: string) => void,
        mode: PromptMode,
        model?: string
    ) => {
        if (!currentPrompt.trim() || isImprovingPrompt) return;

        setIsImprovingPrompt(true);
        try {
            const result = await improvePrompt(currentPrompt, mode, model);
            setPrompt(result.improvedPrompt);

            if (result.changes.length > 0) {
                toastManager.success('Prompt improved', {
                    description: result.changes.join(', ')
                });
            }
        } catch (error: any) {
            toastManager.error('Failed to improve prompt');
        } finally {
            setIsImprovingPrompt(false);
        }
    };

    const createNewTopic = () => {
        const newTopic: ResearchTopic = {
            id: Date.now().toString(),
            name: `Research ${topics.length + 1}`,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setTopics(prev => [newTopic, ...prev]);
        setSelectedTopicId(newTopic.id);
    };

    const openEditTopic = (topic: ResearchTopic) => {
        setEditingTopic(topic);
        setEditTopicName(topic.name);
    };

    const saveTopicName = () => {
        if (!editingTopic || !editTopicName.trim()) return;
        setTopics(prev => prev.map(t =>
            t.id === editingTopic.id ? { ...t, name: editTopicName.trim(), updatedAt: new Date() } : t
        ));
        setEditingTopic(null);
        toastManager.success('Topic renamed');
    };

    const moveTopicUp = (index: number) => {
        if (index === 0) return;
        setTopics(prev => {
            const newTopics = [...prev];
            [newTopics[index - 1], newTopics[index]] = [newTopics[index], newTopics[index - 1]];
            return newTopics;
        });
    };

    const moveTopicDown = (index: number) => {
        if (index >= topics.length - 1) return;
        setTopics(prev => {
            const newTopics = [...prev];
            [newTopics[index], newTopics[index + 1]] = [newTopics[index + 1], newTopics[index]];
            return newTopics;
        });
    };

    const selectedTopic = topics.find(t => t.id === selectedTopicId);

    const handleDeepResearchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deepResearchInput.trim() || deepResearchLoading || !selectedTopicId) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: deepResearchInput,
            timestamp: new Date()
        };

        // Update topic with new message
        setTopics(prev => prev.map(t =>
            t.id === selectedTopicId
                ? { ...t, messages: [...t.messages, userMessage], updatedAt: new Date() }
                : t
        ));
        setDeepResearchInput('');
        setDeepResearchLoading(true);

        try {
            const request: ChatRequest = {
                message: deepResearchInput,
                model: deepResearchModel,
                thinkingLevel: deepResearchThinking ? deepResearchThinkingLevel : undefined,
                systemInstructions: deepResearchSystemInstructions || undefined,
                temperature: deepResearchTemp,
                webSearchEnabled: deepResearchWebSearch, // ✨ Pass web search flag
                conversationHistory: selectedTopic?.messages.map(msg => ({ role: msg.role, text: msg.text })) || []
            };

            const response = await sendChatMessage(request);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                thinking: response.thinking,
                timestamp: new Date()
            };

            setTopics(prev => prev.map(t =>
                t.id === selectedTopicId
                    ? { ...t, messages: [...t.messages, aiMessage], updatedAt: new Date() }
                    : t
            ));
            toastManager.success('Research updated');
        } catch (error: any) {
            toastManager.error('Research failed', { description: error.message });
        } finally {
            setDeepResearchLoading(false);
        }
    };

    // Intel Research handler
    const handleIntelSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!intelQuery.trim() || intelLoading) return;

        // Check MAX/GOD MODE restriction - requires 'max-mode' permission
        const hasMaxMode = currentUser?.unlocked_models?.includes('max-mode') || currentUser?.is_admin;
        if (intelDepth === 'max' && !hasMaxMode) {
            toastManager.error('Access Denied', { description: 'MAX/GOD MODE requires special permission.' });
            return;
        }

        setIntelLoading(true);

        try {
            const depthBullets = { light: 5, standard: 12, deep: 20, max: 30 };

            const result = await runIntelQuery({
                prompt: intelQuery,
                instructions: `Generate a comprehensive research report with ${depthBullets[intelDepth]} bullet points. ${intelEssayEnabled ? 'Also generate a well-structured MLA-formatted essay.' : ''} Use proper MLA citations for all sources.`,
                model: intelModel.includes('3-pro') ? 'gemini-3-pro' : 'pro',
                researchMode: true,
                depth: depthBullets[intelDepth],
                thinkingEnabled: intelThinking,
                thinkingLevel: intelThinkingLevel,
                webSearch: intelWebSearch
            });

            const newReport: IntelReport = {
                id: Date.now().toString(),
                title: intelQuery,
                bullets: result.summary_bullets.map((text, i) => ({ text, sourceIndex: i < result.sources.length ? i : undefined })),
                sources: result.sources,
                relatedConcepts: result.related_concepts,
                essay: intelEssayEnabled ? result.essay : undefined,
                depth: intelDepth,
                essayEnabled: intelEssayEnabled,
                createdAt: new Date()
            };

            setIntelReports(prev => [newReport, ...prev]);
            setSelectedReportId(newReport.id);
            setIntelQuery('');
            toastManager.success('Research complete!');
        } catch (error: any) {
            toastManager.error('Research failed', { description: error.message });
        } finally {
            setIntelLoading(false);
        }
    };

    const selectedReport = intelReports.find(r => r.id === selectedReportId);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toastManager.success('Copied to clipboard');
    };

    // Vision Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVisionImage(reader.result as string);
                setVisionMessages([]); // Start fresh context
                // Auto-set the prompt focus
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVisionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Allow follow-up if we have messages (even without new image)
        const hasExistingContext = visionMessages.length > 0;
        if (!visionInput.trim() || visionLoading) return;
        if (!visionImage && !hasExistingContext) {
            toastManager.error('Please upload an image first');
            return;
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: visionInput,
            timestamp: new Date()
        };

        setVisionMessages(prev => [...prev, userMessage]);
        setVisionInput('');
        setVisionLoading(true);

        try {
            // Note: analyzeImageWithVision signature is (image, prompt, model, history)
            // It doesn't support thinkingConfig directly in arguments currently unless updated.
            // But gemini.ts analyzeImageWithVision DOES support thinkingConfig internally based on model name.

            let response;
            // Build history including images from previous messages
            const historyWithImage = visionMessages.map(msg => ({ role: msg.role, text: msg.text }));

            if (isFormMode && visionImage) {
                response = await analyzeGoogleForm(visionImage, visionModel);
            } else {
                // Pass the current image for first message, or rely on history for follow-ups
                response = await analyzeImageWithVision(
                    visionImage, // Will be null on follow-ups, but history has context
                    userMessage.text,
                    visionModel,
                    historyWithImage
                );
            }

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                thinking: undefined, // vision response currently just returns { text }
                timestamp: new Date()
            };

            const updatedMessages = [...visionMessages, userMessage, aiMessage];
            setVisionMessages(updatedMessages);
            if (isFormMode) setIsFormMode(false); // Reset form mode after analysis

            // Auto-save to Supabase if we have a current user
            if (currentUser?.id) {
                try {
                    const { supabase } = await import('../../lib/supabase');

                    if (selectedVisionSessionId) {
                        // Update existing session
                        await supabase
                            .from('vision_sessions')
                            .update({
                                messages: updatedMessages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', selectedVisionSessionId);
                    } else if (visionImage) {
                        // Create new session on first save
                        const { data: newSession } = await supabase
                            .from('vision_sessions')
                            .insert({
                                user_id: currentUser.id,
                                name: `Analysis ${new Date().toLocaleDateString()}`,
                                image_data: visionImage,
                                messages: updatedMessages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
                                model_used: visionModel
                            })
                            .select()
                            .single();

                        if (newSession) {
                            setSelectedVisionSessionId(newSession.id);
                            setVisionSessions(prev => [{
                                id: newSession.id,
                                name: newSession.name,
                                imageData: newSession.image_data,
                                messages: updatedMessages,
                                modelUsed: newSession.model_used,
                                createdAt: new Date(newSession.created_at),
                                updatedAt: new Date(newSession.updated_at)
                            }, ...prev]);
                        }
                    }
                } catch (saveError) {
                    console.error('Failed to save vision session:', saveError);
                }
            }

            toastManager.success('Analysis complete');
        } catch (error: any) {
            toastManager.error('Vision analysis failed', { description: error.message });
        } finally {
            setVisionLoading(false);
        }
    };

    const clearVision = () => {
        setVisionImage(null);
        setVisionMessages([]);
        setVisionInput('');
        setSelectedVisionSessionId(null);
    };

    // Load a saved vision session
    const loadVisionSession = (session: VisionSession) => {
        setSelectedVisionSessionId(session.id);
        setVisionImage(session.imageData);
        setVisionMessages(session.messages);
        setVisionModel(session.modelUsed);
        setVisionInput('');
        toastManager.success(`Loaded "${session.name}"`);
    };

    // Delete a vision session
    const deleteVisionSession = async (sessionId: string) => {
        if (!currentUser?.id) return;
        try {
            const { supabase } = await import('../../lib/supabase');
            await supabase.from('vision_sessions').delete().eq('id', sessionId);
            setVisionSessions(prev => prev.filter(s => s.id !== sessionId));
            if (selectedVisionSessionId === sessionId) {
                clearVision();
            }
            toastManager.success('Session deleted');
        } catch (error) {
            console.error('Failed to delete session:', error);
            toastManager.error('Failed to delete session');
        }
    };

    // Rename a vision session
    const saveVisionSessionName = async () => {
        if (!editingVisionSession || !editVisionSessionName.trim()) return;
        try {
            const { supabase } = await import('../../lib/supabase');
            await supabase
                .from('vision_sessions')
                .update({ name: editVisionSessionName.trim() })
                .eq('id', editingVisionSession.id);
            setVisionSessions(prev => prev.map(s =>
                s.id === editingVisionSession.id ? { ...s, name: editVisionSessionName.trim() } : s
            ));
            setEditingVisionSession(null);
            toastManager.success('Session renamed');
        } catch (error) {
            console.error('Failed to rename session:', error);
            toastManager.error('Failed to rename session');
        }
    };

    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-black to-slate-950 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Header with Tabs */}
            <div className="flex-shrink-0 border-b-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm relative z-10">
                <div className="px-4 py-3">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-green-400 font-mono text-xs tracking-wider font-bold">RESEARCH LAB 2.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1">
                        {[
                            { id: 'quick-chat' as const, label: 'Quick', icon: <Zap className="w-4 h-4" /> },
                            { id: 'deep-research' as const, label: 'Deep', icon: <FolderOpen className="w-4 h-4" /> },
                            { id: 'intel-research' as const, label: 'Intel', icon: <BookOpen className="w-4 h-4" /> },
                            { id: 'vision-lab' as const, label: 'VISION LAB', icon: <ImageIcon className="w-4 h-4" /> },
                            { id: 'settings' as const, label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex-1 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-2",
                                    activeTab === tab.id
                                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                                        : 'bg-transparent border-slate-800 text-slate-500 hover:border-cyan-500/30'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* ========== QUICK CHAT TAB ========== */}
                    {activeTab === 'quick-chat' && (
                        <motion.div
                            key="quick-chat"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {quickChatMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                                            <Zap className="w-10 h-10 text-cyan-500/50" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-1">Quick Chat Ready</p>
                                            <p className="text-slate-600 text-xs max-w-xs">Fast answers without persistence. Great for quick questions.</p>
                                        </div>
                                    </div>
                                )}
                                {quickChatMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={clsx(
                                            "max-w-[80%] p-4 rounded-lg border-2",
                                            msg.role === 'user' ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700/50'
                                        )}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={clsx("text-xs font-mono font-bold", msg.role === 'user' ? 'text-cyan-400' : 'text-slate-400')}>
                                                    {msg.role === 'user' ? 'YOU' : 'AI'}
                                                </span>
                                                <span className="text-[10px] text-slate-600 font-mono">{msg.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                            {msg.thinking && (
                                                <details className="bg-slate-800/50 rounded p-2 border border-emerald-500/30 mb-2">
                                                    <summary className="cursor-pointer text-xs font-mono text-emerald-400 font-bold flex items-center gap-2">
                                                        <BrainCircuit className="w-3 h-3" /> View Thinking
                                                    </summary>
                                                    <div className="mt-2 text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                        {msg.thinking}
                                                    </div>
                                                </details>
                                            )}
                                            <div className="text-slate-300 text-sm font-mono leading-relaxed">
                                                <MarkdownRenderer content={msg.text} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {quickChatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-900/50 border-2 border-cyan-500/50 p-4 rounded-lg flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                                            <span className="text-cyan-400 font-mono text-sm font-bold">THINKING...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Customization Panel */}
                            <CustomizationPanel
                                availableModels={availableModels}
                                selectedModel={quickChatModel}
                                setSelectedModel={setQuickChatModel}
                                thinkingEnabled={quickChatThinking}
                                setThinkingEnabled={setQuickChatThinking}
                                thinkingLevel={quickChatThinkingLevel}
                                setThinkingLevel={setQuickChatThinkingLevel}
                                webSearchEnabled={quickChatWebSearch}
                                setWebSearchEnabled={setQuickChatWebSearch}
                                temperature={quickChatTemp}
                                setTemperature={setQuickChatTemp}
                                isExpanded={quickChatExpanded}
                                setIsExpanded={setQuickChatExpanded}
                            />

                            {/* Input */}
                            <div className="flex-shrink-0 border-t-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm p-4">
                                <form onSubmit={handleQuickChatSubmit} className="flex gap-3 items-end">
                                    <div className="flex-1 bg-slate-900/50 border-2 border-cyan-500/30 rounded-lg focus-within:border-cyan-500 transition-colors">
                                        <DynamicTextarea
                                            value={quickChatInput}
                                            onChange={(e) => setQuickChatInput(e.target.value)}
                                            onSubmit={() => handleQuickChatSubmit({ preventDefault: () => { } } as any)}
                                            placeholder="Ask me anything..."
                                            disabled={quickChatLoading}
                                            className="w-full px-4 py-3 bg-transparent border-none text-slate-300 font-mono text-sm focus:outline-none disabled:opacity-50 placeholder:text-slate-600"
                                            maxHeight={200}
                                        />
                                    </div>
                                    {/* Magic Wand - Improve Prompt */}
                                    <button
                                        type="button"
                                        onClick={() => handleImprovePrompt(quickChatInput, setQuickChatInput, 'chat', quickChatModel)}
                                        disabled={isImprovingPrompt || !quickChatInput.trim() || quickChatLoading}
                                        title="Enhance your prompt using AI best practices (uses credits)"
                                        className="px-3 py-3 bg-purple-600/80 border-2 border-purple-500/50 text-white hover:bg-purple-500 disabled:opacity-30 font-mono font-bold text-sm flex items-center gap-1 rounded-lg transition-colors group relative"
                                    >
                                        {isImprovingPrompt ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        {/* Subtle tooltip */}
                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-purple-300 px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            ✨ Uses Flash credits
                                        </span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={quickChatLoading || !quickChatInput.trim()}
                                        className="px-6 py-3 bg-cyan-600 border-2 border-cyan-500 text-black hover:bg-cyan-500 disabled:opacity-50 font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
                                    >
                                        {quickChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        SEND
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== DEEP RESEARCH TAB ========== */}
                    {activeTab === 'deep-research' && (
                        <motion.div
                            key="deep-research"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 flex overflow-hidden"
                        >
                            {/* Sidebar */}
                            <div className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
                                <div className="p-3 border-b border-slate-800">
                                    <button
                                        onClick={createNewTopic}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> New Topic
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {topics.length === 0 && (
                                        <p className="text-slate-600 text-xs text-center py-4 font-mono">No topics yet</p>
                                    )}
                                    {topics.map((topic, index) => (
                                        <div
                                            key={topic.id}
                                            className={clsx(
                                                "w-full p-2 rounded-lg text-left text-xs font-mono transition-colors flex items-start gap-1 group",
                                                selectedTopicId === topic.id
                                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                                    : 'bg-slate-800/50 border border-transparent text-slate-400 hover:border-slate-700'
                                            )}
                                        >
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => moveTopicUp(index)}
                                                    disabled={index === 0}
                                                    className="p-0.5 text-slate-500 hover:text-emerald-400 disabled:opacity-30"
                                                    title="Move up"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveTopicDown(index)}
                                                    disabled={index === topics.length - 1}
                                                    className="p-0.5 text-slate-500 hover:text-emerald-400 disabled:opacity-30"
                                                    title="Move down"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Topic Name */}
                                            <button
                                                onClick={() => setSelectedTopicId(topic.id)}
                                                className="flex-1 text-left"
                                            >
                                                <div className="font-bold truncate">{topic.name}</div>
                                                <div className="text-[10px] text-slate-600 mt-0.5">{topic.messages.length} messages</div>
                                            </button>

                                            {/* Action Buttons */}
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditTopic(topic);
                                                    }}
                                                    className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded"
                                                    title="Rename topic"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm({ isOpen: true, type: 'topic', id: topic.id, name: topic.name });
                                                    }}
                                                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                                                    title="Delete topic"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Chat Area */}
                            <div className="flex-1 flex flex-col">
                                {!selectedTopicId ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-500 font-mono text-sm">Select or create a topic to start</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {selectedTopic?.messages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={clsx(
                                                        "max-w-[80%] p-4 rounded-lg border-2",
                                                        msg.role === 'user' ? 'bg-emerald-950/50 border-emerald-500/50' : 'bg-slate-900/50 border-slate-700/50'
                                                    )}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={clsx("text-xs font-mono font-bold", msg.role === 'user' ? 'text-emerald-400' : 'text-slate-400')}>
                                                                {msg.role === 'user' ? 'YOU' : 'AI'}
                                                            </span>
                                                        </div>
                                                        {msg.thinking && (
                                                            <details className="bg-slate-800/50 rounded p-2 border border-emerald-500/30 mb-2">
                                                                <summary className="cursor-pointer text-xs font-mono text-emerald-400">View Thinking</summary>
                                                                <div className="mt-2 text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{msg.thinking}</div>
                                                            </details>
                                                        )}
                                                        <div className="text-slate-300 text-sm font-mono">
                                                            <MarkdownRenderer content={msg.text} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {deepResearchLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-slate-900/50 border-2 border-emerald-500/50 p-4 rounded-lg flex items-center gap-3">
                                                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                                        <span className="text-emerald-400 font-mono text-sm font-bold">RESEARCHING...</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Customization Panel */}
                                        <CustomizationPanel
                                            availableModels={availableModels}
                                            selectedModel={deepResearchModel}
                                            setSelectedModel={setDeepResearchModel}
                                            thinkingEnabled={deepResearchThinking}
                                            setThinkingEnabled={setDeepResearchThinking}
                                            thinkingLevel={deepResearchThinkingLevel}
                                            setThinkingLevel={setDeepResearchThinkingLevel}
                                            webSearchEnabled={deepResearchWebSearch}
                                            setWebSearchEnabled={setDeepResearchWebSearch}
                                            temperature={deepResearchTemp}
                                            setTemperature={setDeepResearchTemp}
                                            systemInstructions={deepResearchSystemInstructions}
                                            setSystemInstructions={setDeepResearchSystemInstructions}
                                            showSystemInstructions={true}
                                            isExpanded={deepResearchExpanded}
                                            setIsExpanded={setDeepResearchExpanded}
                                        />

                                        {/* Input */}
                                        <div className="flex-shrink-0 border-t-2 border-emerald-500/30 bg-black/40 backdrop-blur-sm p-4">
                                            <form onSubmit={handleDeepResearchSubmit} className="flex gap-3 items-end">
                                                <div className="flex-1 bg-slate-900/50 border-2 border-emerald-500/30 rounded-lg focus-within:border-emerald-500 transition-colors">
                                                    <DynamicTextarea
                                                        value={deepResearchInput}
                                                        onChange={(e) => setDeepResearchInput(e.target.value)}
                                                        onSubmit={() => handleDeepResearchSubmit({ preventDefault: () => { } } as any)}
                                                        placeholder="Continue your research..."
                                                        disabled={deepResearchLoading}
                                                        className="w-full px-4 py-3 bg-transparent border-none text-slate-300 font-mono text-sm focus:outline-none disabled:opacity-50 placeholder:text-slate-600"
                                                        maxHeight={200}
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={deepResearchLoading || !deepResearchInput.trim()}
                                                    className="px-6 py-3 bg-emerald-600 border-2 border-emerald-500 text-black hover:bg-emerald-500 disabled:opacity-50 font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
                                                >
                                                    {deepResearchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                    SEND
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ========== INTEL RESEARCH TAB ========== */}
                    {activeTab === 'intel-research' && (
                        <motion.div
                            key="intel-research"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 flex overflow-hidden"
                        >
                            {/* Sidebar - Saved Reports */}
                            <div className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
                                <div className="p-3 border-b border-slate-800">
                                    <div className="text-xs text-amber-400 font-mono uppercase font-bold flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Saved Reports
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {intelReports.length === 0 && (
                                        <p className="text-slate-600 text-xs text-center py-4 font-mono">No reports yet</p>
                                    )}
                                    {intelReports.map(report => (
                                        <div
                                            key={report.id}
                                            className={clsx(
                                                "w-full p-2 rounded-lg text-left text-xs font-mono transition-colors flex items-start gap-2 group cursor-pointer",
                                                selectedReportId === report.id
                                                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                                                    : 'bg-slate-800/50 border border-transparent text-slate-400 hover:border-slate-700'
                                            )}
                                            onClick={() => setSelectedReportId(report.id)}
                                        >
                                            <div className="flex-1">
                                                <div className="font-bold truncate">{report.title}</div>
                                                <div className="text-[10px] text-slate-600 mt-0.5">{report.bullets.length} points • {report.depth}</div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirm({ isOpen: true, type: 'report', id: report.id, name: report.title });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 rounded"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Panel */}
                            <div className="flex-1 flex flex-col">
                                {/* Input Form */}
                                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                                    <form onSubmit={handleIntelSubmit} className="space-y-4">
                                        {/* Customization Panel */}
                                        <div className="mb-4 rounded-lg overflow-hidden border border-slate-800">
                                            <CustomizationPanel
                                                availableModels={availableModels}
                                                selectedModel={intelModel}
                                                setSelectedModel={setIntelModel}
                                                thinkingEnabled={intelThinking}
                                                setThinkingEnabled={setIntelThinking}
                                                thinkingLevel={intelThinkingLevel}
                                                setThinkingLevel={setIntelThinkingLevel}
                                                webSearchEnabled={intelWebSearch}
                                                setWebSearchEnabled={setIntelWebSearch}
                                                temperature={intelTemp}
                                                setTemperature={setIntelTemp}
                                                isExpanded={intelExpanded}
                                                setIsExpanded={setIntelExpanded}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-amber-400 font-mono uppercase mb-1 block">Research Topic</label>
                                            <textarea
                                                value={intelQuery}
                                                onChange={(e) => setIntelQuery(e.target.value)}
                                                placeholder="Enter a topic or question for structured research..."
                                                disabled={intelLoading}
                                                className="w-full h-20 px-4 py-3 bg-slate-900/50 border-2 border-amber-500/30 text-slate-300 font-mono text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder:text-slate-600 rounded-lg resize-none"
                                            />
                                        </div>

                                        {/* Options Row */}
                                        <div className="flex flex-wrap gap-4 items-center">
                                            {/* Depth Selector */}
                                            <div className="flex gap-1">
                                                {DEPTH_OPTIONS.map(opt => {
                                                    const isDisabled = opt.restricted && !hasMaxMode;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => !isDisabled && setIntelDepth(opt.id)}
                                                            disabled={isDisabled}
                                                            className={clsx(
                                                                "px-3 py-1.5 rounded text-xs font-mono transition-all",
                                                                intelDepth === opt.id
                                                                    ? `bg-${opt.color}-500/20 text-${opt.color}-300 border border-${opt.color}-500`
                                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500',
                                                                isDisabled && 'opacity-50 cursor-not-allowed'
                                                            )}
                                                            title={opt.restricted ? 'Admin only' : `${opt.bullets} bullets`}
                                                        >
                                                            {opt.restricted && <Crown className="w-3 h-3 inline mr-1" />}
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Essay Toggle */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIntelEssayEnabled(!intelEssayEnabled)}
                                                    className={clsx(
                                                        "w-10 h-5 rounded-full transition-colors relative",
                                                        intelEssayEnabled ? 'bg-purple-500' : 'bg-slate-700'
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                                        intelEssayEnabled ? 'left-5' : 'left-0.5'
                                                    )} />
                                                </button>
                                                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> MLA Essay
                                                </span>
                                            </div>

                                            {/* Submit */}
                                            <button
                                                type="submit"
                                                disabled={intelLoading || !intelQuery.trim()}
                                                className="ml-auto px-6 py-2 bg-amber-600 border-2 border-amber-500 text-black hover:bg-amber-500 disabled:opacity-50 font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
                                            >
                                                {intelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                                RESEARCH
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Results */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {!selectedReport && !intelLoading && (
                                        <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                                                <BookOpen className="w-10 h-10 text-amber-500/50" />
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-mono text-sm">Enter a topic above to generate structured research</p>
                                            </div>
                                        </div>
                                    )}

                                    {intelLoading && (
                                        <div className="flex flex-col items-center justify-center h-full gap-4">
                                            <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                                            <p className="text-amber-400 font-mono text-sm">Researching...</p>
                                        </div>
                                    )}

                                    {selectedReport && !intelLoading && (
                                        <div className="space-y-6">
                                            {/* Title */}
                                            <div className="flex items-start justify-between">
                                                <h2 className="text-lg font-bold text-white font-mono">{selectedReport.title}</h2>
                                                <span className={`text-xs px-2 py-1 rounded font-mono bg-${DEPTH_OPTIONS.find(d => d.id === selectedReport.depth)?.color || 'slate'}-500/20 text-${DEPTH_OPTIONS.find(d => d.id === selectedReport.depth)?.color || 'slate'}-300`}>
                                                    {selectedReport.depth.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Bullets */}
                                            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                                <h3 className="text-sm font-mono font-bold text-amber-400 mb-3">Key Findings</h3>
                                                <ul className="space-y-2">
                                                    {selectedReport.bullets.map((bullet, i) => (
                                                        <li key={i} className="flex gap-2 text-sm text-slate-300 font-mono">
                                                            <span className="text-amber-500">•</span>
                                                            <span>{bullet.text}</span>
                                                            {bullet.sourceIndex !== undefined && (
                                                                <span className="text-cyan-400 text-xs">[{bullet.sourceIndex + 1}]</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Sources */}
                                            {selectedReport.sources.length > 0 && (
                                                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                                    <h3 className="text-sm font-mono font-bold text-cyan-400 mb-3">📚 Sources (MLA)</h3>
                                                    <div className="space-y-2">
                                                        {selectedReport.sources.map((source, i) => (
                                                            <div key={i} className="flex items-start gap-2 text-xs font-mono p-2 bg-slate-800/50 rounded">
                                                                <span className="text-cyan-400 font-bold">[{i + 1}]</span>
                                                                <div className="flex-1">
                                                                    <p className="text-slate-300 font-medium">{source.title}</p>
                                                                    <p className="text-slate-500 text-[10px] mt-0.5">{source.snippet}</p>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <a
                                                                        href={source.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded"
                                                                        title="Open link"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => copyToClipboard(source.url)}
                                                                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                                                        title="Copy URL"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Essay */}
                                            {selectedReport.essay && (
                                                <div className="bg-slate-900/50 border border-purple-700/50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-sm font-mono font-bold text-purple-400">📝 MLA Essay</h3>
                                                        <button
                                                            onClick={() => copyToClipboard(selectedReport.essay || '')}
                                                            className="text-xs text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1"
                                                        >
                                                            <Copy className="w-3 h-3" /> Copy
                                                        </button>
                                                    </div>
                                                    <div className="prose prose-invert prose-sm max-w-none font-mono text-slate-300">
                                                        <MarkdownRenderer content={selectedReport.essay} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Related Concepts */}
                                            {selectedReport.relatedConcepts.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedReport.relatedConcepts.map((concept, i) => (
                                                        <span key={i} className="px-2 py-1 bg-slate-800 text-slate-400 text-xs font-mono rounded">
                                                            {concept}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== VISION LAB TAB ========== */}
                    {activeTab === 'vision-lab' && (
                        <motion.div
                            key="vision-lab"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {!visionImage && visionMessages.length === 0 ? (
                                    <div className="flex h-full gap-4">
                                        {/* Saved Sessions Sidebar */}
                                        {visionSessions.length > 0 && (
                                            <div className="w-64 flex-shrink-0 border-r border-slate-800 pr-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Saved Sessions</h4>
                                                </div>
                                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                                    {visionSessions.map(session => (
                                                        <div
                                                            key={session.id}
                                                            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/30 transition-colors cursor-pointer group"
                                                            onClick={() => loadVisionSession(session)}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-mono text-slate-300 truncate">{session.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{session.messages.length} messages</p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteVisionSession(session.id); }}
                                                                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Upload Area */}
                                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                                            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700 mb-4">
                                                <ImageIcon className="w-10 h-10 text-slate-500" />
                                            </div>
                                            <h3 className="text-slate-300 font-bold font-mono text-lg mb-2">UPLOAD SOURCE IMAGE</h3>
                                            <p className="text-slate-500 text-sm font-mono mb-6">Analyze images with Gemini 3 Vision</p>
                                            <label className="cursor-pointer px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold rounded-lg transition-colors flex items-center gap-2">
                                                <Upload className="w-5 h-5" />
                                                SELECT IMAGE
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full gap-4">
                                        {/* Image Preview & Chat */}
                                        <div className="flex-1 overflow-y-auto space-y-4">
                                            <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50 p-2">
                                                <img src={visionImage} alt="Analysis Target" className="max-h-64 object-contain rounded-lg mx-auto" />
                                                <button
                                                    onClick={clearVision}
                                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Messages */}
                                            {visionMessages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={clsx(
                                                        "max-w-[80%] p-4 rounded-lg border-2",
                                                        msg.role === 'user' ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700/50'
                                                    )}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={clsx("text-xs font-mono font-bold", msg.role === 'user' ? 'text-cyan-400' : 'text-slate-400')}>
                                                                {msg.role === 'user' ? 'YOU' : 'AI'}
                                                            </span>
                                                        </div>
                                                        <div className="text-slate-300 text-sm font-mono leading-relaxed">
                                                            <MarkdownRenderer content={msg.text} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {visionLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-slate-900/50 border-2 border-cyan-500/50 p-4 rounded-lg flex items-center gap-3">
                                                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                                                        <span className="text-cyan-400 font-mono text-sm font-bold">ANALYZING VISUAL DATA...</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Controls */}
                                        <div className="flex-shrink-0 space-y-4">
                                            <CustomizationPanel
                                                availableModels={availableModels.filter(m => m.capabilities.vision)}
                                                selectedModel={visionModel}
                                                setSelectedModel={setVisionModel}
                                                thinkingEnabled={visionThinking}
                                                setThinkingEnabled={setVisionThinking}
                                                thinkingLevel={visionThinkingLevel}
                                                setThinkingLevel={setVisionThinkingLevel}
                                                webSearchEnabled={false}
                                                setWebSearchEnabled={() => { }}
                                                temperature={visionTemp}
                                                setTemperature={setVisionTemp}
                                                isExpanded={visionExpanded}
                                                setIsExpanded={setVisionExpanded}
                                            />

                                            {/* Google Form Toggle */}
                                            <div className="flex items-center gap-2 px-2">
                                                <button
                                                    onClick={() => setIsFormMode(!isFormMode)}
                                                    className={clsx(
                                                        "text-xs font-mono font-bold uppercase flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                                                        isFormMode
                                                            ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                                            : "bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500"
                                                    )}
                                                >
                                                    <FileText className={clsx("w-3 h-3", isFormMode && "text-purple-400")} />
                                                    Google Form Mode
                                                </button>
                                                {isFormMode && <span className="text-[10px] text-purple-400 font-mono animate-pulse">Specialized for Q&A extraction</span>}
                                            </div>

                                            <div className="p-4 border-t-2 border-cyan-500/30 bg-black/40 backdrop-blur-sm rounded-t-xl">
                                                <form onSubmit={handleVisionSubmit} className="flex gap-3 items-end">
                                                    <div className="flex-1 bg-slate-900/50 border-2 border-cyan-500/30 rounded-lg focus-within:border-cyan-500 transition-colors">
                                                        <DynamicTextarea
                                                            value={visionInput}
                                                            onChange={(e) => setVisionInput(e.target.value)}
                                                            onSubmit={() => handleVisionSubmit({ preventDefault: () => { } } as any)}
                                                            placeholder={visionMessages.length > 0 ? "Ask a follow-up question..." : "Ask something about this image..."}
                                                            disabled={visionLoading}
                                                            className="w-full px-4 py-3 bg-transparent border-none text-slate-300 font-mono text-sm focus:outline-none disabled:opacity-50 placeholder:text-slate-600"
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={visionLoading || !visionInput.trim()}
                                                        className="px-6 py-3 bg-cyan-600 border-2 border-cyan-500 text-black hover:bg-cyan-500 disabled:opacity-50 font-mono font-bold text-sm flex items-center gap-2 rounded-lg"
                                                    >
                                                        {visionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                        ANALYZE
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ========== SETTINGS TAB ========== */}
                    {activeTab === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 overflow-y-auto p-6"
                        >
                            <h2 className="text-lg font-mono font-bold text-white mb-6">Default Model Settings</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Quick Chat Default */}
                                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                                    <label className="text-xs text-cyan-400 font-mono uppercase mb-2 block">Quick Chat Default</label>
                                    <select
                                        value={defaultQuickChatModel}
                                        onChange={(e) => {
                                            setDefaultQuickChatModel(e.target.value);
                                            localStorage.setItem('research-defaults', JSON.stringify({
                                                quickChatModel: e.target.value,
                                                deepResearchModel: defaultDeepResearchModel
                                            }));
                                        }}
                                        className="w-full bg-slate-800 border border-cyan-500/30 text-slate-200 px-3 py-2 text-sm font-mono rounded focus:outline-none focus:border-cyan-500"
                                    >
                                        {ALL_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Deep Research Default */}
                                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                                    <label className="text-xs text-emerald-400 font-mono uppercase mb-2 block">Deep Research Default</label>
                                    <select
                                        value={defaultDeepResearchModel}
                                        onChange={(e) => {
                                            setDefaultDeepResearchModel(e.target.value);
                                            localStorage.setItem('research-defaults', JSON.stringify({
                                                quickChatModel: defaultQuickChatModel,
                                                deepResearchModel: e.target.value
                                            }));
                                        }}
                                        className="w-full bg-slate-800 border border-emerald-500/30 text-slate-200 px-3 py-2 text-sm font-mono rounded focus:outline-none focus:border-emerald-500"
                                    >
                                        {ALL_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <h2 className="text-lg font-mono font-bold text-white mb-6">Model Capabilities Matrix</h2>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-400">Model</th>
                                            <th className="text-center py-3 px-2 text-slate-400">Chat</th>
                                            <th className="text-center py-3 px-2 text-slate-400">Vision</th>
                                            <th className="text-center py-3 px-2 text-slate-400">Web</th>
                                            <th className="text-center py-3 px-2 text-slate-400">Thinking</th>
                                            <th className="text-center py-3 px-2 text-slate-400" title="Thinking enabled by default">Think Auto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ALL_MODELS.map(model => (
                                            <tr key={model.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-${model.color}-400 font-bold`}>{model.name}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${model.color}-500/20 text-${model.color}-300`}>{model.badge}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    {model.capabilities.chat ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    {model.capabilities.vision ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    {model.capabilities.web ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    {model.capabilities.thinking ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    {model.capabilities.thinkingDefault ? <span className="text-amber-400">ON</span> : <span className="text-slate-600">OFF</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                                <h3 className="text-sm font-mono font-bold text-cyan-400 mb-2">Notes</h3>
                                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                                    <li>• <strong className="text-emerald-300">Gemini 3.0 Pro Preview</strong> has Thinking enabled by default.</li>
                                    <li>• Web Search is only available on models with the <span className="text-green-400">✓</span> in the Web column.</li>
                                    <li>• Temperature is clamped at 1.0 for Gemini 3.0 models.</li>
                                </ul>
                            </div>

                            {/* Thinking Best Practices */}
                            <div className="mt-8">
                                <h2 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-purple-400" />
                                    Thinking Mode Best Practices
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Easy Tasks */}
                                    <div className="p-4 bg-slate-900/50 border border-green-700/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 font-mono rounded">EASY</span>
                                            <span className="text-xs text-green-400 font-mono">Thinking OFF</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mb-2">Simple tasks that don't need complex reasoning:</p>
                                        <ul className="text-[10px] text-slate-500 space-y-1 font-mono">
                                            <li>• "Where was DeepMind founded?"</li>
                                            <li>• "Is this email asking for a meeting?"</li>
                                            <li>• Simple fact retrieval or classification</li>
                                        </ul>
                                    </div>

                                    {/* Medium Tasks */}
                                    <div className="p-4 bg-slate-900/50 border border-amber-700/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 font-mono rounded">MEDIUM</span>
                                            <span className="text-xs text-amber-400 font-mono">Default Thinking</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mb-2">Tasks requiring step-by-step processing:</p>
                                        <ul className="text-[10px] text-slate-500 space-y-1 font-mono">
                                            <li>• "Analogize photosynthesis to growing up"</li>
                                            <li>• "Compare electric vs hybrid cars"</li>
                                            <li>• Deeper understanding and analysis</li>
                                        </ul>
                                    </div>

                                    {/* Hard Tasks */}
                                    <div className="p-4 bg-slate-900/50 border border-red-700/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 font-mono rounded">HARD</span>
                                            <span className="text-xs text-red-400 font-mono">Max Thinking</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mb-2">Complex challenges requiring full reasoning:</p>
                                        <ul className="text-[10px] text-slate-500 space-y-1 font-mono">
                                            <li>• Complex math problems (AIME level)</li>
                                            <li>• Full web app with auth + real-time data</li>
                                            <li>• Multi-step planning and logic</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg">
                                    <p className="text-xs text-purple-300 font-mono">
                                        <strong>💡 Tip:</strong> Review the AI's thought summaries when results aren't as expected.
                                        For lengthy outputs, provide guidance to limit thinking and reserve tokens for your response.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* Edit Topic Modal */}
            <AnimatePresence>
                {editingTopic && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingTopic(null)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl p-6 w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-2">
                                    <Pencil className="w-5 h-5" /> Rename Topic
                                </h3>
                                <button
                                    onClick={() => setEditingTopic(null)}
                                    className="p-1 text-slate-400 hover:text-white rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={editTopicName}
                                onChange={(e) => setEditTopicName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveTopicName()}
                                placeholder="Enter topic name..."
                                autoFocus
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-emerald-500/30 text-slate-200 font-mono text-sm rounded-lg focus:outline-none focus:border-emerald-500 mb-4"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setEditingTopic(null)}
                                    className="px-4 py-2 text-slate-400 hover:text-white font-mono text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveTopicName}
                                    disabled={!editTopicName.trim()}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold rounded-lg disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title={deleteConfirm.type === 'topic' ? 'DELETE TOPIC' : 'DELETE REPORT'}
                message={`Delete "${deleteConfirm.name}"? This cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deleteConfirm.id) {
                        if (deleteConfirm.type === 'topic') {
                            setTopics(prev => prev.filter(t => t.id !== deleteConfirm.id));
                            if (selectedTopicId === deleteConfirm.id) setSelectedTopicId(null);
                        } else {
                            setIntelReports(prev => prev.filter(r => r.id !== deleteConfirm.id));
                            if (selectedReportId === deleteConfirm.id) setSelectedReportId(null);
                        }
                    }
                    setDeleteConfirm({ isOpen: false, type: 'topic', id: null, name: '' });
                }}
                onCancel={() => setDeleteConfirm({ isOpen: false, type: 'topic', id: null, name: '' })}
            />
        </div>
    );
};
