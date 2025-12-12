import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ArrowUpCircle, XCircle, CheckCircle, Coins, Loader } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface PokerControlsProps {
    onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all_in', amount?: number) => void;
    minRaise: number;
    maxRaise: number;
    currentBet: number; // The amount to call
    playerChips: number;
    isTurn: boolean;
    canCheck: boolean;
}

export const PokerControls: React.FC<PokerControlsProps> = ({
    onAction,
    minRaise,
    maxRaise,
    currentBet,
    playerChips,
    isTurn,
    canCheck
}) => {
    const [raiseAmount, setRaiseAmount] = useState(minRaise);
    const isAnimationLocked = useOrbitStore(state => state.isAnimationLocked);
    const canRaise = playerChips >= minRaise && playerChips > currentBet;

    // Reset raise amount when minRaise changes
    useEffect(() => {
        setRaiseAmount(Math.max(minRaise, Math.min(playerChips, minRaise)));
    }, [minRaise, playerChips]);

    if (!isTurn) {
        return (
            <div className="h-24 flex items-center justify-center text-slate-500 font-mono text-sm animate-pulse">
                Waiting for opponents...
            </div>
        );
    }

    // Show animation lockout message
    if (isAnimationLocked) {
        return (
            <div className="h-24 flex items-center justify-center gap-3 text-cyan-400 font-mono text-sm">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Animation playing...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl max-w-2xl mx-auto">
            {/* Betting Slider (only if player has enough chips to raise) */}
            {canRaise && (
                <div className="flex items-center gap-4 px-2">
                    <span className="text-xs font-mono text-slate-400 w-12 text-right">{raiseAmount}</span>
                    <input
                        type="range"
                        min={Math.min(minRaise, playerChips)}
                        max={playerChips}
                        step={1}
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-xs font-mono text-slate-400 w-12">{playerChips}</span>
                </div>
            )}

            <div className="flex items-center justify-center gap-3">
                {/* Fold Button */}
                <button
                    onClick={() => onAction('fold')}
                    className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-slate-800 border border-slate-600 text-red-400 hover:bg-red-900/20 hover:border-red-500/50 transition-all active:scale-95"
                >
                    <XCircle className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase">Fold</span>
                </button>

                {/* Check/Call Button */}
                <button
                    onClick={() => onAction(canCheck ? 'check' : 'call')}
                    className="flex flex-col items-center justify-center w-24 h-24 rounded-xl bg-slate-800 border border-slate-600 text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/50 transition-all active:scale-95 shadow-lg"
                >
                    <CheckCircle className="w-8 h-8 mb-1" />
                    <span className="text-sm font-bold uppercase">{canCheck ? 'Check' : 'Call'}</span>
                    {!canCheck && (
                        <span className="text-xs font-mono text-emerald-500/80">{currentBet}</span>
                    )}
                </button>

                {/* Raise Button */}
                {canRaise && (
                    <button
                        onClick={() => onAction('raise', raiseAmount)}
                        className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-slate-800 border border-slate-600 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all active:scale-95"
                    >
                        <ArrowUpCircle className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold uppercase">Raise</span>
                        <span className="text-[10px] font-mono text-cyan-500/80">{raiseAmount}</span>
                    </button>
                )}

                {/* All In Button */}
                <button
                    onClick={() => onAction('all_in')}
                    className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-slate-800 border border-slate-600 text-amber-400 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all active:scale-95"
                >
                    <Coins className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase">All In</span>
                    <span className="text-[10px] font-mono text-amber-500/80">{playerChips}</span>
                </button>
            </div>
        </div>
    );
};
