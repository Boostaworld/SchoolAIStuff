// =============================================
// POKER ANIMATION TRIGGERS
// =============================================
// Detects game state changes and triggers appropriate animations

import { PokerGame, PokerAnimation, PokerAnimationType } from './types';
import { ANIMATION_PRIORITY, POKER_ANIMATIONS } from './animationConstants';

/**
 * Detects what animations should be triggered based on game state changes
 * @param prevState - Previous game state (or null if first render)
 * @param currentState - Current game state
 * @returns Array of animations to trigger, sorted by priority (highest first)
 */
export function detectAnimationTriggers(
  prevState: PokerGame | null,
  currentState: PokerGame
): PokerAnimation[] {
  if (!prevState) {
    return []; // No animations on initial load
  }

  const animations: PokerAnimation[] = [];

  // =============================================
  // COMMUNITY CARDS REVEALED
  // =============================================
  if (currentState.community_cards.length > prevState.community_cards.length) {
    const newCardsCount = currentState.community_cards.length - prevState.community_cards.length;
    const newCards = currentState.community_cards.slice(-newCardsCount);

    let animationType: PokerAnimationType;
    let duration: number;

    if (newCardsCount === 3) {
      // Flop (3 cards)
      animationType = 'reveal_flop';
      duration = POKER_ANIMATIONS.CARD_FLIP_DURATION + (2 * POKER_ANIMATIONS.CARD_DEAL_STAGGER);
    } else if (currentState.community_cards.length === 4) {
      // Turn (1 card)
      animationType = 'reveal_turn';
      duration = POKER_ANIMATIONS.CARD_FLIP_DURATION;
    } else {
      // River (1 card)
      animationType = 'reveal_river';
      duration = POKER_ANIMATIONS.CARD_FLIP_DURATION;
    }

    animations.push({
      id: `reveal-community-${Date.now()}`,
      type: animationType,
      data: { cards: newCards, startIndex: prevState.community_cards.length },
      duration,
      priority: ANIMATION_PRIORITY.REVEAL
    });
  }

  // =============================================
  // POT INCREASED (Chips moved to pot)
  // =============================================
  if (currentState.pot_amount > prevState.pot_amount) {
    const chipAmount = currentState.pot_amount - prevState.pot_amount;

    animations.push({
      id: `chip-to-pot-${Date.now()}`,
      type: 'chip_to_pot',
      data: { amount: chipAmount },
      duration: POKER_ANIMATIONS.CHIP_MOVE_DURATION,
      priority: ANIMATION_PRIORITY.BET
    });
  }

  // =============================================
  // WINNER DECLARED (Pot to winner)
  // =============================================
  if (currentState.winner_id && !prevState.winner_id) {
    animations.push({
      id: `pot-to-winner-${Date.now()}`,
      type: 'pot_to_winner',
      data: {
        winnerId: currentState.winner_id,
        winningHand: currentState.winning_hand,
        potAmount: currentState.final_pot_amount || currentState.pot_amount
      },
      duration: POKER_ANIMATIONS.WINNER_CELEBRATION_DURATION,
      priority: ANIMATION_PRIORITY.WIN
    });
  }

  // =============================================
  // SHOWDOWN (Reveal hole cards at end of round)
  // =============================================
  if (
    currentState.current_round === 'showdown' &&
    prevState.current_round !== 'showdown' &&
    currentState.community_cards.length === 5
  ) {
    animations.push({
      id: `reveal-hole-cards-${Date.now()}`,
      type: 'reveal_hole_cards',
      data: {
        showdown: true,
        roundNumber: currentState.round_number || 1
      },
      duration: POKER_ANIMATIONS.CARD_FLIP_DURATION * 2,
      priority: ANIMATION_PRIORITY.REVEAL
    });
  }

  // =============================================
  // GAME STARTED (Deal cards)
  // =============================================
  // Detect game transitioning from waiting to in_progress (initial deal)
  if (
    currentState.status === 'in_progress' &&
    prevState.status === 'waiting'
  ) {
    animations.push({
      id: `deal-cards-${Date.now()}`,
      type: 'deal_cards',
      data: { round: 'initial' },
      duration: POKER_ANIMATIONS.CARD_DEAL_DURATION * 2 + POKER_ANIMATIONS.CARD_DEAL_STAGGER * 6, // 2 cards per player, 6 max players
      priority: ANIMATION_PRIORITY.DEAL
    });
  }

  // Sort by priority (highest first) and return
  return animations.sort((a, b) => b.priority - a.priority);
}

/**
 * Checks if an animation should be skipped (e.g., if game state changed too quickly)
 * @param animation - The animation to check
 * @param currentGameState - Current game state
 * @returns true if animation should be skipped
 */
export function shouldSkipAnimation(
  animation: PokerAnimation,
  currentGameState: PokerGame
): boolean {
  // Skip old winner animations if game is no longer completed
  if (animation.type === 'pot_to_winner' && currentGameState.status !== 'completed') {
    return true;
  }

  // Skip community card reveals if round has already advanced past
  if (
    (animation.type === 'reveal_flop' && currentGameState.current_round !== 'flop') ||
    (animation.type === 'reveal_turn' && currentGameState.current_round !== 'turn') ||
    (animation.type === 'reveal_river' && currentGameState.current_round !== 'river')
  ) {
    return true;
  }

  return false;
}

/**
 * Creates an action feedback animation for player actions (fold, check, call, raise)
 * @param playerId - ID of player who performed action
 * @param actionType - Type of action (fold, check, call, raise, all_in)
 * @param amount - Amount bet (for raise/call)
 * @returns Animation object
 */
export function createActionFeedbackAnimation(
  playerId: string,
  actionType: string,
  amount?: number
): PokerAnimation {
  return {
    id: `action-feedback-${playerId}-${Date.now()}`,
    type: 'action_feedback',
    data: {
      playerId,
      actionType,
      amount
    },
    duration: POKER_ANIMATIONS.ACTION_FEEDBACK_DURATION,
    priority: ANIMATION_PRIORITY.ACTION_FEEDBACK
  };
}

/**
 * Creates a fold animation for a player's cards
 * @param playerId - ID of player who folded
 * @returns Animation object
 */
export function createFoldAnimation(playerId: string): PokerAnimation {
  return {
    id: `fold-cards-${playerId}-${Date.now()}`,
    type: 'fold_cards',
    data: { playerId },
    duration: POKER_ANIMATIONS.FOLD_ANIMATION_DURATION,
    priority: ANIMATION_PRIORITY.FOLD
  };
}
