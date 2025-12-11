import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Send,
    Maximize2,
    Minimize2,
    Layers,
    Sliders,
    Wand2,
    Check,
    History,
    SplitSquareHorizontal
} from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
// TODO: Import image editing function when implemented

// Types for our Magic Editor
type ViewMode = 'split' | 'focus-new' | 'focus-old';
type StylePreset = 'Cinematic' | 'Vibrant' | 'Subtle' | 'Tarr' | 'Some' | 'Pro-Edit';

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
}

const STYLE_PRESETS: { id: StylePreset; label: string; promptSuffix: string; color: string }[] = [
    { id: 'Cinematic', label: 'Cinematic', promptSuffix: ', cinematic lighting, anamorphic lens flares, movie scene, color graded', color: 'from-blue-500 to-purple-600' },
    { id: 'Vibrant', label: 'Vibrant', promptSuffix: ', vibrant colors, high saturation, energetic atmosphere', color: 'from-orange-400 to-pink-600' },
    { id: 'Subtle', label: 'Subtle', promptSuffix: ', subtle enhancement, natural lighting, realistic textures', color: 'from-gray-400 to-slate-500' },
    { id: 'Tarr', label: 'Tarr', promptSuffix: ', tar-like texture, dark aesthetic, glossy black finish', color: 'from-yellow-900 to-black' }, // Example custom style
    { id: 'Some', label: 'Some', promptSuffix: ', something unique, abstract style', color: 'from-emerald-400 to-teal-600' },
    { id: 'Pro-Edit', label: 'Pro-Edit', promptSuffix: ', professional photography, highly detailed, 8k resolution, perfect composition', color: 'from-indigo-500 to-blue-700' },
];

