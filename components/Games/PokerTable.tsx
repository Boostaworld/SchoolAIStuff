import React, { useEffect, useMemo } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { PokerCard } from './PokerCard';
import { PokerControls } from './PokerControls';
import { User, LogOut, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { PokerGamePlayer } from '../../lib/poker/types';

interface PokerTableProps {
    gameId: string;
    onLeave: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({ gameId, onLeave }) => {
    const {
        activePokerGame,
        currentUser,
        subscribeToPokerGame,
        unsubscribeFromPokerGame,
        performPokerAction,
        leavePokerGame
    } = useOrbitStore();

    useEffect(() => {
        subscribeToPokerGame(gameId);
        return () => {
            unsubscribeFromPokerGame(gameId);
        };
    }, [gameId]);

    const handleLeave = async () => {
        await leavePokerGame(gameId);
        onLeave();
    };

    // Memoize derived game state
    const gameState = useMemo(() => {
        if (!activePokerGame) return null;
        const { game, players } = activePokerGame;

        // Calculate current highest bet on the table
        const currentTableBet = Math.max(...players.map(p => p.current_bet), 0);

        // Find hero
        const hero = players.find(p => p.user_id === currentUser?.id);

        // Determine if it's hero's turn
        const isHeroTurn = hero && game.current_turn_player_id === hero.id && game.status === 'in_progress';

        // Calculate min raise (simplified: current bet + big blind)
        const minRaise = currentTableBet + game.big_blind;

        return {
            game,
            players,
            hero,
            currentTableBet,
            isHeroTurn,
            minRaise
        };
    }, [activePokerGame, currentUser]);

    if (!gameState || !currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    const { game, players, hero, currentTableBet, isHeroTurn, minRaise } = gameState;
    const heroSeat = hero?.position || 0;

    // Calculate display positions relative to hero (Hero is always at bottom/index 0)
    const getDisplayPosition = (seatIndex: number) => {
        const totalSeats = game.max_players;
        return (seatIndex - heroSeat + totalSeats) % totalSeats;
    };

    // Map players to display positions
    const positionStyles: Record<number, string> = {
        0: "bottom-4 left-1/2 -translate-x-1/2",
        1: "bottom-20 left-12",
        2: "top-20 left-12",
        3: "top-4 left-1/2 -translate-x-1/2",
        4: "top-20 right-12",
        5: "bottom-20 right-12"
    };

    const callAmount = currentTableBet - (hero?.current_bet || 0);

    return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 pointer-events-auto">
                    <h2 className="text-cyan-400 font-bold font-mono text-sm">
                        {game.game_type === 'practice' ? 'PRACTICE MODE' : 'MULTIPLAYER'}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-slate-400 font-mono mt-1">
                        <span>Blinds: {game.small_blind}/{game.big_blind}</span>
                        <span>Stage: {game.community_cards.length === 0 ? 'Pre-Flop' : game.community_cards.length === 3 ? 'Flop' : game.community_cards.length === 4 ? 'Turn' : 'River'}</span>
                        <span>ID: {game.id.slice(0, 8)}</span>
                    </div>
                </div>

                <button
                    onClick={handleLeave}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg border border-red-500/30 transition-colors flex items-center gap-2 pointer-events-auto"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="font-mono text-sm">LEAVE</span>
                </button>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 flex items-center justify-center relative perspective-1000">
                {/* The Table */}
                <div className="relative w-[800px] h-[400px] bg-[#1a2c4e] rounded-[200px] border-[16px] border-[#2a3c5e] shadow-2xl shadow-black/50 flex items-center justify-center">
                    {/* Felt Texture/Pattern */}
                    <div className="absolute inset-0 rounded-[180px] opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>

                    {/* Center Logo */}
                    <div className="absolute opacity-10 pointer-events-none">
                        <Trophy className="w-32 h-32 text-white" />
                    </div>

                    {/* Community Cards */}
                    <div className="flex gap-3 z-10">
                        {game.community_cards.map((card, i) => (
                            <PokerCard
                                key={`${card.rank}-${card.suit}`}
                                card={card}
                                size="md"
                                className="shadow-lg"
                            />
                        ))}
                        {/* Placeholders for missing cards */}
                        {Array.from({ length: 5 - game.community_cards.length }).map((_, i) => (
                            <div key={`placeholder-${i}`} className="w-16 h-24 rounded-lg border-2 border-dashed border-white/10 bg-white/5"></div>
                        ))}
                    </div>

                    {/* Pot Display */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                        <span className="text-amber-400 font-mono font-bold">Pot: {game.pot_amount}</span>
                    </div>

                    {/* Players */}
                    {players.map((player) => {
                        const displayPos = getDisplayPosition(player.position);

                        // Strict ID Comparison for turn
                        const isPlayerTurn = game.current_turn_player_id === player.id && game.status === 'in_progress';

                        const isWinner = game.winner_id === player.user_id;

                        return (
                            <div
                                key={player.id}
                                className={clsx(
                                    "absolute flex flex-col items-center gap-2 transition-all duration-500",
                                    positionStyles[displayPos]
                                )}
                            >
                                {/* Cards (Hole Cards) */}
                                <div className="flex -space-x-4 mb-2">
                                    {player.hole_cards?.map((card, i) => (
                                        <PokerCard
                                            key={i}
                                            card={card}
                                            hidden={player.user_id !== currentUser.id && game.status !== 'completed'}
                                            size="sm"
                                            className={clsx(
                                                "origin-bottom transition-transform hover:-translate-y-2",
                                                i === 1 && "rotate-6"
                                            )}
                                            isWinner={isWinner}
                                        />
                                    ))}
                                    {(!player.hole_cards || player.hole_cards.length === 0) && !player.is_folded && (
                                        game.status !== 'waiting' && (
                                            <>
                                                <PokerCard hidden size="sm" className="-rotate-6" />
                                                <PokerCard hidden size="sm" className="rotate-6 -ml-4" />
                                            </>
                                        )
                                    )}
                                </div>

                                {/* Avatar & Info */}
                                <div className={clsx(
                                    "relative group",
                                    isPlayerTurn && "scale-110"
                                )}>
                                    {/* Turn Indicator Ring */}
                                    {isPlayerTurn && (
                                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-spin-slow opacity-75 blur-sm"></div>
                                    )}

                                    {/* Winner Indicator */}
                                    {isWinner && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
                                            <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
                                        </div>
                                    )}

                                    <div className={clsx(
                                        "relative w-16 h-16 rounded-full border-2 overflow-hidden bg-slate-800 shadow-xl",
                                        isPlayerTurn ? "border-cyan-400" : player.is_folded ? "border-slate-700 opacity-50 grayscale" : "border-slate-600",
                                        isWinner && "border-yellow-400 ring-2 ring-yellow-400/50"
                                    )}>
                                        {player.avatar ? (
                                            <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-700">
                                                <User className="w-8 h-8 text-slate-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Dealer Button */}
                                    {game.dealer_position === player.position && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-slate-300 flex items-center justify-center shadow-md z-10">
                                            <span className="text-[10px] font-bold text-black">D</span>
                                        </div>
                                    )}

                                    {/* Name & Stack */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-center min-w-[100px] shadow-lg">
                                        <div className="text-xs font-bold text-slate-200 truncate max-w-[80px]">{player.username || player.ai_name}</div>
                                        <div className="text-[10px] font-mono text-amber-400 flex items-center justify-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            {player.chips}
                                        </div>
                                    </div>

                                    {/* Current Bet Bubble */}
                                    {player.current_bet > 0 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-600">
                                            <span className="text-xs font-mono text-cyan-300">{player.current_bet}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls Area (Fixed Bottom) */}
            <div className="h-32 w-full bg-gradient-to-t from-slate-950 to-transparent relative z-40">
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl">
                    <PokerControls
                        onAction={(action, amount) => performPokerAction(gameId, action, amount)}
                        minRaise={minRaise}
                        maxRaise={hero?.chips || 0}
                        currentBet={currentTableBet}
                        playerChips={hero?.chips || 0}
                        isTurn={isHeroTurn}
                        canCheck={callAmount === 0}
                    />
                </div>
            </div>
        </div>
    );
};
