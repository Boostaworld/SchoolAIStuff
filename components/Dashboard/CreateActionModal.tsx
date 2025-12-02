import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Radio, Loader2, Send, Globe, Lock, Rocket, Calendar, Tag, Image as ImageIcon } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import clsx from 'clsx';

interface CreateActionModalProps {
    onClose: () => void;
}

type Tab = 'directive' | 'transmission';
type Difficulty = 'Easy' | 'Medium' | 'Hard'; // Corresponds to Quick | Grind | Cooked

export const CreateActionModal: React.FC<CreateActionModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('directive');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addTask, publishManualDrop } = useOrbitStore();

    // Task State
    const [taskTitle, setTaskTitle] = useState('');
    const [taskCourse, setTaskCourse] = useState('');
    const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('Medium');
    const [taskPrivate, setTaskPrivate] = useState(true);

    // Post State
    const [postSubject, setPostSubject] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postTag, setPostTag] = useState('');
    const [postPrivate, setPostPrivate] = useState(false);

    const handleDirectiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        setIsSubmitting(true);
        try {
            await addTask({
                title: taskTitle,
                category: taskCourse || 'Grind', // Map Course to Category
                difficulty: taskDifficulty
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransmissionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postSubject.trim() || !postContent.trim()) return;
        setIsSubmitting(true);
        try {
            // Tag handling
            const tags = postTag ? [postTag] : [];
            await publishManualDrop(postSubject, postContent, tags);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative"
            >
                {/* Header - System HUD Style */}
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                    <div className="flex items-center gap-2 z-10">
                        <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                        <h2 className="text-lg font-bold text-white tracking-widest">MISSION INITIALIZATION</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white z-10 font-mono text-xs">[ ABORT ]</button>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-950/50">
                    <button
                        onClick={() => setActiveTab('directive')}
                        className={clsx(
                            "flex-1 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-all relative overflow-hidden",
                            activeTab === 'directive'
                                ? "text-violet-400 bg-slate-900"
                                : "text-slate-600 hover:text-slate-300 hover:bg-slate-900/50"
                        )}
                    >
                        {activeTab === 'directive' && (
                            <motion.div layoutId="activeTab" className="absolute top-0 inset-x-0 h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                        )}
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <Target className="w-4 h-4" />
                            TASK / DIRECTIVE
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('transmission')}
                        className={clsx(
                            "flex-1 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-all relative overflow-hidden",
                            activeTab === 'transmission'
                                ? "text-cyan-400 bg-slate-900"
                                : "text-slate-600 hover:text-slate-300 hover:bg-slate-900/50"
                        )}
                    >
                        {activeTab === 'transmission' && (
                            <motion.div layoutId="activeTab" className="absolute top-0 inset-x-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                        )}
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <Radio className="w-4 h-4" />
                            TRANSMISSION
                        </div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 bg-slate-900">
                    <AnimatePresence mode='wait'>

                        {/* --- DIRECTIVE MODE --- */}
                        {activeTab === 'directive' ? (
                            <motion.form
                                key="directive-form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onSubmit={handleDirectiveSubmit}
                                className="space-y-5"
                            >
                                {/* Task Title */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-2">
                                        <Target className="w-3 h-3" /> Mission Objective
                                    </label>
                                    <input
                                        type="text"
                                        value={taskTitle}
                                        onChange={(e) => setTaskTitle(e.target.value)}
                                        placeholder="e.g. Complete Calculus Problem Set 4"
                                        autoFocus
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-700 font-mono text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Course / Vector */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                            <Tag className="w-3 h-3" /> Vector / Course
                                        </label>
                                        <input
                                            type="text"
                                            value={taskCourse}
                                            onChange={(e) => setTaskCourse(e.target.value)}
                                            placeholder="e.g. MATH 101"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-700 font-mono text-sm"
                                        />
                                    </div>

                                    {/* Due Date (Mock) */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                            <Calendar className="w-3 h-3" /> Deadline
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-400 focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Difficulty Radio */}
                                <div>
                                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Threat Level</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'QUICK', val: 'Easy', color: 'text-emerald-400', border: 'border-emerald-500/20' },
                                            { label: 'GRIND', val: 'Medium', color: 'text-blue-400', border: 'border-blue-500/20' },
                                            { label: 'COOKED', val: 'Hard', color: 'text-amber-400', border: 'border-amber-500/20' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={() => setTaskDifficulty(opt.val as Difficulty)}
                                                className={clsx(
                                                    "py-3 rounded-lg border-2 text-xs font-bold font-mono uppercase transition-all flex flex-col items-center justify-center gap-1",
                                                    taskDifficulty === opt.val
                                                        ? `bg-slate-800 border-current ${opt.color} shadow-lg`
                                                        : "bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Privacy Toggle */}
                                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-8 h-8 rounded flex items-center justify-center transition-colors", taskPrivate ? "bg-violet-500/20 text-violet-400" : "bg-slate-800 text-slate-600")}>
                                            {taskPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-300">{taskPrivate ? "PRIVATE UPLINK" : "PUBLIC BROADCAST"}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {taskPrivate ? "Only visible to you" : "Visible to all operatives"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTaskPrivate(!taskPrivate)}
                                        className={clsx("w-12 h-6 rounded-full p-1 transition-colors relative", taskPrivate ? "bg-violet-900" : "bg-slate-700")}
                                    >
                                        <motion.div
                                            animate={{ x: taskPrivate ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!taskTitle.trim() || isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            INITIALIZE
                                            <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : (

                            /* --- TRANSMISSION MODE --- */
                            <motion.form
                                key="transmission-form"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onSubmit={handleTransmissionSubmit}
                                className="space-y-5"
                            >
                                {/* Subject */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-2">
                                        <Radio className="w-3 h-3" /> Transmission Header
                                    </label>
                                    <input
                                        type="text"
                                        value={postSubject}
                                        onChange={(e) => setPostSubject(e.target.value)}
                                        placeholder="e.g. Found a new resource for React..."
                                        autoFocus
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700 font-mono text-sm"
                                    />
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Payload Content</label>
                                    <textarea
                                        value={postContent}
                                        onChange={(e) => setPostContent(e.target.value)}
                                        placeholder="Enter message..."
                                        rows={6}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700 font-mono text-sm resize-none"
                                    />
                                </div>

                                {/* Meta Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Tag */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                            <Tag className="w-3 h-3" /> Tag
                                        </label>
                                        <input
                                            type="text"
                                            value={postTag}
                                            onChange={(e) => setPostTag(e.target.value)}
                                            placeholder="Meme"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700 font-mono text-sm"
                                        />
                                    </div>

                                    {/* Attachment Mock */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                            <ImageIcon className="w-3 h-3" /> Attachment
                                        </label>
                                        <button type="button" className="w-full bg-slate-950 border border-slate-800 border-dashed hover:border-cyan-500/50 rounded-lg px-4 py-3 text-slate-500 hover:text-cyan-400 transition-colors font-mono text-xs flex items-center justify-center gap-2">
                                            <ImageIcon className="w-4 h-4" />
                                            UPLOAD_IMG
                                        </button>
                                    </div>
                                </div>

                                {/* Privacy Toggle (Public Default) */}
                                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-8 h-8 rounded flex items-center justify-center transition-colors", postPrivate ? "bg-violet-500/20 text-violet-400" : "bg-cyan-500/20 text-cyan-400")}>
                                            {postPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-300">{postPrivate ? "ENCRYPTED" : "PUBLIC FEED"}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {postPrivate ? "Private notes" : "Broadcast to Horde"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPostPrivate(!postPrivate)}
                                        className={clsx("w-12 h-6 rounded-full p-1 transition-colors relative", postPrivate ? "bg-violet-900" : "bg-cyan-700")}
                                    >
                                        <motion.div
                                            animate={{ x: postPrivate ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!postSubject.trim() || !postContent.trim() || isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30 disabled:opacity-50 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            BROADCAST
                                            <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};
