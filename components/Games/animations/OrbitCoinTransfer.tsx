import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrbitCoinTransferProps {
    amount: number;
    direction: 'toOrbit' | 'fromOrbit'; // toOrbit = winning, fromOrbit = betting
    onComplete?: () => void;
}

// Individual coin component with NO infinite loops
const FlyingCoin: React.FC<{
    index: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    delay: number;
    direction: 'toOrbit' | 'fromOrbit';
    onArrival: () => void;
}> = ({ index, fromX, fromY, toX, toY, delay, direction, onArrival }) => {
    // Natural spread for organic coin scatter
    const spreadX = (Math.random() - 0.5) * 40;
    const spreadY = (Math.random() - 0.5) * 20;

    // Graceful arc path - higher arc for more dramatic effect
    const arcHeight = 120;
    const midX = (fromX + toX) / 2 + spreadX;
    const midY = Math.min(fromY, toY) - arcHeight + spreadY;

    // Flight duration - luxurious and smooth
    const FLIGHT_DURATION = 2.5;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: fromX - 16, // Center the 32px coin
                top: fromY - 16,
                zIndex: 200 + index,
                willChange: 'transform'
            }}
            initial={{
                x: 0,
                y: 0,
                scale: 0.5,
                rotate: 0,
                opacity: 0
            }}
            animate={{
                x: [0, midX - fromX, toX - fromX],
                y: [0, midY - fromY, toY - fromY],
                scale: [0.5, 1.1, direction === 'toOrbit' ? 0.4 : 0.6],
                rotate: [0, 180 + (Math.random() * 90), 360 + (Math.random() * 90)],
                opacity: [0, 1, 1, direction === 'toOrbit' ? 0 : 0.6]
            }}
            transition={{
                duration: FLIGHT_DURATION,
                delay,
                times: [0, 0.4, 1],
                ease: [0.34, 1.56, 0.64, 1] // Bounce ease
            }}
            onAnimationComplete={() => {
                onArrival();
            }}
        >
            {/* Golden Coin */}
            <div className="relative w-8 h-8">
                {/* Main coin body */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)',
                        boxShadow: `
                            0 6px 12px rgba(0, 0, 0, 0.5),
                            0 0 30px rgba(251, 191, 36, 0.7),
                            inset 0 3px 6px rgba(255, 255, 255, 0.4),
                            inset 0 -3px 6px rgba(0, 0, 0, 0.3)
                        `
                    }}
                >
                    {/* Inner ring */}
                    <div className="absolute inset-1.5 rounded-full border-2 border-yellow-200/50" />

                    {/* Center value */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
                            }}
                        >
                            <span className="text-[9px] font-bold font-mono" style={{ color: '#92400e' }}>
                                $
                            </span>
                        </div>
                    </div>

                    {/* One-time shimmer effect during flight only */}
                    <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0] }}
                        transition={{
                            duration: FLIGHT_DURATION,
                            times: [0, 0.3, 1],
                            ease: 'easeInOut'
                        }}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                                transform: 'translateX(-100%)',
                                animation: `shimmer ${FLIGHT_DURATION}s ease-in-out forwards`,
                                animationDelay: `${delay}s`
                            }}
                        />
                    </motion.div>
                </div>

                {/* Trailing glow (fades out, doesn't loop) */}
                <motion.div
                    className="absolute inset-0 rounded-full blur-lg -z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: [0, 0.6, 0.4, 0],
                        scale: [0.8, 1.3, 1.5, 1.8]
                    }}
                    transition={{
                        duration: FLIGHT_DURATION,
                        times: [0, 0.2, 0.6, 1],
                        ease: 'easeOut'
                    }}
                    style={{
                        background: direction === 'toOrbit'
                            ? 'radial-gradient(circle, rgba(34, 197, 94, 0.6) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)'
                    }}
                />
            </div>

            {/* Shimmer keyframe animation */}
            <style>
                {`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                `}
            </style>
        </motion.div>
    );
};

