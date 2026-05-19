import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Send,
    Maximize2,
    Wand2,
    Check,
    History,
    SplitSquareHorizontal,
    ChevronDown,
    AlertCircle,
    Download,
    Sparkles,
    Save,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { editImage, upscaleImage } from '../../lib/ai/imageEditor';
import { toast } from '../../lib/toast';

// Types for our Magic Editor
type ViewMode = 'split' | 'focus-new' | 'focus-old';

interface SplitEditorProps {
    initialImage: string; // Base64 or URL
    initialPrompt?: string;
    onClose: () => void;
    onSave?: (newImage: string) => void;
}

interface EditorVersion {
    id: string;
    url: string;
    prompt: string;
    timestamp: number;
    thoughtSignature?: string; // For chained edits
    thinking?: string; // AI thinking process
}

// Using styles similar to ImageGenPanel
const STYLE_PRESETS = [
    { id: 'none', label: 'Natural', gradient: 'from-slate-700 to-slate-800', promptSuffix: '' },
    { id: 'photorealistic', label: 'Photo', gradient: 'from-blue-600 to-cyan-500', promptSuffix: ', hyper-realistic photography, detailed textures' },
    { id: 'cinematic', label: 'Cinematic', gradient: 'from-amber-600 to-orange-700', promptSuffix: ', cinematic lighting, anamorphic lens flares, movie scene' },
    { id: 'digital-art', label: 'Digital', gradient: 'from-purple-600 to-indigo-500', promptSuffix: ', modern digital artwork, clean lines' },
    { id: 'vibrant', label: 'Vibrant', gradient: 'from-pink-500 to-rose-600', promptSuffix: ', vibrant colors, high saturation, energetic' },
    { id: 'cyberpunk', label: 'Cyber', gradient: 'from-fuchsia-600 to-violet-600', promptSuffix: ', neon-soaked futurism, cyberpunk aesthetic' },
];

