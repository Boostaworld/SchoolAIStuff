import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { Task } from '../../types';
import { MarkdownRenderer } from '../Social/MarkdownRenderer';
import clsx from 'clsx';

interface AnswerModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export const AnswerModal: React.FC<AnswerModalProps> = ({ isOpen, onClose, task }) => {
    if (!isOpen || !task) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Answer Key</h2>
                                        <p className="text-xs text-white/40 font-mono uppercase tracking-wider">
                                            {task.title}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0A0A0A]">
                                {task.answer ? (
                                    <div className="prose prose-invert max-w-none">
                                        <MarkdownRenderer content={task.answer} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No answer provided for this task.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
