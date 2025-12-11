// =============================================
// POKER GAME TYPES
// =============================================
// TypeScript interfaces for Texas Hold'em poker system

// Card representation
export type CardSuit = '♠' | '♥' | '♦' | '♣' | 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PokerCard {
    suit: CardSuit;
    rank: CardRank;
}

// Hand rankings (0 = worst, 9 = best)
export enum HandRank {
    HIGH_CARD = 0,
    ONE_PAIR = 1,
    TWO_PAIR = 2,
    THREE_OF_A_KIND = 3,
    STRAIGHT = 4,
    FLUSH = 5,
    FULL_HOUSE = 6,
    FOUR_OF_A_KIND = 7,
    STRAIGHT_FLUSH = 8,
    ROYAL_FLUSH = 9
}

export interface EvaluatedHand {
    rank: HandRank;
    rankName: string;
    cards: PokerCard[]; // Best 5-card combination
    highCards: CardRank[]; // For tiebreakers
}

// Game types
export type PokerGameType = 'practice' | 'multiplayer';
export type AIDifficulty = 'novice' | 'intermediate' | 'expert' | 'expert_god';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';
export type BettingRound = 'pre_flop' | 'flop' | 'turn' | 'river' | 'showdown';

// Player actions
export type PokerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export interface PokerAction {
    id: string;
    game_id: string;
    player_id: string;
    action_type: PokerActionType;
    amount: number;
    round: BettingRound;
    created_at: string;
}

// Game state
export interface PokerGame {
    id: string;
    host_user_id: string;
    game_type: PokerGameType;
    ai_difficulty?: AIDifficulty;
    buy_in: number;
    max_players: number;
    current_players: number;

    // State
    status: GameStatus;
    current_round?: BettingRound;
    current_turn_player_id?: string;
    dealer_position: number;
    small_blind: number;
    big_blind: number;

    // Pot & Cards
    pot_amount: number;
    community_cards: PokerCard[];
    deck?: PokerCard[]; // Server-side only

    // Timing
    created_at: string;
    started_at?: string;
    ended_at?: string;

    // Results
    winner_id?: string;
    // For AI winners, track the player row separately from user profiles
    winner_player_id?: string;
    winning_hand?: EvaluatedHand;
    final_pot_amount?: number;
    house_rake_amount?: number;
}

// Player in game
export interface PokerGamePlayer {
    id: string;
    game_id: string;
    user_id?: string;

    // Player Info
    is_ai: boolean;
    ai_name?: string;
    username?: string;
    avatar?: string;
    position: number;

    // Game State
    chips: number;
    current_bet: number;
    is_folded: boolean;
    is_all_in: boolean;

    // Cards (private - only visible to owner)
    hole_cards: PokerCard[];

    // Results
    final_position?: number;
    winnings: number;

    joined_at: string;
}

// Player statistics
export interface PokerStatistics {
    id: string;
    user_id: string;

    // Overall
    total_games_played: number;
    total_games_won: number;
    total_hands_played: number;
    total_coins_wagered: number;
    total_coins_won: number;
    total_coins_lost: number;

    // Daily tracking
    daily_winnings: number;
    daily_winnings_date: string;

    // Records
    biggest_pot_won: number;
    best_hand_rank: HandRank;
    longest_win_streak: number;
    current_win_streak: number;

    // AI Practice
    novice_games_won: number;
    intermediate_games_won: number;
    expert_games_won: number;

    updated_at: string;
}

// Complete game state (for UI)
export interface PokerGameState extends PokerGame {
    players: PokerGamePlayer[];
    recent_actions: PokerAction[];
    time_remaining?: number; // Seconds for current turn
}

// Lobby game listing
export interface PokerLobbyGame {
    id: string;
    host_username: string;
    host_avatar?: string;
    game_type: PokerGameType;
    ai_difficulty?: AIDifficulty;
    buy_in: number;
    current_players: number;
    max_players: number;
    status: GameStatus;
    created_at: string;
}

// Action request (from client to server)
export interface PokerActionRequest {
    game_id: string;
    action_type: PokerActionType;
    amount?: number; // Required for 'raise'
}

// AI player configuration
export interface AIPlayer {
    name: string;
    difficulty: AIDifficulty;
    aggression: number; // 0-1
    bluff_frequency: number; // 0-1
    skill_level: number; // 0-1
}

// AI difficulty settings
export const AI_DIFFICULTY_SETTINGS: Record<AIDifficulty, AIPlayer> = {
    novice: {
        name: 'Novice Bot',
        difficulty: 'novice',
        aggression: 0.2,
        bluff_frequency: 0.05,
        skill_level: 0.3
    },
    intermediate: {
        name: 'Intermediate Bot',
        difficulty: 'intermediate',
        aggression: 0.5,
        bluff_frequency: 0.15,
        skill_level: 0.6
    },
    expert: {
        name: 'Expert Bot',
        difficulty: 'expert',
        aggression: 0.8,
        bluff_frequency: 0.25,
        skill_level: 0.9
    }
};

// Coin modifier configuration
export interface CoinModifiers {
    ai_modifier: number; // Based on difficulty
    daily_modifier: number; // Based on daily winnings
    house_rake: number; // Always 10%
}

export const AI_COIN_MODIFIERS: Record<AIDifficulty, number> = {
    novice: 0.20, // 80% reduction
    intermediate: 0.60, // 40% reduction
    expert: 1.00, // Full rewards
    expert_god: 1.00 // Full rewards (God Mode)
};

// Daily diminishing returns thresholds
export const DAILY_THRESHOLDS = {
    tier1: { max: 200, modifier: 1.00 }, // 100%
    tier2: { max: 500, modifier: 0.50 }, // 50%
    tier3: { max: Infinity, modifier: 0.25 } // 25%
};

// Game constants
export const POKER_CONSTANTS = {
    HOUSE_RAKE_PERCENT: 0.10, // 10%
    DEFAULT_SMALL_BLIND: 5,
    DEFAULT_BIG_BLIND: 10,
    TURN_TIME_LIMIT: 30, // seconds
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 6,
    AVAILABLE_BUY_INS: [50, 100, 250, 500, 1000]
};

// Hand history
export interface PokerHandHistory {
    id: string;
    game_id: string;
    players: PokerGamePlayer[];
    community_cards: PokerCard[];
    pot_amount: number;
    actions: PokerAction[];
    winner_id: string;
    winner_player_id?: string;
    winning_hand: EvaluatedHand;
    created_at: string;
}

// =============================================
// ANIMATION TYPES
// =============================================

export type PokerAnimationType =
    | 'deal_cards'
    | 'reveal_flop'
    | 'reveal_turn'
    | 'reveal_river'
    | 'reveal_hole_cards'
    | 'chip_to_pot'
    | 'pot_to_winner'
    | 'fold_cards'
    | 'action_feedback';

export interface PokerAnimation {
    id: string;
    type: PokerAnimationType;
    data: any;
    duration: number; // milliseconds
    priority: number; // higher = more important
}

export interface DealTarget {
    x: number;
    y: number;
    rotation: number;
    playerIndex: number;
}

export interface Position {
    x: number;
    y: number;
}
