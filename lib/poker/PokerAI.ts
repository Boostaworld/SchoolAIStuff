// =============================================
// POKER AI - Opponent Logic
// =============================================

import {
    PokerCard,
    PokerGamePlayer,
    PokerActionType,
    AIDifficulty,
    AI_DIFFICULTY_SETTINGS,
    BettingRound
} from './types';
import { evaluateHand, HandRank } from './PokerEngine';

// =============================================
// HAND STRENGTH CALCULATION
// =============================================

/**
 * Calculate hand strength (0-1) based on hole cards and community cards
 */
function calculateHandStrength(
    holeCards: PokerCard[],
    communityCards: PokerCard[]
): number {
    if (holeCards.length < 2) return 0;

    const allCards = [...holeCards, ...communityCards];

    // Pre-flop: Evaluate pocket cards only
    if (communityCards.length === 0) {
        return evaluatePreFlopStrength(holeCards);
    }

    // Post-flop: Evaluate best hand
    if (allCards.length >= 5) {
        const hand = evaluateHand(allCards);
        return normalizeHandRank(hand.rank);
    }

    return 0.5; // Default
}

/**
 * Evaluate pre-flop hand strength
 */
function evaluatePreFlopStrength(holeCards: PokerCard[]): number {
    const [card1, card2] = holeCards;
    const val1 = getRankValue(card1.rank);
    const val2 = getRankValue(card2.rank);

    const isPair = card1.rank === card2.rank;
    const isSuited = card1.suit === card2.suit;
    const highCardValue = Math.max(val1, val2);
    const lowCardValue = Math.min(val1, val2);
    const gap = highCardValue - lowCardValue;

    let strength = 0.3; // Base strength

    // Pairs are strong
    if (isPair) {
        strength += 0.4;
        strength += (highCardValue / 14) * 0.2; // Higher pairs are better
    } else {
        // High cards
        strength += (highCardValue / 14) * 0.2;
        strength += (lowCardValue / 14) * 0.1;

        // Suited cards
        if (isSuited) {
            strength += 0.1;
        }

        // Connected cards (potential straight)
        if (gap <= 4) {
            strength += (5 - gap) * 0.02;
        }
    }

    return Math.min(strength, 1.0);
}

/**
 * Normalize hand rank to 0-1 scale
 */
function normalizeHandRank(rank: HandRank): number {
    // Map hand ranks to strength values
    const strengthMap: Record<HandRank, number> = {
        [HandRank.HIGH_CARD]: 0.1,
        [HandRank.ONE_PAIR]: 0.3,
        [HandRank.TWO_PAIR]: 0.5,
        [HandRank.THREE_OF_A_KIND]: 0.6,
        [HandRank.STRAIGHT]: 0.7,
        [HandRank.FLUSH]: 0.75,
        [HandRank.FULL_HOUSE]: 0.85,
        [HandRank.FOUR_OF_A_KIND]: 0.93,
        [HandRank.STRAIGHT_FLUSH]: 0.98,
        [HandRank.ROYAL_FLUSH]: 1.0
    };

    return strengthMap[rank] || 0.5;
}

function getRankValue(rank: string): number {
    const values: Record<string, number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
}

// =============================================
// POSITION ANALYSIS
// =============================================

/**
 * Calculate position advantage (0-1)
 * Later positions have more information and can play more hands
 */
function getPositionStrength(position: number, dealerPosition: number, totalPlayers: number): number {
    const relativePosition = (position - dealerPosition + totalPlayers) % totalPlayers;

    // Dealer and cutoff (last 2 positions) have best position
    if (relativePosition >= totalPlayers - 2) return 0.9;

    // Middle positions
    if (relativePosition >= totalPlayers / 2) return 0.6;

    // Early positions (blinds)
    return 0.3;
}

// =============================================
// AI DECISION MAKING
// =============================================

export interface AIDecision {
    action: PokerActionType;
    amount?: number;
    reasoning?: string; // For debugging
}

/**
 * Make an AI decision based on game state
 */
