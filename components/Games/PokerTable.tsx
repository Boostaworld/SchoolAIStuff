import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { PokerCard } from './PokerCard';
import { PokerControls } from './PokerControls';
import { User, LogOut, Trophy, RefreshCw, Banknote } from 'lucide-react';
import { clsx } from 'clsx';
import { PokerGamePlayer, PokerGame } from '../../lib/poker/types';
import { detectAnimationTriggers } from '../../lib/poker/animationTriggers';
import { DealAnimation } from './animations/DealAnimation';
import { ChipStack } from './animations/ChipStack';
import { ActionFeedback } from './animations/ActionFeedback';
import { WinnerCelebration } from './animations/WinnerCelebration';
import { OrbitCoinTransfer } from './animations/OrbitCoinTransfer';
import { RoundTransition } from './animations/RoundTransition';

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
        leavePokerGame,
        cashOutAndLeave,
        addPokerAnimation,
        currentPokerAnimation
        ,
        rebuyPokerPlayer,
        lastPokerAIReasoning
    } = useOrbitStore();

    // Previous game state tracking for animation triggers
    const prevGameRef = useRef<PokerGame | null>(null);
    const [showCoinTransfer, setShowCoinTransfer] = useState(false);
    const [coinTransferAmount, setCoinTransferAmount] = useState(0);
    const [showBetAnimation, setShowBetAnimation] = useState(false);
    const [betAnimationAmount, setBetAnimationAmount] = useState(0);
    const [roundTransition, setRoundTransition] = useState({
        show: false,
        roundNumber: 1,
        winnerName: '',
        winningHand: '',
        countdown: 5
    });

    useEffect(() => {
        subscribeToPokerGame(gameId);
        return () => {
            unsubscribeFromPokerGame(gameId);
        };
    }, [gameId]);

    // Animation trigger detection
    useEffect(() => {
        if (!activePokerGame) return;

        const currentGame = activePokerGame.game;

        if (prevGameRef.current && currentGame) {
            const animations = detectAnimationTriggers(prevGameRef.current, currentGame);
            animations.forEach(anim => addPokerAnimation(anim));

            // SHOWDOWN: Detect round change to 'showdown'
            if (
                currentGame.current_round === 'showdown' &&
                prevGameRef.current.current_round !== 'showdown'
            ) {
                console.log('🎰 SHOWDOWN! Round ending, revealing hole cards...');

                // Trigger staggered card reveals
                const { players } = activePokerGame;
                players.forEach((player, index) => {
                    if (!player.is_folded && player.hole_cards?.length === 2) {
                        console.log(`Revealing ${player.username || player.ai_name}'s cards (delay: ${index * 150}ms)`);
                    }
                });
            }

            // Trigger round transition and coin transfer when winner is declared
            if (!prevGameRef.current.winner_id && currentGame.winner_id) {
                const { players } = activePokerGame;
                const winner = players.find(p => p.user_id === currentGame.winner_id || p.id === currentGame.winner_id);

                setRoundTransition({
                    show: true,
                    roundNumber: 1, // round_number not tracked in PokerGame type yet
                    winnerName: winner?.username || winner?.ai_name || 'Player',
                    winningHand: currentGame.winning_hand?.rankName || 'Unknown Hand',
                    countdown: 5
                });

                // Coin transfer animation (only for hero)
                if (currentGame.winner_id === currentUser?.id) {
                    const winnings = currentGame.final_pot_amount || currentGame.pot_amount;
                    setCoinTransferAmount(winnings);
                    setShowCoinTransfer(true);
                }
            }
        }

        prevGameRef.current = currentGame;
    }, [activePokerGame, addPokerAnimation, currentUser]);

    const handleLeave = async () => {
        await leavePokerGame(gameId);
        onLeave();
    };

    const handlePayout = async () => {
        await cashOutAndLeave(gameId);
        onLeave();
    };

    // Memoize derived game state safely
    const gameState = useMemo(() => {
        if (!activePokerGame) return null;
        const { game, players } = activePokerGame;

        // Calculate current highest bet on the table (safe access)
        const currentTableBet = Math.max(...(players?.map(p => p.current_bet) || [0]), 0);

        // Find hero
        const hero = players?.find(p => p.user_id === currentUser?.id);

        // Determine if it's hero's turn
        const isHeroTurn = hero && game.current_turn_player_id === hero.id && game.status === 'in_progress';

        // Calculate min raise (simplified: at least big blind above current table bet)
        const minRaise = Math.max(currentTableBet + (game.big_blind || 0), currentTableBet + 1);

        return {
            game,
            players,
            hero,
            currentTableBet,
            isHeroTurn,
            minRaise
        };
    }, [activePokerGame, currentUser]);

    // Defaults for when game is loading
    const game = gameState?.game;
    const players = gameState?.players || [];
    const hero = gameState?.hero;
    const currentTableBet = gameState?.currentTableBet || 0;
    const isHeroTurn = gameState?.isHeroTurn || false;
    const bigBlind = game?.big_blind || 0;
    const minRaise = Math.max(gameState?.minRaise || 0, currentTableBet + Math.max(bigBlind, 1));

    const heroSeat = hero?.position || 0;
    const heroChips = hero?.chips || 0;
    const heroIsBusted = heroChips <= 0;
    const isWaitingForPlayers = game?.status === 'waiting';

    // Calculate display positions relative to hero (Hero is always at bottom/index 0)
    const getDisplayPosition = (seatIndex: number) => {
        const totalSeats = game?.max_players || 6;
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

    const callAmount = Math.max(0, currentTableBet - (hero?.current_bet || 0));

    const computeSeatCoords = () => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
        return {
            0: { x: vw * 0.5, y: vh * 0.82 },
            1: { x: vw * 0.2, y: vh * 0.68 },
            2: { x: vw * 0.2, y: vh * 0.32 },
            3: { x: vw * 0.5, y: vh * 0.18 },
            4: { x: vw * 0.8, y: vh * 0.32 },
            5: { x: vw * 0.8, y: vh * 0.68 }
        } as Record<number, { x: number; y: number }>;
    };

    const seatCoordinates = useMemo(() => {
        const coords = computeSeatCoords();
        const map: Record<string, { x: number; y: number }> = {};
        players.forEach(player => {
            const displayPos = getDisplayPosition(player.position);
            map[player.id] = coords[displayPos] || { x: coords[0].x, y: coords[0].y };
        });
        return map;
    }, [players, heroSeat, game]); // Depends on game for max_players in getDisplayPosition

    const deckOrigin = useMemo(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
        return { x: vw / 2, y: vh * 0.1 };
    }, []);

    // Transient display for last AI reasoning
    const [showAIReasoning, setShowAIReasoning] = useState(false);
    useEffect(() => {
        if (lastPokerAIReasoning) {
            setShowAIReasoning(true);
            const t = setTimeout(() => setShowAIReasoning(false), 8000);
            return () => clearTimeout(t);
        }
    }, [lastPokerAIReasoning?.playerId, lastPokerAIReasoning?.action, lastPokerAIReasoning?.reasoning]);

    const currentAnimationElement = useMemo(() => {
        if (!currentPokerAnimation) return null;
        if (!game) return null;

        if (currentPokerAnimation.type === 'pot_to_winner' || currentPokerAnimation.type === 'chip_to_pot') {
            return null;
        }

        if (currentPokerAnimation.type === 'deal_cards') {
            const targets = players.flatMap((player, idx) => {
                const seat = seatCoordinates[player.id] || deckOrigin;
                const offset = 12;
                return [
                    { x: seat.x - deckOrigin.x - offset, y: seat.y - deckOrigin.y, playerIndex: idx },
                    { x: seat.x - deckOrigin.x + offset, y: seat.y - deckOrigin.y, playerIndex: idx }
                ];
            });

            return (
                <DealAnimation
                    targets={targets}
                    deckPosition={{ x: 0, y: 0 }}
                />
            );
        }

        if (
            currentPokerAnimation.type === 'reveal_flop' ||
            currentPokerAnimation.type === 'reveal_turn' ||
            currentPokerAnimation.type === 'reveal_river'
        ) {
            const label = currentPokerAnimation.type === 'reveal_flop'
                ? 'Flop Revealed'
                : currentPokerAnimation.type === 'reveal_turn'
                    ? 'Turn Revealed'
                    : 'River Revealed';

            const cards = currentPokerAnimation.data?.cards || [];

            return (
                <AnimatePresence>
                    <motion.div
                        key={currentPokerAnimation.id}
                        className="absolute inset-0 flex items-start justify-center pt-12 pointer-events-none"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="px-6 py-3 rounded-full bg-slate-900/90 border border-cyan-500/50 shadow-2xl text-cyan-100 font-mono flex items-center gap-3">
                            <span className="text-sm tracking-widest">{label}</span>
                            {cards.length > 0 && (
                                <span className="text-xs text-cyan-200/80">
                                    {cards.join(' ')}
                                </span>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            );
        }

        return null;
    }, [currentPokerAnimation, game, players, seatCoordinates, deckOrigin]);

    const winnerPlayer = players.find(p =>
        game?.winner_id === p.user_id ||
        game?.winner_id === p.id ||
        game?.winner_player_id === p.id
    );

    const winningHandData = game?.winning_hand
        ? (typeof game.winning_hand === 'string'
            ? { rankName: game.winning_hand, rank: 0 as any, cards: [], highCards: [] }
            : game.winning_hand)
        : null;

    const hasWinner = game?.status === 'completed' && winningHandData; // Allow winner even if winnerPlayer not found for AI

    // --- RENDER LOADING STATE HERE (After all hooks) ---
    if (!gameState || !game || !currentUser) {
        return (
            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                <div className="absolute bottom-10 text-slate-500 text-sm">Initializing Poker Table...</div>
            </div>
        );
    }

    // Main render starts here
    return (
        <div
            className="relative w-full min-h-screen bg-slate-950 overflow-hidden flex flex-col"
            style={{ paddingTop: 'var(--orbit-hud-height, 72px)' }}
        >
            {showAIReasoning && lastPokerAIReasoning && (
                <div className="absolute bottom-24 right-4 z-50 max-w-sm bg-slate-900/90 border border-cyan-500/40 shadow-xl rounded-lg px-4 py-3 text-slate-100 font-mono pointer-events-none">
                    <div className="text-[11px] uppercase tracking-wide text-cyan-300">AI reasoning</div>
                    <div className="text-sm text-cyan-100 mt-1">
                        {lastPokerAIReasoning.name} • {lastPokerAIReasoning.action.toUpperCase()}
                        {lastPokerAIReasoning.amount > 0 ? ` ${lastPokerAIReasoning.amount}` : ''} • {lastPokerAIReasoning.round}
                    </div>
                    <div className="text-xs text-slate-300 mt-2 leading-snug">
                        {lastPokerAIReasoning.reasoning}
                    </div>
                </div>
            )}

            {/* Coin Transfer Animation (Pot → Orbit Points for winner) */}
            {/* DISABLED: Coin animation causes lag */}
            {/* {showCoinTransfer && game.winner_id === currentUser?.id && (
                    <OrbitCoinTransfer
                        amount={coinTransferAmount}
                        direction="toOrbit"
                        onComplete={() => setShowCoinTransfer(false)}
                    />
                )} */}

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

                <button
                    onClick={handlePayout}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-2 pointer-events-auto"
                >
                    <Banknote className="w-4 h-4" />
                    <span className="font-mono text-sm">PAYOUT & LEAVE</span>
                    <span className="text-xs text-emerald-200/70">({heroChips} chips)</span>
                </button>
            </div >

            {/* Main Table Area */}
            < div className="flex-1 flex items-center justify-center relative perspective-1000 px-2 md:px-4" >
                {/* The Table */}
                < div className="relative w-[800px] h-[560px] bg-[#1a2c4e] rounded-[200px] border-[16px] border-[#2a3c5e] shadow-2xl shadow-black/50 flex items-center justify-center" >
                    {/* Felt Texture/Pattern */}
                    < div className="absolute inset-0 rounded-[180px] opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none" ></div >

                    {/* Center Logo */}
                    < div className="absolute opacity-10 pointer-events-none" >
                        <Trophy className="w-32 h-32 text-white" />
                    </div >

                    {/* Community Cards */}
                    < div className="flex gap-3 z-10" >
                        {
                            game.community_cards.map((cardRaw, i) => {
                                // Helper to parse card if string
                                let card = cardRaw as any;
                                if (typeof cardRaw === 'string') {
                                    const suitMap: Record<string, string> = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
                                    let rankStr, suitChar;
                                    if (cardRaw.startsWith('10')) {
                                        rankStr = '10';
                                        suitChar = cardRaw.charAt(2);
                                    } else {
                                        rankStr = cardRaw.charAt(0);
                                        suitChar = cardRaw.charAt(1);
                                    }
                                    card = { rank: rankStr, suit: suitMap[suitChar] };
                                }

                                return (
                                    <PokerCard
                                        key={`community-${i}-${card.rank}-${card.suit}`}
                                        card={card}
                                        size="md"
                                        className="shadow-lg"
                                    />
                                );
                            })
                        }
                        {/* Placeholders for missing cards */}
                        {
                            Array.from({ length: 5 - game.community_cards.length }).map((_, i) => (
                                <div key={`placeholder-${i}`} className="w-16 h-24 rounded-lg border-2 border-dashed border-white/10 bg-white/5"></div>
                            ))
                        }
                    </div >

                    {/* Pot Display */}
                    < div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-1 rounded-full border border-white/10 backdrop-blur-sm" >
                        <span className="text-amber-400 font-mono font-bold">Pot: {game.pot_amount}</span>
                    </div >

                    {/* Players */}
                    {
                        players.map((player) => {
                            const displayPos = getDisplayPosition(player.position);

                            if (player.user_id === currentUser?.id) {
                                console.log('🃏 HERO RENDER:', { id: player.id, cards: player.hole_cards, folded: player.is_folded });
                            }

                            // Strict ID Comparison for turn
                            const isPlayerTurn = game.current_turn_player_id === player.id && game.status === 'in_progress';

                            // Winner check: Must have a winner AND match this player
                            // For AI bots, use player.id; for humans, use user_id
                            const isWinner = game.status === 'completed' && (
                                game.winner_id === player.user_id ||
                                game.winner_id === player.id ||
                                game.winner_player_id === player.id
                            );

                            // Should this player's cards be visible to the hero?
                            const isHero = player.user_id === currentUser?.id;
                            const isShowdown = game.current_round === 'showdown' && !player.is_folded;
                            const shouldShowCards = isHero || isShowdown;

                            return (
                                <div
                                    key={player.id}
                                    className={clsx(
                                        "absolute flex flex-col items-center gap-2 transition-all duration-500",
                                        positionStyles[displayPos]
                                    )}
                                >
                                    {/* Cards (Hole Cards) */}
                                    <div className="flex gap-1 mb-2">
                                        {player.hole_cards?.map((cardRaw, i) => {
                                            // Helper to parse card if string
                                            let card = cardRaw as any;
                                            if (typeof cardRaw === 'string') {
                                                const suitMap: Record<string, string> = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
                                                let rankStr, suitChar;
                                                if (cardRaw.startsWith('10')) {
                                                    rankStr = '10';
                                                    suitChar = cardRaw.charAt(2);
                                                } else {
                                                    rankStr = cardRaw.charAt(0);
                                                    suitChar = cardRaw.charAt(1);
                                                }
                                                card = { rank: rankStr, suit: suitMap[suitChar] };
                                            }

                                            return (
                                                <PokerCard
                                                    key={i}
                                                    card={card}
                                                    // If shouldShowCards is false, pass no card (shows back)
                                                    hidden={!shouldShowCards}
                                                    size="sm"
                                                    className={clsx(
                                                        "origin-bottom transition-transform hover:-translate-y-2",
                                                        i === 1 && "rotate-6"
                                                    )}
                                                    isWinner={isWinner}
                                                />
                                            );
                                        })}
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
                        })
                    }
                </div >
            </div >

            {/* Controls / Waiting / Rebuy Area */}
            <div className="h-32 w-full bg-gradient-to-t from-slate-950 to-transparent relative z-40">
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl">
                    {heroIsBusted ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-900/80 border border-red-500/40 rounded-xl text-red-200">
                            <div className="font-mono text-sm">You are out of chips.</div>
                            <button
                                onClick={() => rebuyPokerPlayer(gameId)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/60 rounded-lg text-red-100 font-mono text-sm transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Rebuy and Rejoin</span>
                            </button>
                        </div>
                    ) : isWaitingForPlayers ? (
                        <div className="flex items-center justify-center gap-3 p-4 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-200 font-mono text-sm">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Waiting for opponents to join/rebuy...
                        </div>
                    ) : (
                        <PokerControls
                            onAction={(action, amount) => {
                                // Normalize wager amount so we always send the actual contribution
                                const resolvedAmount =
                                    action === 'call'
                                        ? callAmount
                                        : action === 'all_in'
                                            ? (hero?.chips || 0)
                                            : action === 'check'
                                                ? 0
                                                : amount;

                                // Trigger bet animation for call/raise/all-in
                                if (action === 'call' && resolvedAmount && resolvedAmount > 0) {
                                    setBetAnimationAmount(resolvedAmount);
                                    setShowBetAnimation(true);
                                } else if (action === 'raise' && resolvedAmount) {
                                    setBetAnimationAmount(resolvedAmount);
                                    setShowBetAnimation(true);
                                } else if (action === 'all_in' && resolvedAmount) {
                                    setBetAnimationAmount(resolvedAmount);
                                    setShowBetAnimation(true);
                                }

                                performPokerAction(gameId, action, resolvedAmount);
                            }}
                            minRaise={minRaise}
                            maxRaise={hero?.chips || 0}
                            currentBet={currentTableBet}
                            playerChips={hero?.chips || 0}
                            isTurn={isHeroTurn}
                            canCheck={callAmount === 0}
                        />
                    )}
                </div>
            </div>

            {/* Betting Animation (Orbit → Pot) */}
            {/* DISABLED: Coin animation causes lag */}
            {/* {showBetAnimation && (
                <OrbitCoinTransfer
                    amount={betAnimationAmount}
                    direction="fromOrbit"
                    onComplete={() => setShowBetAnimation(false)}
                />
            )} */}

            {/* Round Transition UI */}
            < RoundTransition
                show={roundTransition.show}
                roundNumber={roundTransition.roundNumber}
                winnerName={roundTransition.winnerName}
                winningHand={roundTransition.winningHand}
                countdown={roundTransition.countdown}
                onComplete={() => setRoundTransition({ ...roundTransition, show: false })}
            />
        </div >
    );
};
