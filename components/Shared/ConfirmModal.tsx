import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const VARIANTS = {
    danger: {
        icon: 'bg-red-500/20 text-red-400 border-red-500/30',
        confirmBtn: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/30',
        border: 'border-red-500/30'
    },
    warning: {
        icon: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        confirmBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-900/30',
        border: 'border-amber-500/30'
    },
    info: {
        icon: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        confirmBtn: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30',
        border: 'border-cyan-500/30'
    }
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const styles = VARIANTS[variant];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-slate-900 border ${styles.border} rounded-2xl shadow-2xl max-w-md w-full overflow-hidden`}
                    >
                        {/* Header */}
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 mx-auto rounded-full ${styles.icon} border-2 flex items-center justify-center mb-4`}>
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {title}
                            </h3>
                            <p className="text-slate-400 text-sm">
                                {message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 p-4 bg-slate-950/50 border-t border-slate-800">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 py-3 px-4 ${styles.confirmBtn} text-white rounded-xl font-bold text-sm transition-all shadow-lg`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Hook for easier confirmation dialogs
export function useConfirmModal() {
    const [state, setState] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
        resolve?: (value: boolean) => void;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const confirm = React.useCallback((options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
    }): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                ...options,
                resolve
            });
        });
    }, []);

    const handleConfirm = React.useCallback(() => {
        state.resolve?.(true);
        setState(prev => ({ ...prev, isOpen: false }));
    }, [state.resolve]);

    const handleCancel = React.useCallback(() => {
        state.resolve?.(false);
        setState(prev => ({ ...prev, isOpen: false }));
    }, [state.resolve]);

    const ConfirmDialog = React.useMemo(() => (
        <ConfirmModal
            isOpen={state.isOpen}
            title={state.title}
            message={state.message}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
            variant={state.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    ), [state, handleConfirm, handleCancel]);

    return { confirm, ConfirmDialog };
}