export function makeAIDecision(
    aiPlayer: PokerGamePlayer,
    difficulty: AIDifficulty,
    communityCards: PokerCard[],
    currentBet: number,
    potSize: number,
    dealerPosition: number,
    totalPlayers: number,
    round: BettingRound
): AIDecision {
    const settings = AI_DIFFICULTY_SETTINGS[difficulty];
    const handStrength = calculateHandStrength(aiPlayer.hole_cards, communityCards);
    const positionStrength = getPositionStrength(aiPlayer.position, dealerPosition, totalPlayers);
    const betToCall = currentBet - aiPlayer.current_bet;
    const potOdds = betToCall > 0 ? betToCall / (potSize + betToCall) : 0;

    // Adjust strength based on AI skill level
    const adjustedStrength = handStrength * settings.skill_level + (1 - settings.skill_level) * 0.5;

    // Calculate decision threshold based on position and pot odds
    let decisionThreshold = 0.5;
    decisionThreshold -= positionStrength * 0.1; // Better position = lower threshold
    decisionThreshold += potOdds * 0.2; // Higher pot odds = higher threshold

    // Decide whether to bluff
    const shouldBluff = Math.random() < settings.bluff_frequency &&
        positionStrength > 0.6 &&
        round !== 'pre_flop';

    // If bluffing, artificially boost hand strength
    const finalStrength = shouldBluff ? Math.min(adjustedStrength + 0.3, 1.0) : adjustedStrength;

    // =============================================
    // DECISION LOGIC
    // =============================================

    // Very weak hand - fold if there's a bet
    if (finalStrength < 0.2 && betToCall > 0) {
        return {
            action: 'fold',
            reasoning: `Weak hand (${finalStrength.toFixed(2)}), folding to bet`
        };
    }

    // Weak hand - check/fold
    if (finalStrength < decisionThreshold) {
        if (betToCall === 0) {
            return {
                action: 'check',
                reasoning: `Weak hand (${finalStrength.toFixed(2)}), checking`
            };
        } else {
            // Call if pot odds are favorable
            if (potOdds < 0.3) {
                return {
                    action: 'call',
                    reasoning: `Calling with weak hand, good pot odds`
                };
            } else {
                return {
                    action: 'fold',
                    reasoning: `Folding weak hand, poor pot odds`
                };
            }
        }
    }

    // Medium strength - call or check
    if (finalStrength < 0.7) {
        if (betToCall === 0) {
            // Occasionally raise with medium hands based on aggression
            if (Math.random() < settings.aggression * 0.3) {
                const raiseAmount = Math.floor(potSize * (0.3 + Math.random() * 0.3));
                return {
                    action: 'raise',
                    amount: Math.min(raiseAmount, aiPlayer.chips),
                    reasoning: `Aggressive raise with medium hand`
                };
            }

            return {
                action: 'check',
                reasoning: `Medium hand (${finalStrength.toFixed(2)}), checking`
            };
        } else {
            return {
                action: 'call',
                reasoning: `Calling with medium hand`
            };
        }
    }

    // Strong hand - raise or call
    if (finalStrength >= 0.7) {
        // Determine raise size based on aggression and hand strength
        const aggressiveMultiplier = 0.5 + settings.aggression * 0.5;
        let raiseAmount: number;

        if (finalStrength > 0.9) {
            // Very strong hand - bet bigger
            raiseAmount = Math.floor(potSize * (0.7 + Math.random() * 0.5) * aggressiveMultiplier);
        } else {
            // Strong hand - moderate bet
            raiseAmount = Math.floor(potSize * (0.4 + Math.random() * 0.3) * aggressiveMultiplier);
        }

        // Ensure we can afford the raise
        if (raiseAmount > aiPlayer.chips) {
            return {
                action: 'all_in',
                reasoning: `Going all-in with strong hand (${finalStrength.toFixed(2)})`
            };
        }

        // Sometimes just call to trap opponents (advanced play)
        if (Math.random() < (1 - settings.aggression) * 0.4 && betToCall > 0) {
            return {
                action: 'call',
                reasoning: `Slow-playing strong hand`
            };
        }

        return {
            action: 'raise',
            amount: Math.max(raiseAmount, currentBet * 2),
            reasoning: `Raising with strong hand (${finalStrength.toFixed(2)})`
        };
    }

    // Default: check or call
    if (betToCall === 0) {
        return { action: 'check', reasoning: 'Default check' };
    } else {
        return { action: 'call', reasoning: 'Default call' };
    }
}

/**
 * Generate AI player names
 */
export function generateAIName(difficulty: AIDifficulty): string {
    const names = {
        novice: [
            'Lucky Larry',
            'Fold Frank',
            'Cautious Carl',
            'Timid Tim',
            'Nervous Ned'
        ],
        intermediate: [
            'Steady Steve',
            'Balanced Bob',
            'Mid Mike',
            'Tactical Tom',
            'Strategic Sam'
        ],
        expert: [
            'Pro Pete',
            'Shark Sally',
            'Ace Anna',
            'Killer Kevin',
            'Master Max'
        ]
    };

    const nameList = names[difficulty];
    return nameList[Math.floor(Math.random() * nameList.length)];
}
