// components/AI/SynapseToast.tsx
// Educational toast notification for SYNAPSE routing decisions

import React, { useEffect, useState } from 'react';
import { Zap, TrendingDown, Lightbulb, X } from 'lucide-react';
import type { RoutingNotification } from '../../lib/ai/synapse';

interface SynapseToastProps {
    notification: RoutingNotification | null;
    onDismiss: () => void;
    autoHideDuration?: number;
}

export function SynapseToast({
    notification,
    onDismiss,
    autoHideDuration = 5000
}: SynapseToastProps) {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (notification) {
            setVisible(true);
            setProgress(100);

            // Animate progress bar
            const startTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
                setProgress(remaining);

                if (remaining <= 0) {
                    clearInterval(interval);
                }
            }, 50);

            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onDismiss, 300);
            }, autoHideDuration);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [notification, autoHideDuration, onDismiss]);

    if (!notification) return null;

    const severityColors = {
        info: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
        success: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30',
        warning: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
    };

    const severityIcons = {
        info: <Zap className="w-5 h-5 text-cyan-400" />,
        success: <TrendingDown className="w-5 h-5 text-emerald-400" />,
        warning: <Zap className="w-5 h-5 text-amber-400" />,
    };

    return (
        <div
            className={`
        fixed top-4 right-4 z-50 max-w-md transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-5 scale-95 pointer-events-none'}
        bg-gradient-to-r ${severityColors[notification.severity]}
        border rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden
      `}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        {severityIcons[notification.severity]}
                        <span className="font-semibold text-white text-sm">
                            {notification.title}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setVisible(false);
                            onDismiss();
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Message */}
                <p className="text-sm text-slate-300 leading-relaxed">
                    {notification.message}
                </p>

                {/* Educational tip */}
                {notification.tip && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-violet-300/80">
                                {notification.tip}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar for auto-dismiss */}
            <div
                className="h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 origin-left transition-transform"
                style={{ transform: `scaleX(${progress / 100})`, transformOrigin: 'left' }}
            />
        </div>
    );
}

// Inline badge that appears next to model selector
export function RoutingBadge({
    wasRerouted,
    targetModel,
    savings
}: {
    wasRerouted: boolean;
    originalModel?: string;
    targetModel: string;
    savings?: number;
}) {
    if (!wasRerouted) return null;

    return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs animate-in fade-in zoom-in">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300">
                SYNAPSE → {targetModel.split('-').pop()}
            </span>
            {savings !== undefined && savings > 0 && (
                <span className="text-emerald-400 font-medium">
                    (−${savings.toFixed(4)})
                </span>
            )}
        </div>
    );
}

export default SynapseToast;

