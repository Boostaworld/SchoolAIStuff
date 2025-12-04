import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CardRank, CardSuit, PokerCard as PokerCardType } from '../../lib/poker/types';

interface PokerCardProps {
    card?: PokerCardType;
    hidden?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    isWinner?: boolean;
}

export const PokerCard: React.FC<PokerCardProps> = ({
    card,
    hidden = false,
    className,
    size = 'md',
    isWinner = false
}) => {
    const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

    const sizeClasses = {
        sm: "w-10 h-14 text-xs rounded",
        md: "w-16 h-24 text-base rounded-lg",
        lg: "w-24 h-36 text-xl rounded-xl"
    };

    const suitIcons: Record<string, string> = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };

    const rankDisplay: Record<string, string> = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
        'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
    };

    return (
        <div className={clsx("relative perspective-1000", sizeClasses[size], className)}>
            <motion.div
                initial={false}
                animate={{ rotateY: hidden ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className={clsx(
                    "w-full h-full relative preserve-3d shadow-xl transition-all duration-300",
                    isWinner && "ring-4 ring-yellow-400 shadow-yellow-400/50 scale-110 z-10"
                )}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front Face */}
                <div className={clsx(
                    "absolute inset-0 backface-hidden bg-white flex flex-col justify-between p-1.5 select-none overflow-hidden border border-slate-200",
                    size === 'sm' ? 'rounded' : size === 'md' ? 'rounded-lg' : 'rounded-xl',
                    isRed ? "text-red-600" : "text-slate-900"
                )}>
                    {card && (
                        <>
                            {/* Top Left */}
                            <div className="flex flex-col items-center leading-none">
                                <span className="font-bold font-mono">{rankDisplay[card.rank]}</span>
                                <span className="text-[0.8em]">{suitIcons[card.suit]}</span>
                            </div>

                            {/* Center Suit */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                <span className="text-[4em]">{suitIcons[card.suit]}</span>
                            </div>

                            {/* Bottom Right (Rotated) */}
                            <div className="flex flex-col items-center leading-none rotate-180">
                                <span className="font-bold font-mono">{rankDisplay[card.rank]}</span>
                                <span className="text-[0.8em]">{suitIcons[card.suit]}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Back Face */}
                <div
                    className={clsx(
                        "absolute inset-0 backface-hidden rotate-y-180 bg-indigo-900 border-2 border-indigo-800 flex items-center justify-center overflow-hidden",
                        size === 'sm' ? 'rounded' : size === 'md' ? 'rounded-lg' : 'rounded-xl'
                    )}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                    <div className="absolute inset-2 border border-indigo-400/30 rounded-sm"></div>
                    <div className="absolute w-8 h-8 rounded-full bg-indigo-500/20 blur-xl"></div>
                </div>
            </motion.div>
        </div>
    );
};
