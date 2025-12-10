import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Sparkles, Trophy, TrendingUp, Clock } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import { PokerTable } from './PokerTable';
import { PokerLobby } from './PokerLobby';

export const GamesHub: React.FC = () => {
    const { currentUser, orbitPoints, activePokerGame } = useOrbitStore();
    const [view, setView] = React.useState<'hub' | 'lobby' | 'poker-table'>('hub');
    const [activeGameId, setActiveGameId] = React.useState<string | null>(null);

    // Hash-based routing for games
    React.useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1); // Remove #
            const [section, param] = hash.split('/');

            if (section === 'games') {
                if (param && param.startsWith('poker_game=')) {
                    const gameId = param.split('=')[1];
                    setActiveGameId(gameId);
                    setView('poker-table');
                } else if (param === 'lobby') {
                    setView('lobby');
                } else {
                    setView('hub');
                }
            }
        };

        // Initial check
        handleHashChange();

        // Listen for changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Mock stats - will be replaced with real data
    const stats = {
        gamesPlayed: 0,
        totalWinnings: 0,
        biggestWin: 0,
        winRate: 0
    };

    if (view === 'poker-table' && activeGameId) {
        return <PokerTable gameId={activeGameId} onLeave={() => window.location.hash = 'games/lobby'} />;
    }

    if (view === 'lobby') {
        return <PokerLobby onBack={() => window.location.hash = 'games'} />;
    }

    return (
        <div className="w-full h-full overflow-y-auto p-3 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50"
                    >
                        <Gamepad2 className="w-7 h-7 text-white" />
                    </motion.div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white font-mono tracking-wider">
                            GAMES HUB
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40">
                                <span className="text-xs font-mono text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Work in Progress
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-slate-400 text-sm md:text-base font-mono">
                    Compete, win coins, and climb the leaderboards
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                <StatCard
                    icon={<Gamepad2 className="w-5 h-5" />}
                    label="Games Played"
                    value={stats.gamesPlayed}
                    color="cyan"
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Total Winnings"
                    value={`${stats.totalWinnings} coins`}
                    color="green"
                />
                <StatCard
                    icon={<Trophy className="w-5 h-5" />}
                    label="Biggest Win"
                    value={`${stats.biggestWin} coins`}
                    color="yellow"
                />
                <StatCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Win Rate"
                    value={`${stats.winRate}%`}
                    color="purple"
                />
            </div>

            {/* Featured Game - Texas Hold'em Poker */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    FEATURED GAME
                </h2>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 md:p-8 cursor-pointer group"
                    onClick={() => window.location.hash = 'games/lobby'}
                >
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Floating particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
                                animate={{
                                    x: [Math.random() * 100, Math.random() * 100],
                                    y: [Math.random() * 100, Math.random() * 100],
                                    opacity: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2
                                }}
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                    Texas Hold'em Poker
                                </h3>
                                <p className="text-slate-300 mb-4">
                                    The classic poker game. Play against AI or challenge your friends in real-time multiplayer.
                                </p>

                                {/* Features */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge text="1v1 to 6 Players" color="purple" />
                                    <Badge text="AI Practice Mode" color="cyan" />
                                    <Badge text="Coin Rewards" color="yellow" />
                                    <Badge text="Real-time Multiplayer" color="green" />
                                </div>

                                {/* Buy-in options */}
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <span className="font-mono">BUY-INS:</span>
                                    <div className="flex gap-2">
                                        {[50, 100, 250, 500, 1000].map((amount) => (
                                            <span
                                                key={amount}
                                                className="px-2 py-1 rounded bg-slate-800/50 text-yellow-400 font-mono text-xs"
                                            >
                                                {amount}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-shadow flex items-center gap-2 justify-center"
                            >
                                <Gamepad2 className="w-6 h-6" />
                                <span>PLAY NOW</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Decorative cards */}
                    <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                        <div className="text-8xl">♠♥♦♣</div>
                    </div>
                </motion.div>
            </div>

            {/* Coming Soon Section */}
            <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-500 font-mono mb-4">
                    COMING SOON
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ComingSoonCard title="Blackjack" description="Beat the dealer" />
                    <ComingSoonCard title="Roulette" description="Spin to win" />
                    <ComingSoonCard title="Tournaments" description="Compete for glory" />
                </div>
            </div>
        </div >
    );
};

// Helper Components
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'cyan' | 'green' | 'yellow' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const colorClasses = {
        cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
        green: 'border-green-500/30 bg-green-500/5 text-green-400',
        yellow: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
        purple: 'border-purple-500/30 bg-purple-500/5 text-purple-400'
    };

    return (
        <div className={`rounded-xl border-2 ${colorClasses[color]} p-4 backdrop-blur`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-mono text-slate-400 uppercase">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">{value}</div>
        </div>
    );
};

interface BadgeProps {
    text: string;
    color: 'purple' | 'cyan' | 'yellow' | 'green';
}

const Badge: React.FC<BadgeProps> = ({ text, color }) => {
    const colorClasses = {
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        green: 'bg-green-500/20 text-green-300 border-green-500/40'
    };

    return (
        <span className={`px-3 py-1 rounded-full border text-xs font-mono ${colorClasses[color]}`}>
            {text}
        </span>
    );
};

const ComingSoonCard: React.FC<{ title: string; description: string }> = ({ title, description }) => {
    return (
        <div className="rounded-xl border-2 border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
            <h3 className="text-xl font-bold text-slate-600 mb-2">{title}</h3>
            <p className="text-sm text-slate-700">{description}</p>
            <div className="mt-4 px-3 py-1 rounded-full bg-slate-800/50 text-slate-600 text-xs font-mono inline-block">
                COMING SOON
            </div>
        </div>
    );
};