// Custom Dropdown Component
const VersionDropdown: React.FC<{
    value: string;
    options: EditorVersion[];
    onChange: (value: string) => void;
    variant?: 'default' | 'primary';
}> = ({ value, options, onChange, variant = 'default' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = options.find(o => o.id === value);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all",
                    variant === 'primary'
                        ? "bg-blue-600/30 border border-blue-500/50 text-blue-200"
                        : "bg-black/60 backdrop-blur-md border border-white/20 text-gray-200"
                )}
            >
                <span className={variant === 'primary' ? "text-blue-400" : "text-gray-400"}>
                    {variant === 'primary' ? 'LATEST' : 'VERSION'}
                </span>
                <span className="font-bold">{selected?.id.toUpperCase()}</span>
                <ChevronDown size={12} className={clsx("transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-1 w-40 bg-zinc-900 border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            {options.map((opt, i) => (
                                <button
                                    key={opt.id}
                                    onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                    className={clsx(
                                        "w-full px-3 py-2 text-left text-xs font-mono hover:bg-white/10 transition-colors flex items-center justify-between",
                                        value === opt.id ? "bg-blue-600/20 text-blue-300" : "text-gray-300"
                                    )}
                                >
                                    <span>{opt.id.toUpperCase()}</span>
                                    {i === 0 && <span className="text-gray-500">(Orig)</span>}
                                    {i === options.length - 1 && i > 0 && <span className="text-blue-400">(Latest)</span>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export const SplitEditor: React.FC<SplitEditorProps> = ({ initialImage, initialPrompt, onClose, onSave }) => {
    // State
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [input, setInput] = useState('');
    const [activeStyles, setActiveStyles] = useState<string[]>([]);
    const [enhancementLevel, setEnhancementLevel] = useState(50);
    const [optimizePrompt, setOptimizePrompt] = useState(false);

    // Versions State
    const [versions, setVersions] = useState<EditorVersion[]>([
        { id: 'v0', url: initialImage, prompt: initialPrompt || 'Original', timestamp: Date.now() }
    ]);
    const [leftVersionId, setLeftVersionId] = useState<string>('v0');
    const [rightVersionId, setRightVersionId] = useState<string>('v0');

    const [loading, setLoading] = useState(false);

    // Toggles
    const [toggles, setToggles] = useState({
        lighting: false,
        color: false,
        sharpness: false,
        composition: false
    });

    // Derived state
    const leftImage = versions.find(v => v.id === leftVersionId)?.url || initialImage;
    const rightImage = versions.find(v => v.id === rightVersionId)?.url || initialImage;

    // Handlers
    const handleToggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleStyle = (styleId: string) => {
        setActiveStyles(prev =>
            prev.includes(styleId)
                ? prev.filter(s => s !== styleId)
                : [...prev, styleId]
        );
    };

    const handleSend = async () => {
        if ((!input.trim() && activeStyles.length === 0) || loading) return;

        setLoading(true);

        // Get the current version's thoughtSignature for context
        const currentVersion = versions.find(v => v.id === rightVersionId);
        const previousSignature = currentVersion?.thoughtSignature;

        // Build prompt from input (the API handles style modifiers internally)
        const prompt = input.trim() || 'Enhance this image';

        console.log("[ImageEditor] Sending edit:", { prompt, styles: activeStyles, hasContext: Boolean(previousSignature) });

        try {
            // Call the real Gemini 3 Pro Image API
            const result = await editImage({
                sourceImage: rightImage,
                prompt,
                thoughtSignature: previousSignature,
                styles: activeStyles.filter(s => s !== 'none'),
                enhancementLevel,
                adjustments: toggles,
                optimizePrompt // Helper to improve prompt with Web Search
            });

            // Create new version with the edited image
            const newVersionId = `v${versions.length}`;
            const newVersion: EditorVersion = {
                id: newVersionId,
                url: result.image,
                prompt: prompt,
                timestamp: Date.now(),
                thoughtSignature: result.thoughtSignature,
                thinking: result.thinking
            };

            setVersions(prev => [...prev, newVersion]);
            setRightVersionId(newVersionId);
            setLeftVersionId(rightVersionId);
            setInput('');

            // Show success message with description if available
            if (result.description) {
                toast.success(result.description.slice(0, 100));
            } else {
                toast.success('Image edited successfully!');
            }

            // Show optimization success
            if (result.usedPrompt && result.usedPrompt !== prompt) {
                toast.success('Prompt optimized by AI!', { duration: 3000 });
            }

        } catch (error: any) {
            console.error("[ImageEditor] Edit failed:", error);
            toast.error(error.message || 'Failed to edit image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpscale = async () => {
        if (loading) return;
        setLoading(true);
        toast.info('Generating 4K Final Version (Strict Fidelity)...', { duration: 5000 });

        try {
            const currentVersion = versions.find(v => v.id === rightVersionId);

            // Upscale the CURRENT image
            const upscaledImage = await upscaleImage(rightImage, currentVersion?.thoughtSignature);

            const newVersionId = `v${versions.length}-4k`;
            const newVersion: EditorVersion = {
                id: newVersionId,
                url: upscaledImage,
                prompt: "Upscaled to 4K",
                timestamp: Date.now(),
                thoughtSignature: currentVersion?.thoughtSignature // Keep logic
            };

            setVersions(prev => [...prev, newVersion]);
            setRightVersionId(newVersionId);
            setLeftVersionId(rightVersionId); // Compare with pre-upscale

            toast.success('Image upscaled to 4K!');
        } catch (e: any) {
            console.error(e);
            toast.error('Upscale failed: ' + (e.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 ml-16 z-[100] bg-[#09090b] text-white flex flex-col font-sans">
            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#09090b]/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold tracking-wide">IMAGE EDITOR</h1>
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Wand2 size={10} /> Gemini 3 Pro
                        </span>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('split')}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            viewMode === 'split' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                        )}
                    >
                        <SplitSquareHorizontal size={14} /> Split View
                    </button>
                    <button
                        onClick={() => setViewMode('focus-new')}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            viewMode === 'focus-new' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                        )}
                    >
                        <Maximize2 size={14} /> Focus New
                    </button>
                    <button
                        onClick={() => setViewMode('focus-old')}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            viewMode === 'focus-old' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                        )}
                    >
                        <History size={14} /> Focus Old
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = rightImage;
                            link.download = `gemini-edit-${Date.now()}.jpg`;
                            link.click();
                            toast.success('Image downloaded!');
                        }}
                        className="px-4 py-2 bg-white/5 text-gray-300 text-xs font-bold rounded-full hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Download size={14} /> EXPORT
                    </button>

                    {onSave && (
                        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                            <button
                                onClick={() => {
                                    onSave(rightImage);
                                    toast.success('Saved as new copy');
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white transition-colors"
                            >
                                SAVE COPY
                            </button>
                            <div className="w-[1px] bg-white/20 self-stretch my-1" />
                            <button
                                onClick={() => {
                                    onSave(rightImage);
                                    onClose();
                                    toast.success('Original replaced');
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                            >
                                <Check size={12} /> REPLACE
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">

                {/* Canvas Area */}
                <div className="flex-1 relative bg-[#050505] flex items-center justify-center p-4">

                    {/* SPLIT VIEW LOGIC */}
                    {viewMode === 'split' && (
                        <div className="w-full h-full flex gap-1 relative">
                            {/* Left Pane (Reference) */}
                            <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10 group">
                                <div className="absolute top-4 left-4 z-10">
                                    <VersionDropdown
                                        value={leftVersionId}
                                        options={versions}
                                        onChange={setLeftVersionId}
                                    />
                                </div>
                                <img src={leftImage} className="w-full h-full object-contain" alt="Reference" />
                                <div className="absolute bottom-4 left-4 text-[10px] text-gray-500 font-mono bg-black/50 px-2 py-1 rounded">
                                    {versions.find(v => v.id === leftVersionId)?.prompt.slice(0, 40)}...
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-[2px] bg-white/20 self-stretch my-12" />

                            {/* Right Pane (Current) */}
                            <div className="flex-1 relative rounded-xl overflow-hidden border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                                <div className="absolute top-4 left-4 z-10">
                                    <VersionDropdown
                                        value={rightVersionId}
                                        options={versions}
                                        onChange={setRightVersionId}
                                        variant="primary"
                                    />
                                </div>
                                <img src={rightImage} className="w-full h-full object-contain" alt="Result" />
                                {loading && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                                        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-blue-500 animate-spin" />
                                        <span className="text-xs tracking-widest text-blue-400 animate-pulse">GENERATING PIXELS...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FULLSCREEN MODES */}
                    {viewMode !== 'split' && (
                        <div className="w-full h-full relative rounded-xl overflow-hidden border border-white/10">
                            <img
                                src={viewMode === 'focus-new' ? rightImage : leftImage}
                                className="w-full h-full object-contain"
                                alt="Focus View"
                            />
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Controls) */}
                <div className="w-[320px] border-l border-white/10 bg-[#0c0c0e] flex flex-col p-4 gap-5 overflow-y-auto">

                    {/* Input Area */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Edit Prompt
                        </label>
                        <div className="flex gap-2 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe changes..."
                                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 pr-20"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <div className="absolute right-2 top-2 flex items-center gap-1">
                                <button
                                    onClick={() => setOptimizePrompt(!optimizePrompt)}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-all",
                                        optimizePrompt ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-white"
                                    )}
                                    title="AI Prompt Optimization (Web Search)"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={loading || (!input && activeStyles.length === 0)}
                                    className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-white/10" />

                    {/* Style Transfer */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                            Style Transfer <span className="text-blue-400/60">(multi-select)</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {STYLE_PRESETS.map(style => {
                                const isActive = activeStyles.includes(style.id);
                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => toggleStyle(style.id)}
                                        className={clsx(
                                            "relative aspect-square rounded-lg flex flex-col items-center justify-end p-2 overflow-hidden transition-all duration-300",
                                            isActive ? 'ring-2 ring-blue-500 scale-95' : 'hover:scale-105 opacity-70 hover:opacity-100'
                                        )}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-60`} />
                                        <span className="relative z-10 text-[10px] font-bold text-white drop-shadow-lg">
                                            {style.label}
                                        </span>
                                        {isActive && (
                                            <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                                <Check size={8} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Specific Adjustments */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                            Specific Adjustments
                        </label>
                        <div className="flex flex-col gap-3">
                            {Object.entries(toggles).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-300 capitalize">
                                        {key === 'lighting' && '☀️'}
                                        {key === 'color' && '🎨'}
                                        {key === 'sharpness' && '📐'}
                                        {key === 'composition' && '🖼️'}
                                        {key}
                                    </div>
                                    <button
                                        onClick={() => handleToggle(key as any)}
                                        className={clsx(
                                            "w-11 h-6 rounded-full relative transition-colors duration-300",
                                            value ? 'bg-blue-600' : 'bg-slate-700'
                                        )}
                                    >
                                        <motion.div
                                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                                            animate={{ left: value ? 24 : 4 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Settings */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between">
                            AI Enhancement Strength
                            <span className="text-blue-400">{enhancementLevel}%</span>
                        </label>
                        <div className="relative h-4 group cursor-pointer flex items-center"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
                                setEnhancementLevel(Math.round(percent));
                            }}
                        >
                            <div className="absolute inset-0 h-1 bg-slate-700 rounded-full my-auto" />
                            <div
                                className="absolute inset-y-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full my-auto"
                                style={{ width: `${enhancementLevel}%` }}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full shadow-lg border border-blue-500 transform -translate-x-1/2 transition-transform group-hover:scale-125"
                                style={{ left: `${enhancementLevel}%` }}
                            />
                        </div>
                    </div>

                    {/* Finalize Section */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <button
                            onClick={handleUpscale}
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-xs font-bold tracking-wider hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group"
                        >
                            <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
                            GENERATE 4K FINAL
                        </button>
                        <p className="text-[10px] text-gray-500 text-center mt-2">
                            Upscales your current preview to full 4K resolution
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

