import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Radio, Loader2, Send, Globe, Lock, Rocket, Calendar, Tag, Image as ImageIcon, X, Link as LinkIcon, Plus, Trash2, FileText, Clock } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Task, IntelDrop } from '../../types';
import clsx from 'clsx';

interface CreateActionModalProps {
    onClose: () => void;
    editTask?: Task;
    editDrop?: IntelDrop;
}

type Tab = 'directive' | 'transmission' | 'visual';
type Difficulty = 'Easy' | 'Medium' | 'Hard'; // Corresponds to Quick | Grind | Cooked

export const CreateActionModal: React.FC<CreateActionModalProps> = ({ onClose, editTask, editDrop }) => {
    const [activeTab, setActiveTab] = useState<Tab>('directive');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addTask, updateTask, publishManualDrop, updateIntelDrop } = useOrbitStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Task State
    const [taskTitle, setTaskTitle] = useState('');
    const [taskCourse, setTaskCourse] = useState(''); // Mapped to category if custom? Currently unused in logic but kept for UI
    const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('Medium');
    const [taskPrivate, setTaskPrivate] = useState(true);

    // New Task Fields
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskDueTime, setTaskDueTime] = useState('');
    const [resourceLinks, setResourceLinks] = useState<{ title: string; url: string }[]>([]);
    const [taskAnswer, setTaskAnswer] = useState('');

    // Post State
    const [postSubject, setPostSubject] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postTag, setPostTag] = useState('');
    const [postPrivate, setPostPrivate] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);

    // Initialize for Edit Mode
    useEffect(() => {
        if (editTask) {
            setActiveTab('directive');
            setTaskTitle(editTask.title);
            setTaskDifficulty(editTask.difficulty as Difficulty || 'Medium');
            setTaskPrivate(!editTask.is_public);
            setTaskCourse(editTask.category); // Pre-fill category

            if (editTask.due_date) {
                const date = new Date(editTask.due_date);
                setTaskDueDate(date.toISOString().split('T')[0]);
                setTaskDueTime(date.toTimeString().slice(0, 5));
            }

            if (editTask.resource_links) {
                setResourceLinks(editTask.resource_links);
            }

            if (editTask.answer) {
                setTaskAnswer(editTask.answer);
            }
        } else if (editDrop) {
            // Determine if it's a visual drop or text drop
            const isVisual = editDrop.attachment_type?.startsWith('image/');
            setActiveTab(isVisual ? 'visual' : 'transmission');

            // Common fields
            setPostPrivate(editDrop.is_private);

            if (isVisual) {
                setTaskTitle(editDrop.query); // Visual drops use query as title
                setExistingAttachmentUrl(editDrop.attachment_url || null);
            } else {
                setPostSubject(editDrop.query);
                setPostContent(editDrop.summary_bullets.join('\n')); // Join bullets back to text
                setPostTag(editDrop.related_concepts.filter(c => c !== 'Manual Broadcast')[0] || '');
            }
        }
    }, [editTask, editDrop]);

    const handleDirectiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        setIsSubmitting(true);
        try {
            // Map difficulty to category (Easy=Quick, Medium=Grind, Hard=Cooked)
            const categoryMap = {
                'Easy': 'Quick',
                'Medium': 'Grind',
                'Hard': 'Cooked'
            };

            // Construct Due Date
            let finalDueDate = null;
            if (taskDueDate) {
                const dateTimeString = taskDueTime ? `${taskDueDate}T${taskDueTime}:00` : `${taskDueDate}T23:59:59`;
                finalDueDate = new Date(dateTimeString).toISOString();
            }

            const taskData = {
                title: taskTitle,
                category: categoryMap[taskDifficulty], // Use difficulty-based category
                difficulty: taskDifficulty,
                is_public: !taskPrivate,
                due_date: finalDueDate,
                resource_links: resourceLinks.filter(l => l.url.trim() !== ''), // Filter empty links
                answer: taskAnswer.trim() || null
            };

            if (editTask) {
                await updateTask(editTask.id, taskData);
            } else {
                await addTask(taskData);
            }
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

            if (editDrop) {
                await updateIntelDrop(editDrop.id, {
                    query: postSubject,
                    summary_bullets: postContent.trim() ? [postContent] : [],
                    related_concepts: ['Manual Broadcast', ...tags],
                    is_private: postPrivate
                });
            } else {
                await publishManualDrop(postSubject, postContent, tags, selectedFile || undefined, postPrivate);
            }
            onClose();
        } catch (err) {
            console.error(err);
            const { toast } = await import('@/lib/toast');
            toast.error(err instanceof Error ? err.message : 'Failed to create transmission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVisualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // If editing, file is optional (can keep existing). If new, file is required.
        if (!selectedFile && !existingAttachmentUrl) return;

        setIsSubmitting(true);
        try {
            if (editDrop) {
                // Visual drops: Title is optional (passed as query)
                await updateIntelDrop(editDrop.id, {
                    query: taskTitle,
                    is_private: postPrivate
                });
            } else {
                await publishManualDrop(taskTitle, '', [], selectedFile!, postPrivate);
            }
            onClose();
        } catch (err) {
            console.error(err);
            const { toast } = await import('@/lib/toast');
            toast.error(err instanceof Error ? err.message : 'Failed to upload visual intel.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type (images only)
            if (file.type.startsWith('image/')) {
                setSelectedFile(file);
            } else {
                alert('Please select an image file (PNG, JPG, GIF, etc.)');
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addResourceLink = () => {
        setResourceLinks([...resourceLinks, { title: '', url: '' }]);
    };

    const updateResourceLink = (index: number, field: 'title' | 'url', value: string) => {
        const newLinks = [...resourceLinks];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setResourceLinks(newLinks);
    };

    const removeResourceLink = (index: number) => {
        setResourceLinks(resourceLinks.filter((_, i) => i !== index));
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
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative max-h-[90vh]"
            >
                {/* Header - System HUD Style */}
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                    <div className="flex items-center gap-2 z-10">
                        <div className={clsx("w-2 h-6 rounded-sm", editTask ? "bg-amber-500" : "bg-cyan-500")} />
                        <h2 className="text-lg font-bold text-white tracking-widest">
                            {editTask ? 'MODIFY DIRECTIVE' : editDrop ? 'MODIFY TRANSMISSION' : 'MISSION INITIALIZATION'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white z-10 font-mono text-xs">[ ABORT ]</button>
                </div>

                {/* Tab Switcher (Hidden in Edit Mode) */}
                {!editTask && !editDrop && (
                    <div className="flex bg-slate-950/50 shrink-0">
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
                                DIRECTIVE
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
                        <button
                            onClick={() => setActiveTab('visual')}
                            className={clsx(
                                "flex-1 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-all relative overflow-hidden",
                                activeTab === 'visual'
                                    ? "text-emerald-400 bg-slate-900"
                                    : "text-slate-600 hover:text-slate-300 hover:bg-slate-900/50"
                            )}
                        >
                            {activeTab === 'visual' && (
                                <motion.div layoutId="activeTab" className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            )}
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                <ImageIcon className="w-4 h-4" />
                                VISUAL
                            </div>
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="p-6 bg-slate-900 overflow-y-auto custom-scrollbar flex-1">
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

                                    {/* Due Date */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                            <Calendar className="w-3 h-3" /> Deadline
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={taskDueDate}
                                                onChange={(e) => setTaskDueDate(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-slate-400 focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm"
                                            />
                                            <input
                                                type="time"
                                                value={taskDueTime}
                                                onChange={(e) => setTaskDueTime(e.target.value)}
                                                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-3 text-slate-400 focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Resource Links */}
                                <div>
                                    <label className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                        <span className="flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Intel Resources</span>
                                        <button type="button" onClick={addResourceLink} className="text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> ADD LINK
                                        </button>
                                    </label>
                                    <div className="space-y-2">
                                        {resourceLinks.map((link, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={link.title}
                                                    onChange={(e) => updateResourceLink(index, 'title', e.target.value)}
                                                    placeholder="Title"
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500 text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={(e) => updateResourceLink(index, 'url', e.target.value)}
                                                    placeholder="URL"
                                                    className="flex-[2] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500 text-sm font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeResourceLink(index)}
                                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {resourceLinks.length === 0 && (
                                            <div className="text-center py-4 border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs font-mono">
                                                NO RESOURCES ATTACHED
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Answer Key (Optional) */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                        <FileText className="w-3 h-3" /> Answer Key / Notes
                                    </label>
                                    <textarea
                                        value={taskAnswer}
                                        onChange={(e) => setTaskAnswer(e.target.value)}
                                        placeholder="Enter answer key or notes (Markdown supported)..."
                                        rows={3}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-700 font-mono text-sm resize-y"
                                    />
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
                                            {editTask ? 'UPDATE DIRECTIVE' : 'INITIALIZE'}
                                            <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : activeTab === 'transmission' ? (

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
                                            {editDrop ? 'UPDATE TRANSMISSION' : 'BROADCAST'}
                                            <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            /* --- VISUAL MODE --- */
                            <motion.form
                                key="visual-form"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onSubmit={handleVisualSubmit}
                                className="space-y-5"
                            >
                                {/* Title (Optional) */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">
                                        <Tag className="w-3 h-3" /> Title (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={taskTitle}
                                        onChange={(e) => setTaskTitle(e.target.value)}
                                        placeholder="e.g. Sector 7 Surveillance"
                                        autoFocus
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700 font-mono text-sm"
                                    />
                                </div>

                                {/* Image Upload (Required) */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                        <ImageIcon className="w-3 h-3" /> Visual Data
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    {selectedFile ? (
                                        <div className="w-full h-48 bg-slate-950 border border-emerald-500/50 rounded-xl relative group overflow-hidden flex items-center justify-center">
                                            <img
                                                src={URL.createObjectURL(selectedFile)}
                                                alt="Preview"
                                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                                            />
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-emerald-400 font-mono text-xs border border-emerald-500/30">
                                                    {selectedFile.name}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-full transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : existingAttachmentUrl ? (
                                        <div className="w-full h-48 bg-slate-950 border border-emerald-500/50 rounded-xl relative group overflow-hidden flex items-center justify-center">
                                            <img
                                                src={existingAttachmentUrl}
                                                alt="Preview"
                                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                                            />
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-emerald-400 font-mono text-xs border border-emerald-500/30">
                                                    Existing Image
                                                </div>
                                                {/* No remove button for existing image yet, as we don't support clearing it in this simple edit flow */}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-48 bg-slate-950 border-2 border-slate-800 border-dashed hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-400 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <ImageIcon className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-mono text-xs font-bold uppercase tracking-wider">Upload Visual Intel</p>
                                                <p className="text-[10px] opacity-60 mt-1">PNG, JPG, GIF up to 10MB</p>
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {/* Privacy Toggle */}
                                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-8 h-8 rounded flex items-center justify-center transition-colors", postPrivate ? "bg-violet-500/20 text-violet-400" : "bg-emerald-500/20 text-emerald-400")}>
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
                                        className={clsx("w-12 h-6 rounded-full p-1 transition-colors relative", postPrivate ? "bg-violet-900" : "bg-emerald-700")}
                                    >
                                        <motion.div
                                            animate={{ x: postPrivate ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={(!selectedFile && !existingAttachmentUrl) || isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            {editDrop ? 'UPDATE VISUAL INTEL' : 'UPLOAD INTEL'}
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
