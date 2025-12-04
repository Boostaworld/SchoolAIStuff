// =============================================
// POKER ENGINE - Game Logic & Hand Evaluation
// =============================================

import {
    PokerCard,
    CardRank,
    CardSuit,
    HandRank,
    EvaluatedHand,
    BettingRound
} from './types';

// =============================================
// DECK MANAGEMENT
// =============================================

const SUITS: CardSuit[] = ['♠', '♥', '♦', '♣'];
const RANKS: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Create a new shuffled deck of 52 cards
 */
export function createDeck(): PokerCard[] {
    const deck: PokerCard[] = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }

    return shuffleDeck(deck);
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Deal cards from deck
 */
export function dealCards(deck: PokerCard[], count: number): { cards: PokerCard[]; remainingDeck: PokerCard[] } {
    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);

    return { cards, remainingDeck };
}

// =============================================
// HAND EVALUATION
// =============================================

/**
 * Get numeric value of a rank for comparison
 */
function getRankValue(rank: CardRank): number {
    const values: Record<CardRank, number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank];
}

/**
 * Sort cards by rank (descending)
 */
function sortByRank(cards: PokerCard[]): PokerCard[] {
    return [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
}

/**
 * Check if cards form a flush (all same suit)
 */
function isFlush(cards: PokerCard[]): boolean {
    return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Check if cards form a straight
 */
function isStraight(cards: PokerCard[]): boolean {
    const sorted = sortByRank(cards);
    const values = sorted.map(c => getRankValue(c.rank));

    // Check for regular straight
    const isRegularStraight = values.every((val, i) =>
        i === 0 || val === values[i - 1] - 1
    );

    // Check for A-2-3-4-5 straight (wheel)
    const isWheel =
        values[0] === 14 && // Ace
        values[1] === 5 &&
        values[2] === 4 &&
        values[3] === 3 &&
        values[4] === 2;

    return isRegularStraight || isWheel;
}

/**
 * Get rank counts for evaluating pairs, trips, etc.
 */
function getRankCounts(cards: PokerCard[]): Map<CardRank, number> {
    const counts = new Map<CardRank, number>();

    for (const card of cards) {
        counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
    }

    return counts;
}

/**
 * Evaluate the best 5-card poker hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(cards: PokerCard[]): EvaluatedHand {
    if (cards.length < 5) {
        throw new Error('Need at least 5 cards to evaluate hand');
    }

    // Generate all possible 5-card combinations
    const combinations = getAllCombinations(cards, 5);

    // Evaluate each combination and find the best
    let bestHand: EvaluatedHand | null = null;

    for (const combo of combinations) {
        const evaluation = evaluateFiveCardHand(combo);

        if (!bestHand || compareHands(evaluation, bestHand) > 0) {
            bestHand = evaluation;
        }
    }

    return bestHand!;
}

/**
 * Evaluate a specific 5-card hand
 */
function evaluateFiveCardHand(cards: PokerCard[]): EvaluatedHand {
    const sorted = sortByRank(cards);
    const ranks = sorted.map(c => c.rank);
    const counts = getRankCounts(cards);
    const countValues = Array.from(counts.values()).sort((a, b) => b - a);

    const isFlushHand = isFlush(cards);
    const isStraightHand = isStraight(cards);

    // Royal Flush: A-K-Q-J-10 of same suit
    if (isFlushHand && isStraightHand && getRankValue(sorted[0].rank) === 14 && getRankValue(sorted[4].rank) === 10) {
        return {
            rank: HandRank.ROYAL_FLUSH,
            rankName: 'Royal Flush',
            cards: sorted,
            highCards: ranks
        };
    }

    // Straight Flush
    if (isFlushHand && isStraightHand) {
        return {
            rank: HandRank.STRAIGHT_FLUSH,
            rankName: 'Straight Flush',
            cards: sorted,
            highCards: ranks
        };
    }

    // Four of a Kind
    if (countValues[0] === 4) {
        const quadRank = Array.from(counts.entries()).find(([_, count]) => count === 4)![0];
        return {
            rank: HandRank.FOUR_OF_A_KIND,
            rankName: 'Four of a Kind',
            cards: sorted,
            highCards: [quadRank, ...ranks.filter(r => r !== quadRank)]
        };
    }

    // Full House: Three of a kind + pair
    if (countValues[0] === 3 && countValues[1] === 2) {
        const tripRank = Array.from(counts.entries()).find(([_, count]) => count === 3)![0];
        const pairRank = Array.from(counts.entries()).find(([_, count]) => count === 2)![0];
        return {
            rank: HandRank.FULL_HOUSE,
            rankName: 'Full House',
            cards: sorted,
            highCards: [tripRank, pairRank]
        };
    }

    // Flush
    if (isFlushHand) {
        return {
            rank: HandRank.FLUSH,
            rankName: 'Flush',
            cards: sorted,
            highCards: ranks
        };
    }

    // Straight
    if (isStraightHand) {
        return {
            rank: HandRank.STRAIGHT,
            rankName: 'Straight',
            cards: sorted,
            highCards: ranks
        };
    }

    // Three of a Kind
    if (countValues[0] === 3) {
        const tripRank = Array.from(counts.entries()).find(([_, count]) => count === 3)![0];
        return {
            rank: HandRank.THREE_OF_A_KIND,
            rankName: 'Three of a Kind',
            cards: sorted,
            highCards: [tripRank, ...ranks.filter(r => r !== tripRank)]
        };
    }

    // Two Pair
    if (countValues[0] === 2 && countValues[1] === 2) {
        const pairs = Array.from(counts.entries())
            .filter(([_, count]) => count === 2)
            .map(([rank]) => rank)
            .sort((a, b) => getRankValue(b) - getRankValue(a));

        return {
            rank: HandRank.TWO_PAIR,
            rankName: 'Two Pair',
            cards: sorted,
            highCards: [...pairs, ...ranks.filter(r => !pairs.includes(r))]
        };
    }

    // One Pair
    if (countValues[0] === 2) {
        const pairRank = Array.from(counts.entries()).find(([_, count]) => count === 2)![0];
        return {
            rank: HandRank.ONE_PAIR,
            rankName: 'One Pair',
            cards: sorted,
            highCards: [pairRank, ...ranks.filter(r => r !== pairRank)]
        };
    }

    // High Card
    return {
        rank: HandRank.HIGH_CARD,
        rankName: 'High Card',
        cards: sorted,
        highCards: ranks
    };
}

/**
 * Compare two hands (returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie)
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
    // First compare hand ranks
    if (hand1.rank > hand2.rank) return 1;
    if (hand1.rank < hand2.rank) return -1;

    // Same rank, compare high cards
    for (let i = 0; i < hand1.highCards.length; i++) {
        const val1 = getRankValue(hand1.highCards[i]);
        const val2 = getRankValue(hand2.highCards[i]);

        if (val1 > val2) return 1;
        if (val1 < val2) return -1;
    }

    // Exact tie
    return 0;
}

/**
 * Generate all combinations of k items from array
 */
function getAllCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 1) return arr.map(item => [item]);
    if (k === arr.length) return [arr];

    const result: T[][] = [];

    for (let i = 0; i <= arr.length - k; i++) {
        const head = arr[i];
        const tailCombos = getAllCombinations(arr.slice(i + 1), k - 1);

        for (const combo of tailCombos) {
            result.push([head, ...combo]);
        }
    }

    return result;
}

// =============================================
// GAME FLOW HELPERS
// =============================================

/**
 * Determine next betting round
 */
export function getNextRound(currentRound: BettingRound): BettingRound | null {
    const rounds: BettingRound[] = ['pre_flop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = rounds.indexOf(currentRound);

    if (currentIndex === -1 || currentIndex === rounds.length - 1) {
        return null;
    }

    return rounds[currentIndex + 1];
}

/**
 * Calculate pot amount with house rake
 */
export function calculatePayout(potAmount: number): { payout: number; rake: number } {
    const rake = Math.floor(potAmount * 0.10); // 10% house rake
    const payout = potAmount - rake;

    return { payout, rake };
}

/**
 * Determine next player in turn order
 */
export function getNextPlayerPosition(currentPosition: number, totalPlayers: number, skip: number[] = []): number {
    let nextPosition = (currentPosition + 1) % totalPlayers;

    // Skip folded/all-in players
    while (skip.includes(nextPosition)) {
        nextPosition = (nextPosition + 1) % totalPlayers;
    }

    return nextPosition;
}

/**
 * Calculate minimum raise amount
 */
export function getMinRaise(currentBet: number, bigBlind: number): number {
    return Math.max(currentBet * 2, bigBlind);
}
