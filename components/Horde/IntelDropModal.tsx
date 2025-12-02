import React from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, ShieldAlert } from 'lucide-react';
import { IntelDrop } from '../../types';
import { IntelResults } from '../Intel/IntelResults';
import { useOrbitStore } from '../../store/useOrbitStore';

interface IntelDropModalProps {
    drop: IntelDrop;
    onClose: () => void;
}

export const IntelDropModal: React.FC<IntelDropModalProps> = ({ drop, onClose }) => {
    const { currentUser, deleteIntelDrop } = useOrbitStore();

    const handleDelete = async () => {
        if (confirm("CONFIRM DELETION PROTOCOL? This item will be permanently purged.")) {
            await deleteIntelDrop(drop.id);
            onClose();
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
                className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/60 relative flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <img src={drop.author_avatar} className="w-8 h-8 rounded-full border border-slate-700" alt={drop.author_username} />
                        <div>
                            <h3 className="font-bold text-slate-100 tracking-wider">INTEL ARCHIVE</h3>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                                AUTHOR: {drop.author_username}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Delete Button for Owner OR Admin */}
                        {(currentUser?.id === drop.author_id || currentUser?.is_admin) && (
                            <button
                                onClick={handleDelete}
                                className={`p-1.5 rounded-lg transition-colors border flex items-center gap-2 ${currentUser?.is_admin
                                        ? 'bg-red-900/20 hover:bg-red-900/40 text-red-500 border-red-900/40'
                                        : 'bg-red-900/10 hover:bg-red-900/30 text-red-500/80 hover:text-red-400 border-red-900/20'
                                    }`}
                                title={currentUser?.is_admin ? "Admin Force Delete" : "Delete Drop"}
                            >
                                {currentUser?.is_admin && <ShieldAlert className="w-3 h-3" />}
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Reusing IntelResults but without the Save button since it's already saved */}
                    <IntelResults
                        result={{
                            summary_bullets: drop.summary_bullets,
                            sources: drop.sources,
                            related_concepts: drop.related_concepts,
                            essay: drop.essay
                        }}
                        query={drop.query}
                        onSave={() => { }} // No-op
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};
