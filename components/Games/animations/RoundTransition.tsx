import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock } from 'lucide-react';

interface RoundTransitionProps {
    show: boolean;
    roundNumber: number;
    winnerName: string;
    winningHand: string;
    countdown: number;
    onComplete: () => void;
}

export const RoundTransition: React.FC<RoundTransitionProps> = ({
    show,
    roundNumber,
    winnerName,
    winningHand,
    countdown,
    onComplete
}) => {
    const [timeLeft, setTimeLeft] = useState(countdown);

    useEffect(() => {
        if (!show) {
            setTimeLeft(countdown); // Reset timer when hidden
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [show, countdown]);

    // Separate effect to call onComplete to avoid setState during render
    useEffect(() => {
        if (show && timeLeft === 0) {
            // Call onComplete on next tick to avoid setState during render
            const timeout = setTimeout(() => {
                onComplete();
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [timeLeft, show, onComplete]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: -50 }}
                    className="bg-slate-900/90 border-2 border-cyan-500/50 rounded-2xl p-12 text-center max-w-lg"
                >
                    {/* Round Complete */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-4xl font-bold text-cyan-400 font-mono mb-2">
                            ROUND {roundNumber} COMPLETE
                        </h2>
                        <p className="text-xl text-cyan-300 font-mono mb-2">
                            Winner: {winnerName}
                        </p>
                        <p className="text-md text-cyan-500 font-mono mb-6">
                            {winningHand}
                        </p>
                    </motion.div>

                    {/* Countdown */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-3 text-cyan-400"
                    >
                        <Clock className="w-6 h-6" />
                        <span className="text-2xl font-mono font-bold">
                            Next round in {timeLeft}s
                        </span>
                    </motion.div>

                    {/* Decorative elements */}
                    <motion.div
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute -top-8 -right-8 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
