import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Users, Coins, Bot, Zap, Trophy, Info } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import type { AIDifficulty } from '@/lib/poker/types';
import { POKER_CONSTANTS, AI_COIN_MODIFIERS } from '@/lib/poker/types';

interface PokerLobbyProps {
    onBack: () => void;
}

export const PokerLobby: React.FC<PokerLobbyProps> = ({ onBack }) => {
    const { currentUser, orbitPoints, fetchPokerLobbyGames, pokerLobbyGames, isPokerLoading, createPokerGame, joinPokerGame } = useOrbitStore();
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchPokerLobbyGames();
        // Poll for games every 10 seconds
        const interval = setInterval(fetchPokerLobbyGames, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateGame = async (buyIn: number, maxPlayers: number) => {
        await createPokerGame(buyIn, maxPlayers, 'multiplayer');
        setShowCreateModal(false);
    };

    const handlePlayAI = async (difficulty: AIDifficulty) => {
        await createPokerGame(50, 6, 'practice', difficulty);
    };

    const handleJoinGame = async (gameId: string) => {
        await joinPokerGame(gameId);
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-mono">POKER LOBBY</h2>
                            <p className="text-sm text-slate-400 font-mono">
                                {pokerLobbyGames.length} active games
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Current balance */}
                        <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="font-mono text-yellow-300 font-bold">{orbitPoints}</span>
                        </div>

                        {/* Create game button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/50"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden md:inline">Create Game</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* Quick Play Section */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        QUICK PLAY - Practice vs AI
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AIQuickPlayCard difficulty="novice" orbitPoints={orbitPoints} onPlay={handlePlayAI} />
                        <AIQuickPlayCard difficulty="intermediate" orbitPoints={orbitPoints} onPlay={handlePlayAI} />
                        <AIQuickPlayCard difficulty="expert" orbitPoints={orbitPoints} onPlay={handlePlayAI} />
                    </div>
                </div>

                {/* Active Multiplayer Games */}
                <div>
                    <h3 className="text-xl font-bold text-purple-400 font-mono mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        MULTIPLAYER GAMES
                    </h3>

                    {isPokerLoading && pokerLobbyGames.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                            <p className="text-slate-500 font-mono">Loading tables...</p>
                        </div>
                    ) : pokerLobbyGames.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 font-mono mb-2">No active games</p>
                            <p className="text-slate-600 text-sm">Create a game to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pokerLobbyGames.map((game) => (
                                <GameCard key={game.id} game={game} onClick={() => handleJoinGame(game.id)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Game Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateGameModal
                        onClose={() => setShowCreateModal(false)}
                        onCreateGame={handleCreateGame}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// AI Quick Play Card
interface AIQuickPlayCardProps {
    difficulty: AIDifficulty;
    orbitPoints: number;
    onPlay: (difficulty: AIDifficulty) => void;
}

const AIQuickPlayCard: React.FC<AIQuickPlayCardProps> = ({ difficulty, orbitPoints, onPlay }) => {
    const difficultyConfig = {
        novice: {
            title: 'Novice',
            description: 'Perfect for beginners',
            color: 'green',
            icon: '🌱',
            bgGradient: 'from-green-500/10 to-emerald-500/10',
            borderColor: 'border-green-500/30',
            textColor: 'text-green-400'
        },
        intermediate: {
            title: 'Intermediate',
            description: 'Balanced challenge',
            color: 'yellow',
            icon: '⚡',
            bgGradient: 'from-yellow-500/10 to-amber-500/10',
            borderColor: 'border-yellow-500/30',
            textColor: 'text-yellow-400'
        },
        expert: {
            title: 'Expert',
            description: 'For skilled players',
            color: 'red',
            icon: '🔥',
            bgGradient: 'from-red-500/10 to-orange-500/10',
            borderColor: 'border-red-500/30',
            textColor: 'text-red-400'
        }
    };

    const config = difficultyConfig[difficulty];
    const coinModifier = AI_COIN_MODIFIERS[difficulty];
    const reductionPercent = (1 - coinModifier) * 100;

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -4 }}
            className={`relative overflow-hidden rounded-xl border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} backdrop-blur p-6 cursor-pointer group`}
            onClick={() => onPlay(difficulty)}
        >
            <div className="absolute top-2 right-2 text-4xl opacity-20">{config.icon}</div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <Bot className={`w-5 h-5 ${config.textColor}`} />
                    <h4 className={`text-lg font-bold ${config.textColor} font-mono`}>{config.title}</h4>
                </div>
                <p className="text-slate-400 text-sm mb-4">{config.description}</p>

                {/* Coin reduction warning */}
                {reductionPercent > 0 && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700">
                        <div className="flex items-center gap-2 mb-1">
                            <Info className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-mono text-amber-400">PRACTICE MODE</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            -{reductionPercent}% coin rewards (encourages learning)
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-slate-500">BUY-IN: 50</div>
                    <div className={`px-3 py-1 rounded-full ${config.bgGradient} border ${config.borderColor} text-xs font-bold ${config.textColor}`}>
                        PLAY NOW
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Game Card (for multiplayer games)
interface GameCardProps {
    game: any; // TODO: Type properly
    onClick: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className="rounded-xl border-2 border-purple-500/30 bg-slate-900/50 p-5 cursor-pointer hover:border-purple-500/50 transition-colors"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="text-lg font-bold text-white mb-1">{game.host_username}'s Table</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{game.current_players}/{game.max_players} players</span>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-mono border border-green-500/40">
                    OPEN
                </div>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-mono text-yellow-400">{game.buy_in}</span>
                </div>
                <button className="ml-auto px-4 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-colors">
                    JOIN
                </button>
            </div>
        </motion.div>
    );
};

// Create Game Modal
interface CreateGameModalProps {
    onClose: () => void;
    onCreateGame: (buyIn: number, maxPlayers: number) => void;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({ onClose, onCreateGame }) => {
    const [buyIn, setBuyIn] = useState(100);
    const [maxPlayers, setMaxPlayers] = useState(6);

    const handleCreate = () => {
        onCreateGame(buyIn, maxPlayers);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 rounded-2xl border-2 border-purple-500/50 p-6 max-w-md w-full shadow-2xl shadow-purple-500/20"
            >
                <h3 className="text-2xl font-bold text-white mb-6 font-mono">CREATE GAME</h3>

                {/* Buy-in selector */}
                <div className="mb-6">
                    <label className="block text-sm font-mono text-slate-400 mb-3">BUY-IN AMOUNT</label>
                    <div className="grid grid-cols-5 gap-2">
                        {POKER_CONSTANTS.AVAILABLE_BUY_INS.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setBuyIn(amount)}
                                className={`px-3 py-2 rounded-lg font-mono font-bold transition-all ${buyIn === amount
                                    ? 'bg-purple-500 text-white scale-110'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Max players */}
                <div className="mb-6">
                    <label className="block text-sm font-mono text-slate-400 mb-3">MAX PLAYERS</label>
                    <div className="flex gap-2">
                        {[2, 4, 6].map((count) => (
                            <button
                                key={count}
                                onClick={() => setMaxPlayers(count)}
                                className={`flex-1 px-4 py-2 rounded-lg font-mono font-bold transition-all ${maxPlayers === count
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all"
                    >
                        Create Game
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
