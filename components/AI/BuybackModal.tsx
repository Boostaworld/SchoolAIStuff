// components/AI/BuybackModal.tsx
// CREDIT FORGE - Modal for buying AI credits with Orbit Points

import React, { useState, useEffect } from 'react';
import { X, Coins, Zap, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { creditForgeService, type BuybackQuote } from '../../lib/ai/creditForge';

interface BuybackModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    modelId: string;
    modelName: string;
    onSuccess?: (creditsAdded: number) => void;
}

const CREDIT_AMOUNTS = [0.25, 0.50, 1.00, 2.00];

export function BuybackModal({
    isOpen,
    onClose,
    userId,
    modelId,
    modelName,
    onSuccess,
}: BuybackModalProps) {
    const [selectedAmount, setSelectedAmount] = useState(0.50);
    const [quote, setQuote] = useState<BuybackQuote | null>(null);
    const [loading, setLoading] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setAnimate(true), 10);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    // Fetch quote when amount changes
    useEffect(() => {
        if (!isOpen || !userId || !modelId) return;

        const fetchQuote = async () => {
            setLoading(true);
            try {
                const q = await creditForgeService.getQuote(userId, modelId, selectedAmount);
                setQuote(q);
            } catch (err) {
                console.error('Error fetching quote:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, [isOpen, userId, modelId, selectedAmount]);

    const handlePurchase = async () => {
        if (!quote || !quote.canAfford) return;

        setPurchasing(true);
        setResult(null);

        try {
            const res = await creditForgeService.buyCredits(userId, modelId, selectedAmount);

            if (res.success) {
                setResult({
                    success: true,
                    message: `Added $${res.transaction?.creditsReceived.toFixed(2)} credits!`,
                });
                onSuccess?.(res.transaction?.creditsReceived || 0);

                setTimeout(() => {
                    onClose();
                    setResult(null);
                }, 2000);
            } else {
                setResult({
                    success: false,
                    message: res.error || 'Transaction failed',
                });
            }
        } catch (err) {
            setResult({
                success: false,
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setPurchasing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300
        ${animate ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'}
      `}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`
          w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden
          transition-all duration-300
          ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg">
                            <Coins className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white">CREDIT FORGE</h2>
                            <p className="text-xs text-slate-400">Convert Orbit Points to AI Credits</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Model info */}
                    <div className="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-slate-300">Adding credits for:</span>
                            <span className="font-semibold text-white">{modelName}</span>
                        </div>
                    </div>

                    {/* Amount selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Select Credit Amount
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {CREDIT_AMOUNTS.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setSelectedAmount(amount)}
                                    disabled={quote != null && amount > quote.maxPurchasable}
                                    className={`
                    py-3 px-2 rounded-lg border-2 font-medium transition-all
                    ${selectedAmount === amount
                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                                        }
                    ${quote != null && amount > quote.maxPurchasable
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                        }
                  `}
                                >
                                    ${amount.toFixed(2)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quote display */}
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        </div>
                    ) : quote && (
                        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-violet-400">{quote.pointsRequired}</p>
                                    <p className="text-xs text-slate-400">Orbit Points</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-500" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400">${quote.creditsToReceive.toFixed(2)}</p>
                                    <p className="text-xs text-slate-400">AI Credits</p>
                                </div>
                            </div>

                            <div className="flex justify-between text-xs text-slate-400 border-t border-slate-700/50 pt-3">
                                <span>Your Balance:</span>
                                <span className={quote.canAfford ? 'text-slate-300' : 'text-red-400'}>
                                    {quote.currentPointBalance.toLocaleString()} pts
                                    {!quote.canAfford && ' (not enough)'}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>Exchange Rate:</span>
                                <span className="text-slate-300">{quote.exchangeRate} pts / $0.10</span>
                            </div>
                        </div>
                    )}

                    {/* Result message */}
                    {result && (
                        <div
                            className={`
                mb-4 p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2
                ${result.success
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                                }
              `}
                        >
                            {result.success
                                ? <CheckCircle className="w-5 h-5" />
                                : <AlertTriangle className="w-5 h-5" />
                            }
                            <span className="text-sm">{result.message}</span>
                        </div>
                    )}

                    {/* Purchase button */}
                    <button
                        onClick={handlePurchase}
                        disabled={!quote?.canAfford || purchasing}
                        className={`
              w-full py-3 px-4 rounded-xl font-semibold transition-all
              flex items-center justify-center gap-2
              ${quote?.canAfford && !purchasing
                                ? 'bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg shadow-violet-500/25'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }
            `}
                    >
                        {purchasing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Coins className="w-5 h-5" />
                                Exchange {quote?.pointsRequired || 0} Points
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BuybackModal;