export const SplitEditor: React.FC<SplitEditorProps> = ({ initialImage, initialPrompt, onClose, onSave }) => {
    // State
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [input, setInput] = useState('');
    const [activeStyles, setActiveStyles] = useState<StylePreset[]>([]);
    const [enhancementLevel, setEnhancementLevel] = useState(50);

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

    const toggleStyle = (styleId: StylePreset) => {
        setActiveStyles(prev =>
            prev.includes(styleId)
                ? prev.filter(s => s !== styleId)
                : [...prev, styleId]
        );
    };

    const handleSend = async () => {
        if ((!input.trim() && activeStyles.length === 0) || loading) return;

        setLoading(true);

        // 1. Construct the Prompt with "Magic" Modifiers
        let fullPrompt = input;

        // Add Styles
        activeStyles.forEach(styleId => {
            const preset = STYLE_PRESETS.find(p => p.id === styleId);
            if (preset) fullPrompt += preset.promptSuffix;
        });

        // Add Toggles
        if (toggles.lighting) fullPrompt += ", perfect dramatic lighting, volumetrics";
        if (toggles.color) fullPrompt += ", color corrected, vibrant tones, balanced histogram";
        if (toggles.sharpness) fullPrompt += ", ultra sharp focus, high definition, 8k texture";
        if (toggles.composition) fullPrompt += ", perfect composition, rule of thirds, golden ratio";

        // Add Enhancement Level (This could be used as a weight parameter if supported, or just prompt emphasis)
        // For now, we'll just log it or treat it as prompt intensity.
        fullPrompt += ` --strength ${enhancementLevel}`; // Conceptual

        console.log("Sending Edit Prompt:", fullPrompt);

        // TODO: Call Gemini 3 Pro Image here with thoughtSignature
        // const response = await editImage(currentRightImage, fullPrompt, history...);

        // MOCK RESPONSE FOR UI DEV
        setTimeout(() => {
            const newVersionId = `v${versions.length}`;
            const newVersion: EditorVersion = {
                id: newVersionId,
                url: rightImage, // In real app this would be new image
                prompt: fullPrompt,
                timestamp: Date.now()
            };

            setVersions(prev => [...prev, newVersion]);
            setRightVersionId(newVersionId); // Auto-focus new result
            setLeftVersionId(rightVersionId); // Move previous right to left for comparison
            setLoading(false);
            setInput('');
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#09090b] text-white flex flex-col font-sans">
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
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'split' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <SplitSquareHorizontal size={14} /> Split View
                    </button>
                    <button
                        onClick={() => setViewMode('focus-new')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'focus-new' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Maximize2 size={14} /> Focus New
                    </button>
                    <button
                        onClick={() => setViewMode('focus-old')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'focus-old' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <History size={14} /> Focus Old
                    </button>
                </div>

                <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-blue-400 transition-colors">
                    EXPORT
                </button>
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
                                <div className="absolute top-4 left-4 z-10 flex gap-2">
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono flex items-center gap-2">
                                        <span className="text-gray-400">VERSION</span>
                                        <select
                                            value={leftVersionId}
                                            onChange={(e) => setLeftVersionId(e.target.value)}
                                            className="bg-transparent text-white outline-none font-bold cursor-pointer"
                                        >
                                            {versions.map((v, i) => (
                                                <option key={v.id} value={v.id} className="bg-zinc-900">
                                                    {v.id.toUpperCase()} {i === 0 ? '(Orig)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <img src={leftImage} className="w-full h-full object-contain" alt="Reference" />
                                <div className="absolute bottom-4 left-4 text-[10px] text-gray-500 font-mono">
                                    {versions.find(v => v.id === leftVersionId)?.prompt.slice(0, 40)}...
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-[1px] bg-white/10 self-stretch my-12" />

                            {/* Right Pane (Current) */}
                            <div className="flex-1 relative rounded-xl overflow-hidden border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                                <div className="absolute top-4 left-4 z-10 flex gap-2">
                                    <div className="bg-blue-600/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-blue-500/30 text-xs font-mono flex items-center gap-2 text-blue-200">
                                        <span className="text-blue-400">LATEST</span>
                                        <select
                                            value={rightVersionId}
                                            onChange={(e) => setRightVersionId(e.target.value)}
                                            className="bg-transparent text-white outline-none font-bold cursor-pointer"
                                        >
                                            {versions.map((v, i) => (
                                                <option key={v.id} value={v.id} className="bg-zinc-900">
                                                    {v.id.toUpperCase()} {i === versions.length - 1 ? '(Latest)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
                <div className="w-[340px] border-l border-white/10 bg-[#0c0c0e] flex flex-col p-5 gap-6 overflow-y-auto">

                    {/* Style Transfer */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                            Style Transfer
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {STYLE_PRESETS.map(style => {
                                const isActive = activeStyles.includes(style.id);
                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => toggleStyle(style.id)}
                                        className={`
                                    relative aspect-square rounded-lg flex flex-col items-center justify-end p-2 overflow-hidden transition-all duration-300
                                    ${isActive ? 'ring-2 ring-blue-500 scale-95' : 'hover:scale-105 opacity-60 hover:opacity-100'}
                                `}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-40`} />
                                        <span className="relative z-10 text-[10px] font-medium text-white shadow-black drop-shadow-md">
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
                                        className={`
                                    w-10 h-5 rounded-full relative transition-all duration-300
                                    ${value ? 'bg-blue-600' : 'bg-white/10'}
                                `}
                                    >
                                        <div className={`
                                    absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md
                                    ${value ? 'left-5.5' : 'left-0.5'}
                                `} />
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
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={enhancementLevel}
                            onChange={(e) => setEnhancementLevel(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                        />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Input Area */}
                    <div className="bg-white/5 p-1 rounded-xl border border-white/10 focus-within:border-blue-500/50 focus-within:bg-white/10 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe changes..."
                            className="w-full bg-transparent text-sm p-3 outline-none resize-none h-20 text-white placeholder-gray-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <div className="flex justify-between items-center px-2 pb-2">
                            <span className="text-[10px] text-gray-500">
                                {activeStyles.length} styles active
                            </span>
                            <button
                                onClick={handleSend}
                                disabled={loading || (!input.trim() && activeStyles.length === 0)}
                                className={`
                            p-2 rounded-lg transition-all
                            ${loading || (!input && activeStyles.length === 0)
                                        ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-600 text-white shadow-lg hover:bg-blue-500'}
                        `}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