export const OrbitCoinTransfer: React.FC<OrbitCoinTransferProps> = ({
    amount,
    direction,
    onComplete
}) => {
    const [isActive, setIsActive] = useState(true);
    const [coinsArrived, setCoinsArrived] = useState(0);
    const completedRef = useRef(false);

    // Find ACTUAL element positions using DOM queries
    const [positions, setPositions] = useState<{
        orbitX: number;
        orbitY: number;
        potX: number;
        potY: number;
    } | null>(null);

    // Calculate positions on mount
    useEffect(() => {
        // Find Orbit Points counter (in header, has coin indicator)
        const orbitCounter = document.querySelector('[class*="orbit"]') ||
                           document.querySelector('.text-amber-400') ||
                           document.querySelector('.font-mono');

        // Find pot display on table (center of table)
        const potDisplay = document.querySelector('[class*="pot"]') ||
                          Array.from(document.querySelectorAll('.text-amber-400')).find(el =>
                              el.textContent?.toLowerCase().includes('pot')
                          );

        if (orbitCounter && potDisplay) {
            const orbitRect = orbitCounter.getBoundingClientRect();
            const potRect = potDisplay.getBoundingClientRect();

            setPositions({
                orbitX: orbitRect.left + orbitRect.width / 2,
                orbitY: orbitRect.top + orbitRect.height / 2,
                potX: potRect.left + potRect.width / 2,
                potY: potRect.top + potRect.height / 2
            });
        } else {
            // Fallback to reasonable estimates if elements not found
            setPositions({
                orbitX: 150,
                orbitY: 60,
                potX: window.innerWidth / 2,
                potY: window.innerHeight * 0.45
            });
        }
    }, []);

    // Number of coins based on amount (3-12 coins)
    const coinCount = Math.min(12, Math.max(3, Math.floor(amount / 15)));

    // Stagger delay between coins for natural flow
    const STAGGER_DELAY = 0.12;
    const FLIGHT_DURATION = 2.5;

    // Total animation time
    const totalDuration = (coinCount * STAGGER_DELAY + FLIGHT_DURATION) * 1000;

    // Handle coin arrival
    const handleCoinArrival = () => {
        setCoinsArrived(prev => prev + 1);
    };

    // Cleanup when all coins arrive
    useEffect(() => {
        if (coinsArrived >= coinCount && !completedRef.current) {
            completedRef.current = true;
            const timer = setTimeout(() => {
                setIsActive(false);
                onComplete?.();
            }, 400); // Small delay after last coin

            return () => clearTimeout(timer);
        }
    }, [coinsArrived, coinCount, onComplete]);

    // Don't render until we have positions
    if (!positions) return null;

    const fromX = direction === 'toOrbit' ? positions.potX : positions.orbitX;
    const fromY = direction === 'toOrbit' ? positions.potY : positions.orbitY;
    const toX = direction === 'toOrbit' ? positions.orbitX : positions.potX;
    const toY = direction === 'toOrbit' ? positions.orbitY : positions.potY;

    return (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 150 }}>
            <AnimatePresence mode="wait">
                {isActive && (
                    <>
                        {/* Flying Coins */}
                        {[...Array(coinCount)].map((_, i) => (
                            <FlyingCoin
                                key={i}
                                index={i}
                                fromX={fromX}
                                fromY={fromY}
                                toX={toX}
                                toY={toY}
                                delay={i * STAGGER_DELAY}
                                direction={direction}
                                onArrival={handleCoinArrival}
                            />
                        ))}

                        {/* Amount Badge */}
                        <motion.div
                            className="absolute"
                            style={{
                                left: direction === 'toOrbit' ? toX : fromX,
                                top: (direction === 'toOrbit' ? toY : fromY) + 50,
                                transform: 'translate(-50%, 0)',
                                zIndex: 199
                            }}
                            initial={{ opacity: 0, y: -30, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.7 }}
                            transition={{
                                duration: 0.4,
                                ease: [0.34, 1.56, 0.64, 1]
                            }}
                        >
                            <div
                                className="px-5 py-2.5 rounded-2xl font-bold font-mono text-base backdrop-blur-md"
                                style={{
                                    background: direction === 'toOrbit'
                                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)'
                                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
                                    border: direction === 'toOrbit'
                                        ? '2px solid rgba(74, 222, 128, 0.9)'
                                        : '2px solid rgba(252, 165, 165, 0.9)',
                                    boxShadow: direction === 'toOrbit'
                                        ? '0 0 40px rgba(34, 197, 94, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.3)'
                                        : '0 0 40px rgba(239, 68, 68, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                                }}
                            >
                                {direction === 'toOrbit' ? '+' : '−'}{amount}
                            </div>
                        </motion.div>

                        {/* Destination Pulse (winning only) */}
                        {direction === 'toOrbit' && (
                            <motion.div
                                className="absolute rounded-full blur-3xl pointer-events-none"
                                style={{
                                    left: toX,
                                    top: toY,
                                    width: 200,
                                    height: 200,
                                    transform: 'translate(-50%, -50%)',
                                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                                    zIndex: 148
                                }}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{
                                    scale: [0.5, 1.5, 1],
                                    opacity: [0, 0.7, 0]
                                }}
                                transition={{
                                    duration: totalDuration / 1000,
                                    times: [0, 0.5, 1],
                                    ease: 'easeOut'
                                }}
                            />
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
