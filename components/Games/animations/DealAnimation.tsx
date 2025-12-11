import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PokerCard as PokerCardType } from '../../../lib/poker/types';
import { cardDealVariants } from '../../../lib/poker/animationVariants';
import { POKER_ANIMATIONS } from '../../../lib/poker/animationConstants';

interface DealAnimationProps {
    targets: Array<{
        x: number;
        y: number;
        playerIndex: number;
        card?: PokerCardType;
    }>;
    onComplete?: () => void;
    deckPosition?: { x: number; y: number };
}

export const DealAnimation: React.FC<DealAnimationProps> = ({
    targets,
    onComplete,
    deckPosition = { x: 0, y: 0 }
}) => {
    const [animatingCards, setAnimatingCards] = useState<typeof targets>([]);

    useEffect(() => {
        setAnimatingCards(targets);
        const totalDuration =
            POKER_ANIMATIONS.CARD_DEAL_DURATION +
            targets.length * POKER_ANIMATIONS.CARD_DEAL_STAGGER;

        const timer = setTimeout(() => {
            onComplete?.();
            setAnimatingCards([]);
        }, totalDuration);

        return () => clearTimeout(timer);
    }, [targets, onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {/* Virtual Deck - Holographic dealing source */}
            <motion.div
                className="absolute"
                style={{
                    left: `calc(50% + ${deckPosition.x}px)`,
                    top: `calc(10% + ${deckPosition.y}px)`,
                    transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                {/* Deck stack with holographic glow */}
                <div className="relative w-16 h-24">
                    {/* Multiple card layers for depth */}
                    {[0, 1, 2].map((layer) => (
                        <motion.div
                            key={layer}
                            className="absolute inset-0 rounded-lg border-2 shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                                borderColor: '#3730a3',
                                transform: `translateY(-${layer * 2}px) translateZ(${layer * 10}px)`,
                                zIndex: -layer,
                                boxShadow: `
                                    0 ${4 + layer * 2}px ${12 + layer * 4}px rgba(0, 0, 0, 0.4),
                                    inset 0 0 20px rgba(99, 102, 241, 0.2),
                                    0 0 ${30 + layer * 10}px rgba(99, 102, 241, 0.3)
                                `
                            }}
                            animate={{
                                boxShadow: [
                                    `0 ${4 + layer * 2}px ${12 + layer * 4}px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.2), 0 0 ${30 + layer * 10}px rgba(99, 102, 241, 0.3)`,
                                    `0 ${4 + layer * 2}px ${12 + layer * 4}px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.3), 0 0 ${40 + layer * 10}px rgba(99, 102, 241, 0.5)`,
                                    `0 ${4 + layer * 2}px ${12 + layer * 4}px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.2), 0 0 ${30 + layer * 10}px rgba(99, 102, 241, 0.3)`
                                ]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: layer * 0.1
                            }}
                        >
                            {/* Geometric frame */}
                            <div className="absolute inset-2 border border-indigo-400/30 rounded-sm" />

                            {/* Holographic pattern */}
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                        </motion.div>
                    ))}

                    {/* Pulsing energy core */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2"
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                        style={{
                            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, transparent 70%)'
                        }}
                    />
                </div>
            </motion.div>

            {/* Flying Cards */}
            <AnimatePresence>
                {animatingCards.map((target, index) => (
                    <motion.div
                        key={`deal-${target.playerIndex}-${index}`}
                        className="absolute w-16 h-24 rounded-lg border-2 shadow-2xl"
                        style={{
                            left: `calc(50% + ${deckPosition.x}px)`,
                            top: `calc(10% + ${deckPosition.y}px)`,
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                            borderColor: '#3730a3',
                            transformStyle: 'preserve-3d',
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity',
                            boxShadow: `
                                0 8px 16px rgba(0, 0, 0, 0.3),
                                0 0 40px rgba(99, 102, 241, 0.4),
                                inset 0 0 20px rgba(99, 102, 241, 0.2)
                            `
                        }}
                        custom={{
                            x: target.x,
                            y: target.y,
                            playerIndex: target.playerIndex,
                            rotation: 0
                        }}
                        variants={cardDealVariants}
                        initial="initial"
                        animate="dealing"
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{
                            delay: index * (POKER_ANIMATIONS.CARD_DEAL_STAGGER / 1000)
                        }}
                    >
                        {/* Card back design */}
                        <div className="w-full h-full relative overflow-hidden rounded-lg">
                            {/* Diagonal pattern */}
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />

                            {/* Geometric frame */}
                            <div className="absolute inset-2 border border-indigo-400/30 rounded-sm" />

                            {/* Trail effect during flight */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                animate={{
                                    opacity: [0, 0.5, 0]
                                }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)',
                                    filter: 'blur(8px)'
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
